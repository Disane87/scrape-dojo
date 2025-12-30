import { Injectable, Logger, UnauthorizedException, RequestTimeoutException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import type { StringValue } from 'ms';
import { UserEntity } from '../entities/user.entity';
import { UserService } from './user.service';
import { LoginDto, RegisterDto, TokenResponseDto } from '../dto';
import { MfaService, type MfaChallengeResponse } from './mfa.service';
import { DeviceService } from './device.service';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    provider: string;
    mfa?: boolean;
    iat?: number;
    exp?: number;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly accessTokenExpiry: string;
    private readonly refreshTokenExpiry: string;

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly mfaService: MfaService,
        private readonly deviceService: DeviceService,
    ) {
        this.accessTokenExpiry = this.configService.get<string>('SCRAPE_DOJO_AUTH_ACCESS_TOKEN_EXPIRY', '15m');
        this.refreshTokenExpiry = this.configService.get<string>('SCRAPE_DOJO_AUTH_REFRESH_TOKEN_EXPIRY', '7d');
    }

    isMfaRequired(): boolean {
        return this.mfaService.isMfaRequired();
    }

    /**
     * Login with local credentials
     */
    async login(dto: LoginDto, userAgent?: string, ipAddress?: string): Promise<TokenResponseDto | MfaChallengeResponse> {
        const user = await this.userService.validateLocalUser(dto.email, dto.password);

        if (!this.isMfaRequired()) {
            return this.generateTokenResponse(user, { mfaVerified: true });
        }

        if (!user.mfaEnabled) {
            return this.createMfaChallenge(user, { setupRequired: true });
        }

        // Check if device is trusted
        // Prefer deviceFingerprint from client, fallback to server-generated fingerprint
        const deviceFingerprint = dto.deviceFingerprint || (userAgent && ipAddress ? this.deviceService.generateFingerprint(userAgent, ipAddress) : null);
        const isDeviceTrusted = deviceFingerprint ? await this.deviceService.isDeviceTrusted(user.id, deviceFingerprint) : false;

        // If device is trusted, skip MFA
        if (isDeviceTrusted && deviceFingerprint && userAgent && ipAddress) {
            this.logger.log(`Device is trusted for user ${user.id}, skipping MFA`);
            await this.deviceService.updateDeviceLastUsed(user.id, deviceFingerprint, ipAddress);
            return this.generateTokenResponse(user, { mfaVerified: true });
        }

        if (!dto.mfaCode) {
            return this.createMfaChallenge(user, { setupRequired: false });
        }

        // If user is MFA-enabled and provided a code, verify it and mint tokens.
        if (!user.mfaSecret) {
            return this.createMfaChallenge(user, { setupRequired: true });
        }

        const secret = this.mfaService.decryptSecret(user.mfaSecret);
        const ok = this.mfaService.verifyTotp(dto.mfaCode, secret);
        if (!ok) {
            throw new UnauthorizedException('Invalid MFA code');
        }

        // After successful MFA, trust the device
        // Use the deviceFingerprint from client if available
        const finalFingerprint = dto.deviceFingerprint || (userAgent && ipAddress ? this.deviceService.generateFingerprint(userAgent, ipAddress) : null);
        if (finalFingerprint && userAgent && ipAddress) {
            const deviceName = this.deviceService.parseDeviceName(userAgent);
            await this.deviceService.trustDevice(user.id, finalFingerprint, deviceName, ipAddress);
            this.logger.log(`Trusted new device for user ${user.id}`);
        }

        return this.generateTokenResponse(user, { mfaVerified: true });
    }

    /**
     * Register new local user
     */
    async register(dto: RegisterDto): Promise<TokenResponseDto | MfaChallengeResponse> {
        const user = await this.userService.createLocalUser(dto);

        if (!this.isMfaRequired()) {
            return this.generateTokenResponse(user, { mfaVerified: true });
        }

        return this.createMfaChallenge(user, { setupRequired: true });
    }

    /**
     * Handle OIDC user login/creation
     */
    async handleOidcUser(claims: {
        sub: string;
        email: string;
        name?: string;
        preferred_username?: string;
        picture?: string;
        iss: string;
    }): Promise<TokenResponseDto | MfaChallengeResponse> {
        const user = await this.userService.upsertOidcUser(claims);

        if (!this.isMfaRequired()) {
            return this.generateTokenResponse(user, { mfaVerified: true });
        }

        // OIDC always continues via /auth/mfa/complete using the challenge token.
        return this.createMfaChallenge(user, { setupRequired: !user.mfaEnabled });
    }

    /**
     * Refresh access token
     */
    async refreshTokens(refreshToken: string): Promise<TokenResponseDto> {
        try {
            const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
                secret: this.configService.get<string>('SCRAPE_DOJO_AUTH_REFRESH_TOKEN_SECRET', 'refresh-secret-change-me'),
            });

            const user = await this.userService.findById(payload.sub);
            if (!user || !user.isActive) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            if (this.isMfaRequired() && !user.mfaEnabled) {
                throw new UnauthorizedException('MFA setup required');
            }

            // Verify refresh token hash matches
            if (user.refreshTokenHash) {
                const tokenHash = await this.hashToken(refreshToken);
                // Note: We're comparing the start of the hash for rotation support
                if (!user.refreshTokenHash.startsWith(tokenHash.substring(0, 20))) {
                    throw new UnauthorizedException('Refresh token has been revoked');
                }
            }

            return this.generateTokenResponse(user, { mfaVerified: true });
        } catch (error) {
            this.logger.warn(`Refresh token validation failed: ${error.message}`);
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    /**
     * Logout - invalidate refresh token
     */
    async logout(userId: string): Promise<void> {
        await this.userService.setRefreshTokenHash(userId, null);
        this.logger.log(`User logged out: ${userId}`);
    }

    /**
     * Validate JWT payload and return user
     */
    async validateJwtPayload(payload: JwtPayload): Promise<UserEntity | null> {
        const user = await this.userService.findById(payload.sub);
        if (!user || !user.isActive) {
            return null;
        }
        return user;
    }

    /**
     * Generate access and refresh tokens
     */
    private async generateTokenResponse(
        user: UserEntity,
        opts: { mfaVerified: boolean },
    ): Promise<TokenResponseDto> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            provider: user.provider,
            mfa: opts.mfaVerified,
        };

        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('SCRAPE_DOJO_AUTH_JWT_SECRET', 'jwt-secret-change-me'),
            expiresIn: this.accessTokenExpiry as StringValue,
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('SCRAPE_DOJO_AUTH_REFRESH_TOKEN_SECRET', 'refresh-secret-change-me'),
            expiresIn: this.refreshTokenExpiry as StringValue,
        });

        // Store hashed refresh token for validation
        const tokenHash = await this.hashToken(refreshToken);
        await this.userService.setRefreshTokenHash(user.id, tokenHash);

        // Calculate expiry in seconds
        const expiresIn = this.parseExpiryToSeconds(this.accessTokenExpiry);

        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn,
        };
    }

    createMfaChallenge(user: UserEntity, opts: { setupRequired: boolean }): MfaChallengeResponse {
        const token = this.mfaService.createChallengeToken(user.id);
        return {
            mfaRequired: !opts.setupRequired,
            mfaSetupRequired: opts.setupRequired,
            mfaChallengeToken: token,
        };
    }

    async setupMfaFromChallenge(challengeToken: string): Promise<{ otpauthUrl: string; qrCodeDataUrl: string; secret: string } & { userId: string }> {
        const startedAt = Date.now();
        const payload = this.mfaService.verifyChallengeToken(challengeToken);
        const user = await this.userService.findById(payload.sub);
        if (!user || !user.isActive) {
            throw new UnauthorizedException('Invalid MFA challenge token');
        }

        const issuer = this.configService.get<string>('SCRAPE_DOJO_AUTH_MFA_ISSUER', 'Scrape Dojo');
        const secret = this.mfaService.generateSecret();
        const otpauthUrl = this.mfaService.buildOtpAuthUrl(user.email, issuer, secret);
        this.logger.debug(`[MFA] setup start user=${user.id}`);

        const qrCodeDataUrl = await this.withTimeout(
            this.mfaService.buildQrCodeDataUrl(otpauthUrl),
            10_000,
            'buildQrCodeDataUrl'
        );

        await this.withTimeout(
            this.userService.setMfaSecret(user.id, this.mfaService.encryptSecret(secret)),
            10_000,
            'setMfaSecret'
        );

        this.logger.debug(`[MFA] setup done user=${user.id} in ${Date.now() - startedAt}ms`);

        return { otpauthUrl, qrCodeDataUrl, secret, userId: user.id };
    }

    private async withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
        let timeoutHandle: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_resolve, reject) => {
            timeoutHandle = setTimeout(() => reject(new RequestTimeoutException(`MFA setup timed out (${label})`)), ms);
        });

        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timeoutHandle) clearTimeout(timeoutHandle);
        }
    }

    async completeMfaFromChallenge(challengeToken: string, code: string, deviceFingerprint?: string, userAgent?: string, ipAddress?: string): Promise<TokenResponseDto> {
        const payload = this.mfaService.verifyChallengeToken(challengeToken);
        const user = await this.userService.findById(payload.sub);
        if (!user || !user.isActive) {
            throw new UnauthorizedException('Invalid MFA challenge token');
        }

        if (!user.mfaSecret) {
            throw new UnauthorizedException('MFA setup required');
        }

        const secret = this.mfaService.decryptSecret(user.mfaSecret);
        const ok = this.mfaService.verifyTotp(code, secret);
        if (!ok) {
            throw new UnauthorizedException('Invalid MFA code');
        }

        if (!user.mfaEnabled) {
            await this.userService.setMfaEnabled(user.id, true);
        }

        // Trust the device after successful MFA
        const finalFingerprint = deviceFingerprint || (userAgent && ipAddress ? this.deviceService.generateFingerprint(userAgent, ipAddress) : null);
        if (finalFingerprint && userAgent && ipAddress) {
            const deviceName = this.deviceService.parseDeviceName(userAgent);
            await this.deviceService.trustDevice(user.id, finalFingerprint, deviceName, ipAddress);
            this.logger.log(`Trusted new device for user ${user.id} after MFA completion`);
        }

        return this.generateTokenResponse(user, { mfaVerified: true });
    }

    /**
     * Hash token for storage
     */
    private async hashToken(token: string): Promise<string> {
        return bcrypt.hash(token, 10);
    }

    /**
     * Parse expiry string to seconds
     */
    private parseExpiryToSeconds(expiry: string): number {
        const match = expiry.match(/^(\d+)([smhd])$/);
        if (!match) return 900; // Default 15 minutes

        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 3600;
            case 'd': return value * 86400;
            default: return 900;
        }
    }

    /**
     * Check if initial setup is needed
     */
    async needsInitialSetup(): Promise<boolean> {
        return this.userService.needsInitialSetup();
    }

    /**
     * Create initial admin
     */
    async createInitialAdmin(dto: RegisterDto): Promise<TokenResponseDto | MfaChallengeResponse> {
        const admin = await this.userService.createInitialAdmin(dto);

        if (!this.isMfaRequired()) {
            return this.generateTokenResponse(admin, { mfaVerified: true });
        }

        return this.createMfaChallenge(admin, { setupRequired: true });
    }
}
