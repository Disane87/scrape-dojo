import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { UserEntity, UserRole, AuthProvider } from '../entities/user.entity';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('UserService', () => {
    let service: UserService;
    let repository: Repository<UserEntity>;

    const mockUser: Partial<UserEntity> = {
        id: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: '$2b$12$test-hash',
        provider: AuthProvider.LOCAL,
        role: UserRole.USER,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    const mockRepository = {
        findOne: vi.fn(),
        find: vi.fn(),
        create: vi.fn(),
        save: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: getRepositoryToken(UserEntity),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        repository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('findById', () => {
        it('should return a user by id', async () => {
            mockRepository.findOne.mockResolvedValue(mockUser);
            
            const result = await service.findById('test-user-id');
            
            expect(result).toEqual(mockUser);
            expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 'test-user-id' } });
        });

        it('should return null if user not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);
            
            const result = await service.findById('non-existent');
            
            expect(result).toBeNull();
        });
    });

    describe('findByEmail', () => {
        it('should return a user by email (case insensitive)', async () => {
            mockRepository.findOne.mockResolvedValue(mockUser);
            
            const result = await service.findByEmail('TEST@example.com');
            
            expect(result).toEqual(mockUser);
            expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
        });
    });

    describe('createLocalUser', () => {
        it('should create a new local user', async () => {
            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockReturnValue(mockUser);
            mockRepository.save.mockResolvedValue(mockUser);

            const result = await service.createLocalUser({
                email: 'new@example.com',
                password: 'password123',
                username: 'newuser',
                displayName: 'New User',
            });

            expect(result).toEqual(mockUser);
            expect(mockRepository.create).toHaveBeenCalled();
            expect(mockRepository.save).toHaveBeenCalled();
        });

        it('should throw ConflictException if user exists', async () => {
            mockRepository.findOne.mockResolvedValue(mockUser);

            await expect(service.createLocalUser({
                email: 'test@example.com',
                password: 'password123',
            })).rejects.toThrow(ConflictException);
        });
    });

    describe('validateLocalUser', () => {
        it('should return user with valid credentials', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            const userWithHash = { ...mockUser, passwordHash: hashedPassword };
            mockRepository.findOne.mockResolvedValue(userWithHash);
            mockRepository.save.mockResolvedValue(userWithHash);

            const result = await service.validateLocalUser('test@example.com', 'password123');

            expect(result.email).toEqual(mockUser.email);
        });

        it('should throw UnauthorizedException for invalid password', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            mockRepository.findOne.mockResolvedValue({ ...mockUser, passwordHash: hashedPassword });

            await expect(service.validateLocalUser('test@example.com', 'wrongpassword'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for non-existent user', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(service.validateLocalUser('notfound@example.com', 'password123'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for OIDC user', async () => {
            mockRepository.findOne.mockResolvedValue({ ...mockUser, provider: AuthProvider.OIDC });

            await expect(service.validateLocalUser('test@example.com', 'password123'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for inactive user', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            mockRepository.findOne.mockResolvedValue({ 
                ...mockUser, 
                passwordHash: hashedPassword, 
                isActive: false 
            });

            await expect(service.validateLocalUser('test@example.com', 'password123'))
                .rejects.toThrow(UnauthorizedException);
        });
    });

    describe('needsInitialSetup', () => {
        it('should return true when no admin exists', async () => {
            mockRepository.count.mockResolvedValue(0);

            const result = await service.needsInitialSetup();

            expect(result).toBe(true);
            expect(mockRepository.count).toHaveBeenCalledWith({ where: { role: UserRole.ADMIN } });
        });

        it('should return false when admin exists', async () => {
            mockRepository.count.mockResolvedValue(1);

            const result = await service.needsInitialSetup();

            expect(result).toBe(false);
        });
    });

    describe('createInitialAdmin', () => {
        it('should create admin when no admin exists', async () => {
            mockRepository.count.mockResolvedValue(0);
            mockRepository.create.mockReturnValue({ ...mockUser, role: UserRole.ADMIN });
            mockRepository.save.mockResolvedValue({ ...mockUser, role: UserRole.ADMIN });

            const result = await service.createInitialAdmin({
                email: 'admin@example.com',
                password: 'adminpassword',
            });

            expect(result.role).toEqual(UserRole.ADMIN);
        });

        it('should throw ConflictException when admin already exists', async () => {
            mockRepository.count.mockResolvedValue(1);

            await expect(service.createInitialAdmin({
                email: 'admin@example.com',
                password: 'adminpassword',
            })).rejects.toThrow(ConflictException);
        });
    });
});
