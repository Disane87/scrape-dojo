import { Injectable, Logger, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity, UserRole, AuthProvider } from '../entities/user.entity';
import { RegisterDto, UpdateUserDto } from '../dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) {}

    /**
     * Find user by ID
     */
    async findById(id: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { email: email.toLowerCase() } });
    }

    /**
     * Find user by external OIDC ID
     */
    async findByExternalId(externalId: string, oidcIssuer: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { externalId, oidcIssuer } });
    }

    /**
     * Create a new local user
     */
    async createLocalUser(dto: RegisterDto): Promise<UserEntity> {
        const existingUser = await this.findByEmail(dto.email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

        const user = this.userRepository.create({
            id: uuidv4(),
            email: dto.email.toLowerCase(),
            username: dto.username,
            displayName: dto.displayName,
            passwordHash,
            provider: AuthProvider.LOCAL,
            role: UserRole.USER,
            isActive: true,
        });

        await this.userRepository.save(user);
        this.logger.log(`Created local user: ${user.email}`);
        return user;
    }

    /**
     * Create or update OIDC user from token claims
     */
    async upsertOidcUser(claims: {
        sub: string;
        email: string;
        name?: string;
        preferred_username?: string;
        picture?: string;
        iss: string;
    }): Promise<UserEntity> {
        let user = await this.findByExternalId(claims.sub, claims.iss);

        if (user) {
            // Update existing OIDC user
            user.displayName = claims.name || user.displayName;
            user.username = claims.preferred_username || user.username;
            user.avatarUrl = claims.picture || user.avatarUrl;
            user.lastLoginAt = Date.now();

            // Legacy DB rows may have NULL timestamps; avoid propagating NaN into SQL updates.
            if (!Number.isFinite(user.createdAt)) user.createdAt = Date.now();
            if (!Number.isFinite(user.updatedAt)) user.updatedAt = Date.now();

            await this.userRepository.save(user);
            this.logger.log(`Updated OIDC user: ${user.email}`);
        } else {
            // Check if local user with same email exists
            const existingLocal = await this.findByEmail(claims.email);
            if (existingLocal) {
                // Link OIDC to existing local account
                existingLocal.externalId = claims.sub;
                existingLocal.oidcIssuer = claims.iss;
                existingLocal.provider = AuthProvider.OIDC;
                existingLocal.displayName = claims.name || existingLocal.displayName;
                existingLocal.avatarUrl = claims.picture || existingLocal.avatarUrl;
                existingLocal.lastLoginAt = Date.now();

                if (!Number.isFinite(existingLocal.createdAt)) existingLocal.createdAt = Date.now();
                if (!Number.isFinite(existingLocal.updatedAt)) existingLocal.updatedAt = Date.now();

                await this.userRepository.save(existingLocal);
                this.logger.log(`Linked OIDC to existing user: ${existingLocal.email}`);
                return existingLocal;
            }

            // Create new OIDC user
            user = this.userRepository.create({
                id: uuidv4(),
                email: claims.email.toLowerCase(),
                displayName: claims.name,
                username: claims.preferred_username,
                avatarUrl: claims.picture,
                externalId: claims.sub,
                oidcIssuer: claims.iss,
                provider: AuthProvider.OIDC,
                role: UserRole.USER,
                isActive: true,
                lastLoginAt: Date.now(),
            });

            await this.userRepository.save(user);
            this.logger.log(`Created OIDC user: ${user.email}`);
        }

        return user;
    }

    /**
     * Validate local user credentials
     */
    async validateLocalUser(email: string, password: string): Promise<UserEntity> {
        const user = await this.findByEmail(email);
        
        if (!user || !user.passwordHash) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (user.provider !== AuthProvider.LOCAL) {
            throw new UnauthorizedException('Please use OIDC login for this account');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account is deactivated');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Update last login
        user.lastLoginAt = Date.now();
        await this.userRepository.save(user);

        return user;
    }

    /**
     * Update user profile
     */
    async updateUser(id: string, dto: UpdateUserDto): Promise<UserEntity> {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (dto.username !== undefined) user.username = dto.username;
        if (dto.displayName !== undefined) user.displayName = dto.displayName;
        if (dto.role !== undefined) user.role = dto.role;

        await this.userRepository.save(user);
        return user;
    }

    /**
     * Change user password (local auth only)
     */
    async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.provider !== AuthProvider.LOCAL) {
            throw new UnauthorizedException('Password change not available for OIDC accounts');
        }

        const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash!);
        if (!isCurrentValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await this.userRepository.save(user);
        this.logger.log(`Password changed for user: ${user.email}`);
    }

    /**
     * Store hashed refresh token
     */
    async setRefreshTokenHash(userId: string, tokenHash: string | null): Promise<void> {
        // NOTE: Using repository.update(id, ...) can lead to SQL like "WHERE id = NaN" on SQLite/sql.js
        // if TypeORM attempts to coerce the primary key value. Using an explicit parameterized WHERE is safer.
        await this.userRepository
            .createQueryBuilder()
            .update(UserEntity)
            .set({ refreshTokenHash: tokenHash })
            .where('id = :id', { id: userId })
            .execute();
    }

    /**
     * Store encrypted MFA secret
     */
    async setMfaSecret(userId: string, encryptedSecret: string | null): Promise<void> {
        await this.userRepository
            .createQueryBuilder()
            .update(UserEntity)
            .set({ mfaSecret: encryptedSecret, mfaEnabled: false })
            .where('id = :id', { id: userId })
            .execute();
    }

    /**
     * Enable/disable MFA
     */
    async setMfaEnabled(userId: string, enabled: boolean): Promise<void> {
        await this.userRepository
            .createQueryBuilder()
            .update(UserEntity)
            .set({ mfaEnabled: enabled })
            .where('id = :id', { id: userId })
            .execute();
    }

    /**
     * Get all users (admin)
     */
    async findAll(): Promise<UserEntity[]> {
        return this.userRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Deactivate user
     */
    async deactivateUser(id: string): Promise<void> {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        user.isActive = false;
        user.refreshTokenHash = null;
        await this.userRepository.save(user);
        this.logger.log(`Deactivated user: ${user.email}`);
    }

    /**
     * Get user count
     */
    async getUserCount(): Promise<number> {
        return this.userRepository.count();
    }

    /**
     * Check if initial admin setup is needed
     */
    async needsInitialSetup(): Promise<boolean> {
        const adminCount = await this.userRepository.count({ where: { role: UserRole.ADMIN } });
        return adminCount === 0;
    }

    /**
     * Create initial admin user
     */
    async createInitialAdmin(dto: RegisterDto): Promise<UserEntity> {
        const needsSetup = await this.needsInitialSetup();
        if (!needsSetup) {
            throw new ConflictException('Initial admin already exists');
        }

        const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

        const admin = this.userRepository.create({
            id: uuidv4(),
            email: dto.email.toLowerCase(),
            username: dto.username || 'admin',
            displayName: dto.displayName || 'Administrator',
            passwordHash,
            provider: AuthProvider.LOCAL,
            role: UserRole.ADMIN,
            isActive: true,
        });

        await this.userRepository.save(admin);
        this.logger.log(`Created initial admin: ${admin.email}`);
        return admin;
    }
}
