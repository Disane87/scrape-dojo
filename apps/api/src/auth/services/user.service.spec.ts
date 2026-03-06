import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserEntity, UserRole, AuthProvider } from '../entities/user.entity';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('UserService', () => {
  let service: UserService;

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

  const mockQueryBuilder = {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({}),
  };

  const mockRepository = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('test-user-id');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
      });
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
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('findByExternalId', () => {
    it('should return a user by externalId and oidcIssuer', async () => {
      const oidcUser = {
        ...mockUser,
        externalId: 'ext-123',
        oidcIssuer: 'https://auth.example.com',
      };
      mockRepository.findOne.mockResolvedValue(oidcUser);

      const result = await service.findByExternalId(
        'ext-123',
        'https://auth.example.com',
      );

      expect(result).toEqual(oidcUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          externalId: 'ext-123',
          oidcIssuer: 'https://auth.example.com',
        },
      });
    });

    it('should return null if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByExternalId(
        'no-exist',
        'https://auth.example.com',
      );
      expect(result).toBeNull();
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

      await expect(
        service.createLocalUser({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('upsertOidcUser', () => {
    const oidcClaims = {
      sub: 'oidc-sub-123',
      email: 'oidc@example.com',
      name: 'OIDC User',
      preferred_username: 'oidcuser',
      picture: 'https://example.com/avatar.png',
      iss: 'https://auth.example.com',
    };

    it('should update existing OIDC user', async () => {
      const existingOidc = {
        ...mockUser,
        id: 'existing-oidc-id',
        email: 'oidc@example.com',
        externalId: 'oidc-sub-123',
        oidcIssuer: 'https://auth.example.com',
        provider: AuthProvider.OIDC,
        mfaEnabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // findByExternalId returns existing user
      mockRepository.findOne.mockResolvedValueOnce(existingOidc);
      mockRepository.save.mockResolvedValue(existingOidc);

      const result = await service.upsertOidcUser(oidcClaims);

      expect(result.id).toBe('existing-oidc-id');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should link OIDC to existing local user with same email', async () => {
      const existingLocal = {
        ...mockUser,
        id: 'local-user-id',
        email: 'oidc@example.com',
        provider: AuthProvider.LOCAL,
        mfaEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // findByExternalId returns null (no existing OIDC user)
      mockRepository.findOne.mockResolvedValueOnce(null);
      // findByEmail returns existing local user
      mockRepository.findOne.mockResolvedValueOnce(existingLocal);
      mockRepository.save.mockResolvedValue(existingLocal);

      const result = await service.upsertOidcUser(oidcClaims);

      expect(result.id).toBe('local-user-id');
      expect(result.externalId).toBe('oidc-sub-123');
      expect(result.provider).toBe(AuthProvider.OIDC);
      // MFA should be preserved
      expect(result.mfaEnabled).toBe(true);
    });

    it('should create new OIDC user when no existing user found', async () => {
      const newOidcUser = {
        id: 'new-oidc-id',
        email: 'oidc@example.com',
        externalId: 'oidc-sub-123',
        oidcIssuer: 'https://auth.example.com',
        provider: AuthProvider.OIDC,
        role: UserRole.USER,
        isActive: true,
      };

      // findByExternalId returns null
      mockRepository.findOne.mockResolvedValueOnce(null);
      // findByEmail returns null
      mockRepository.findOne.mockResolvedValueOnce(null);
      mockRepository.create.mockReturnValue(newOidcUser);
      mockRepository.save.mockResolvedValue(newOidcUser);

      const result = await service.upsertOidcUser(oidcClaims);

      expect(result.provider).toBe(AuthProvider.OIDC);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'oidc@example.com',
          externalId: 'oidc-sub-123',
          oidcIssuer: 'https://auth.example.com',
          provider: AuthProvider.OIDC,
        }),
      );
    });

    it('should fix legacy NaN timestamps on existing OIDC user', async () => {
      const existingOidc = {
        ...mockUser,
        externalId: 'oidc-sub-123',
        oidcIssuer: 'https://auth.example.com',
        provider: AuthProvider.OIDC,
        createdAt: NaN,
        updatedAt: NaN,
      };

      mockRepository.findOne.mockResolvedValueOnce(existingOidc);
      mockRepository.save.mockResolvedValue(existingOidc);

      await service.upsertOidcUser(oidcClaims);

      expect(Number.isFinite(existingOidc.createdAt)).toBe(true);
      expect(Number.isFinite(existingOidc.updatedAt)).toBe(true);
    });
  });

  describe('validateLocalUser', () => {
    it('should return user with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userWithHash = { ...mockUser, passwordHash: hashedPassword };
      mockRepository.findOne.mockResolvedValue(userWithHash);
      mockRepository.save.mockResolvedValue(userWithHash);

      const result = await service.validateLocalUser(
        'test@example.com',
        'password123',
      );

      expect(result.email).toEqual(mockUser.email);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockRepository.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });

      await expect(
        service.validateLocalUser('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateLocalUser('notfound@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for OIDC user', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockUser,
        provider: AuthProvider.OIDC,
      });

      await expect(
        service.validateLocalUser('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockRepository.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
        isActive: false,
      });

      await expect(
        service.validateLocalUser('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateUser', () => {
    it('should update user profile', async () => {
      const user = { ...mockUser };
      mockRepository.findOne.mockResolvedValue(user);
      mockRepository.save.mockResolvedValue({
        ...user,
        username: 'newname',
        displayName: 'New Name',
      });

      await service.updateUser('test-user-id', {
        username: 'newname',
        displayName: 'New Name',
      });

      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should update role when provided', async () => {
      const user = { ...mockUser };
      mockRepository.findOne.mockResolvedValue(user);
      mockRepository.save.mockResolvedValue({ ...user, role: UserRole.ADMIN });

      await service.updateUser('test-user-id', { role: UserRole.ADMIN });

      expect(user.role).toBe(UserRole.ADMIN);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUser('non-existent', { username: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should change password for local user with correct current password', async () => {
      const hashedPassword = await bcrypt.hash('oldpassword', 10);
      const user = {
        ...mockUser,
        passwordHash: hashedPassword,
        provider: AuthProvider.LOCAL,
      };
      mockRepository.findOne.mockResolvedValue(user);
      mockRepository.save.mockResolvedValue(user);

      await service.changePassword(
        'test-user-id',
        'oldpassword',
        'newpassword',
      );

      expect(mockRepository.save).toHaveBeenCalled();
      // Password hash should have changed
      expect(user.passwordHash).not.toBe(hashedPassword);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('non-existent', 'old', 'new'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException for OIDC account', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockUser,
        provider: AuthProvider.OIDC,
      });

      await expect(
        service.changePassword('test-user-id', 'old', 'new'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong current password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      mockRepository.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
        provider: AuthProvider.LOCAL,
      });

      await expect(
        service.changePassword('test-user-id', 'wrongpassword', 'newpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('setRefreshTokenHash', () => {
    it('should update refresh token hash via query builder', async () => {
      await service.setRefreshTokenHash('user-id', 'hashed-token');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(UserEntity);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        refreshTokenHash: 'hashed-token',
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', {
        id: 'user-id',
      });
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });

    it('should accept null to clear refresh token', async () => {
      await service.setRefreshTokenHash('user-id', null);

      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        refreshTokenHash: null,
      });
    });
  });

  describe('setMfaSecret', () => {
    it('should update MFA secret and set mfaEnabled to false', async () => {
      await service.setMfaSecret('user-id', 'encrypted-secret');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(UserEntity);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        mfaSecret: 'encrypted-secret',
        mfaEnabled: false,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', {
        id: 'user-id',
      });
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });

    it('should accept null to clear MFA secret', async () => {
      await service.setMfaSecret('user-id', null);

      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        mfaSecret: null,
        mfaEnabled: false,
      });
    });
  });

  describe('setMfaEnabled', () => {
    it('should enable MFA', async () => {
      await service.setMfaEnabled('user-id', true);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ mfaEnabled: true });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', {
        id: 'user-id',
      });
    });

    it('should disable MFA', async () => {
      await service.setMfaEnabled('user-id', false);

      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ mfaEnabled: false });
    });
  });

  describe('findAll', () => {
    it('should return all users ordered by createdAt DESC', async () => {
      const users = [
        mockUser,
        { ...mockUser, id: 'user-2', email: 'user2@example.com' },
      ];
      mockRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user and clear refresh token', async () => {
      const user = { ...mockUser };
      mockRepository.findOne.mockResolvedValue(user);
      mockRepository.save.mockResolvedValue(user);

      await service.deactivateUser('test-user-id');

      expect(user.isActive).toBe(false);
      expect(user.refreshTokenHash).toBeNull();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.deactivateUser('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserCount', () => {
    it('should return user count', async () => {
      mockRepository.count.mockResolvedValue(42);

      const result = await service.getUserCount();

      expect(result).toBe(42);
      expect(mockRepository.count).toHaveBeenCalled();
    });
  });

  describe('needsInitialSetup', () => {
    it('should return true when no admin exists', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await service.needsInitialSetup();

      expect(result).toBe(true);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { role: UserRole.ADMIN },
      });
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
      mockRepository.create.mockReturnValue({
        ...mockUser,
        role: UserRole.ADMIN,
      });
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        role: UserRole.ADMIN,
      });

      const result = await service.createInitialAdmin({
        email: 'admin@example.com',
        password: 'adminpassword',
      });

      expect(result.role).toEqual(UserRole.ADMIN);
    });

    it('should throw ConflictException when admin already exists', async () => {
      mockRepository.count.mockResolvedValue(1);

      await expect(
        service.createInitialAdmin({
          email: 'admin@example.com',
          password: 'adminpassword',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
