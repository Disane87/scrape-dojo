import { UserEntity, UserRole, AuthProvider } from './user.entity';
import { ApiKeyEntity } from './api-key.entity';
import { TrustedDeviceEntity } from './trusted-device.entity';

describe('Auth Entities', () => {
  describe('UserEntity', () => {
    it('should be instantiable', () => {
      const user = new UserEntity();
      user.id = 'user-1';
      user.email = 'test@example.com';
      user.role = UserRole.USER;
      user.provider = AuthProvider.LOCAL;
      user.isActive = true;
      user.mfaEnabled = false;

      expect(user.id).toBe('user-1');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe(UserRole.USER);
      expect(user.provider).toBe(AuthProvider.LOCAL);
    });

    it('should have correct enum values', () => {
      expect(UserRole.USER).toBe('user');
      expect(UserRole.ADMIN).toBe('admin');
      expect(AuthProvider.LOCAL).toBe('local');
      expect(AuthProvider.OIDC).toBe('oidc');
    });
  });

  describe('ApiKeyEntity', () => {
    it('should be instantiable', () => {
      const key = new ApiKeyEntity();
      key.id = 'key-1';
      key.userId = 'user-1';
      key.name = 'CI Key';
      key.keyPrefix = 'sdj_12ab';
      key.keyHash = 'hash123';

      expect(key.id).toBe('key-1');
      expect(key.userId).toBe('user-1');
      expect(key.name).toBe('CI Key');
    });
  });

  describe('TrustedDeviceEntity', () => {
    it('should be instantiable', () => {
      const device = new TrustedDeviceEntity();
      device.id = 'dev-1';
      device.userId = 'user-1';
      device.deviceFingerprint = 'fp-hash';
      device.deviceName = 'Chrome on Windows';
      device.lastIpAddress = '192.168.1.1';
      device.lastUsedAt = Date.now();

      expect(device.id).toBe('dev-1');
      expect(device.deviceFingerprint).toBe('fp-hash');
    });
  });
});
