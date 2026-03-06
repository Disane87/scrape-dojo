import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { UserService } from './user.service';

describe('ApiKeysService', () => {
  let service: ApiKeysService;

  const mockApiKeyEntity: Partial<ApiKeyEntity> = {
    id: 'key-id-1',
    userId: 'user-1',
    name: 'My API Key',
    keyPrefix: 'sdj_12345678',
    keyHash: 'hashed-value',
    lastUsedAt: null,
    revokedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    isActive: true,
  };

  const mockRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
  };

  const mockUserService = {
    findById: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        {
          provide: getRepositoryToken(ApiKeyEntity),
          useValue: mockRepository,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listForUser', () => {
    it('should return all API keys for a user ordered by createdAt DESC', async () => {
      const keys = [mockApiKeyEntity];
      mockRepository.find.mockResolvedValue(keys);

      const result = await service.listForUser('user-1');

      expect(result).toEqual(keys);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when user has no keys', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.listForUser('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('createForUser', () => {
    it('should create an API key and return the plaintext key and entity', async () => {
      mockRepository.create.mockReturnValue(mockApiKeyEntity);
      mockRepository.save.mockResolvedValue(mockApiKeyEntity);

      const result = await service.createForUser('user-1', 'My API Key');

      expect(result.apiKey).toBeDefined();
      expect(result.apiKey).toMatch(/^sdj_/);
      expect(result.entity).toEqual(mockApiKeyEntity);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          name: 'My API Key',
          lastUsedAt: null,
          revokedAt: null,
        }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(mockApiKeyEntity);
    });

    it('should set keyPrefix to first 12 chars of the generated key', async () => {
      mockRepository.create.mockImplementation((data) => data);
      mockRepository.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.createForUser('user-1', 'Test Key');

      expect(result.entity.keyPrefix).toBe(result.apiKey.slice(0, 12));
    });
  });

  describe('revokeForUser', () => {
    it('should set revokedAt timestamp on the API key', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });
      const before = Date.now();

      await service.revokeForUser('user-1', 'key-id-1');

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: 'key-id-1', userId: 'user-1' },
        { revokedAt: expect.any(Number) },
      );
      const revokedAt = mockRepository.update.mock.calls[0][1].revokedAt;
      expect(revokedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('validateApiKey', () => {
    it('should return user when API key is valid and user is active', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockApiKeyEntity,
        id: 'key-id-1',
        userId: 'user-1',
      });
      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await service.validateApiKey('sdj_some-valid-key');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { keyHash: expect.any(String), revokedAt: IsNull() },
      });
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: 'key-id-1' },
        { lastUsedAt: expect.any(Number) },
      );
      expect(mockUserService.findById).toHaveBeenCalledWith('user-1');
    });

    it('should return null when no matching key is found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.validateApiKey('sdj_invalid-key');

      expect(result).toBeNull();
      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(mockUserService.findById).not.toHaveBeenCalled();
    });

    it('should return null when user is not found', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockApiKeyEntity,
        id: 'key-id-1',
        userId: 'user-1',
      });
      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockUserService.findById.mockResolvedValue(null);

      const result = await service.validateApiKey('sdj_some-key');

      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockApiKeyEntity,
        id: 'key-id-1',
        userId: 'user-1',
      });
      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockUserService.findById.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await service.validateApiKey('sdj_some-key');

      expect(result).toBeNull();
    });
  });
});
