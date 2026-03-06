import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UserService } from './services/user.service';
import { DeviceService } from './services/device.service';
import { ApiKeysService } from './services/api-keys.service';

describe('UsersController', () => {
  let controller: UsersController;
  let userService: any;
  let deviceService: any;
  let apiKeysService: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    role: 'user',
    avatarUrl: null,
    provider: 'local',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    userService = {
      findAll: vi.fn(),
      findById: vi.fn(),
      updateUser: vi.fn(),
      deactivateUser: vi.fn(),
      changePassword: vi.fn(),
    };

    deviceService = {
      getUserDevices: vi.fn(),
      removeTrustedDevice: vi.fn(),
    };

    apiKeysService = {
      listForUser: vi.fn(),
      createForUser: vi.fn(),
      revokeForUser: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: DeviceService, useValue: deviceService },
        { provide: ApiKeysService, useValue: apiKeysService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return mapped user responses', async () => {
      userService.findAll.mockResolvedValue([mockUser]);

      const result = await controller.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('user-1');
      expect(result[0].email).toBe('test@example.com');
      expect(userService.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no users exist', async () => {
      userService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single user response', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await controller.findOne('user-1');

      expect(result.id).toBe('user-1');
      expect(userService.findById).toHaveBeenCalledWith('user-1');
    });

    it('should throw when user is not found', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('update', () => {
    it('should update and return mapped user', async () => {
      const updated = { ...mockUser, displayName: 'Updated Name' };
      userService.updateUser.mockResolvedValue(updated);

      const result = await controller.update('user-1', {
        displayName: 'Updated Name',
      } as any);

      expect(result.displayName).toBe('Updated Name');
      expect(userService.updateUser).toHaveBeenCalledWith('user-1', {
        displayName: 'Updated Name',
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate user', async () => {
      userService.deactivateUser.mockResolvedValue(undefined);
      const currentUser = { id: 'admin-1' } as any;

      await controller.deactivate('user-1', currentUser);

      expect(userService.deactivateUser).toHaveBeenCalledWith('user-1');
    });

    it('should throw when trying to deactivate yourself', async () => {
      const currentUser = { id: 'user-1' } as any;

      await expect(
        controller.deactivate('user-1', currentUser),
      ).rejects.toThrow('Cannot deactivate yourself');
    });
  });

  describe('listMyApiKeys', () => {
    it('should return mapped API key list', async () => {
      const keys = [
        {
          id: 'key-1',
          name: 'My Key',
          keyPrefix: 'sd_abc',
          lastUsedAt: null,
          revokedAt: null,
          createdAt: new Date('2025-01-01'),
        },
      ];
      apiKeysService.listForUser.mockResolvedValue(keys);

      const result = await controller.listMyApiKeys(mockUser as any);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('key-1');
      expect(result[0].name).toBe('My Key');
      expect(apiKeysService.listForUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('createMyApiKey', () => {
    it('should create and return API key with entity info', async () => {
      const entity = {
        id: 'key-1',
        name: 'New Key',
        keyPrefix: 'sd_xyz',
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date(),
      };
      apiKeysService.createForUser.mockResolvedValue({
        apiKey: 'sd_xyz_full_key',
        entity,
      });

      const result = await controller.createMyApiKey(
        mockUser as any,
        { name: 'New Key' } as any,
      );

      expect(result.apiKey).toBe('sd_xyz_full_key');
      expect(result.item.id).toBe('key-1');
      expect(apiKeysService.createForUser).toHaveBeenCalledWith(
        'user-1',
        'New Key',
      );
    });
  });

  describe('revokeMyApiKey', () => {
    it('should call apiKeysService.revokeForUser', async () => {
      apiKeysService.revokeForUser.mockResolvedValue(undefined);

      await controller.revokeMyApiKey(mockUser as any, 'key-1');

      expect(apiKeysService.revokeForUser).toHaveBeenCalledWith(
        'user-1',
        'key-1',
      );
    });
  });

  describe('getProfile', () => {
    it('should return mapped user response', async () => {
      const result = await controller.getProfile(mockUser as any);

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('updateProfile', () => {
    it('should update current user profile', async () => {
      const updated = { ...mockUser, displayName: 'New Name' };
      userService.updateUser.mockResolvedValue(updated);

      const result = await controller.updateProfile(
        mockUser as any,
        { displayName: 'New Name' } as any,
      );

      expect(result.displayName).toBe('New Name');
      expect(userService.updateUser).toHaveBeenCalledWith('user-1', {
        displayName: 'New Name',
      });
    });
  });

  describe('changePassword', () => {
    it('should call userService.changePassword with correct params', async () => {
      userService.changePassword.mockResolvedValue(undefined);

      await controller.changePassword(
        mockUser as any,
        { currentPassword: 'old', newPassword: 'new' } as any,
      );

      expect(userService.changePassword).toHaveBeenCalledWith(
        'user-1',
        'old',
        'new',
      );
    });
  });

  describe('getMyDevices', () => {
    it('should return mapped device list', async () => {
      const devices = [
        {
          id: 'dev-1',
          deviceName: 'Chrome on Windows',
          deviceFingerprint: 'fp-123',
          lastIpAddress: '192.168.1.1',
          lastUsedAt: new Date(),
          createdAt: new Date(),
        },
      ];
      deviceService.getUserDevices.mockResolvedValue(devices);

      const result = await controller.getMyDevices(mockUser as any);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dev-1');
      expect(result[0].deviceName).toBe('Chrome on Windows');
      // deviceFingerprint should not be in the response
      expect(result[0]).not.toHaveProperty('deviceFingerprint');
    });
  });

  describe('removeDevice', () => {
    it('should call deviceService.removeTrustedDevice', async () => {
      deviceService.removeTrustedDevice.mockResolvedValue(undefined);

      await controller.removeDevice(mockUser as any, 'dev-1');

      expect(deviceService.removeTrustedDevice).toHaveBeenCalledWith(
        'user-1',
        'dev-1',
      );
    });
  });

  describe('removeAllDevices', () => {
    it('should remove all devices except the current one when fingerprint is provided', async () => {
      const devices = [
        { id: 'dev-1', deviceFingerprint: 'current-fp' },
        { id: 'dev-2', deviceFingerprint: 'other-fp' },
      ];
      deviceService.getUserDevices.mockResolvedValue(devices);
      deviceService.removeTrustedDevice.mockResolvedValue(undefined);

      const req = { headers: { 'x-device-fingerprint': 'current-fp' } } as any;
      await controller.removeAllDevices(mockUser as any, req);

      expect(deviceService.removeTrustedDevice).toHaveBeenCalledTimes(1);
      expect(deviceService.removeTrustedDevice).toHaveBeenCalledWith(
        'user-1',
        'dev-2',
      );
    });
  });
});
