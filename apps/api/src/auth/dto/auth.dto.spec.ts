import { validate } from 'class-validator';
import { UserRole } from '../entities/user.entity';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  TokenResponseDto,
  ChangePasswordDto,
  UpdateUserDto,
  MfaSetupRequestDto,
  MfaCompleteRequestDto,
  MfaChallengeResponseDto,
  MfaSetupResponseDto,
  CreateUserApiKeyDto,
  UserApiKeyListItemDto,
  CreateUserApiKeyResponseDto,
  OidcCallbackDto,
  UserResponseDto,
} from './auth.dto';

describe('Auth DTOs', () => {
  describe('LoginDto', () => {
    it('should validate valid login', async () => {
      const dto = Object.assign(new LoginDto(), {
        email: 'test@example.com',
        password: 'password123',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid email', async () => {
      const dto = Object.assign(new LoginDto(), {
        email: 'invalid',
        password: 'password123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject short password', async () => {
      const dto = Object.assign(new LoginDto(), {
        email: 'test@example.com',
        password: 'short',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow optional mfaCode', async () => {
      const dto = Object.assign(new LoginDto(), {
        email: 'test@example.com',
        password: 'password123',
        mfaCode: '123456',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow optional deviceFingerprint', async () => {
      const dto = Object.assign(new LoginDto(), {
        email: 'test@example.com',
        password: 'password123',
        deviceFingerprint: 'fp-abc-123',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing email', async () => {
      const dto = Object.assign(new LoginDto(), {
        password: 'password123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject missing password', async () => {
      const dto = Object.assign(new LoginDto(), {
        email: 'test@example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-string mfaCode', async () => {
      const dto = Object.assign(new LoginDto(), {
        email: 'test@example.com',
        password: 'password123',
        mfaCode: 12345,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('RegisterDto', () => {
    it('should validate valid registration', async () => {
      const dto = Object.assign(new RegisterDto(), {
        email: 'test@example.com',
        password: 'password123',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow optional username and displayName', async () => {
      const dto = Object.assign(new RegisterDto(), {
        email: 'test@example.com',
        password: 'password123',
        username: 'john',
        displayName: 'John Doe',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid email', async () => {
      const dto = Object.assign(new RegisterDto(), {
        email: 'not-email',
        password: 'password123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject short password', async () => {
      const dto = Object.assign(new RegisterDto(), {
        email: 'test@example.com',
        password: 'short',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow optional deviceFingerprint', async () => {
      const dto = Object.assign(new RegisterDto(), {
        email: 'test@example.com',
        password: 'password123',
        deviceFingerprint: 'fp-xyz',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing email', async () => {
      const dto = Object.assign(new RegisterDto(), {
        password: 'password123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject missing password', async () => {
      const dto = Object.assign(new RegisterDto(), {
        email: 'test@example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('RefreshTokenDto', () => {
    it('should validate valid refresh token', async () => {
      const dto = Object.assign(new RefreshTokenDto(), {
        refreshToken: 'some-token',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing refreshToken', async () => {
      const dto = new RefreshTokenDto();
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-string refreshToken', async () => {
      const dto = Object.assign(new RefreshTokenDto(), {
        refreshToken: 12345,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('TokenResponseDto', () => {
    it('should be instantiable', () => {
      const dto = new TokenResponseDto();
      dto.accessToken = 'at';
      dto.refreshToken = 'rt';
      dto.tokenType = 'Bearer';
      dto.expiresIn = 900;
      expect(dto.accessToken).toBe('at');
    });

    it('should accept all properties', () => {
      const dto = new TokenResponseDto();
      dto.accessToken = 'access-token-123';
      dto.refreshToken = 'refresh-token-456';
      dto.tokenType = 'Bearer';
      dto.expiresIn = 3600;

      expect(dto.refreshToken).toBe('refresh-token-456');
      expect(dto.tokenType).toBe('Bearer');
      expect(dto.expiresIn).toBe(3600);
    });
  });

  describe('MfaChallengeResponseDto', () => {
    it('should validate with mfaRequired and token', async () => {
      const dto = Object.assign(new MfaChallengeResponseDto(), {
        mfaRequired: true,
        mfaChallengeToken: 'challenge-token',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with mfaSetupRequired and token', async () => {
      const dto = Object.assign(new MfaChallengeResponseDto(), {
        mfaSetupRequired: true,
        mfaChallengeToken: 'challenge-token',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing mfaChallengeToken', async () => {
      const dto = Object.assign(new MfaChallengeResponseDto(), {
        mfaRequired: true,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow both mfaRequired and mfaSetupRequired to be optional', async () => {
      const dto = Object.assign(new MfaChallengeResponseDto(), {
        mfaChallengeToken: 'token-only',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('MfaSetupRequestDto', () => {
    it('should validate with token', async () => {
      const dto = Object.assign(new MfaSetupRequestDto(), {
        mfaChallengeToken: 'token-123',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing token', async () => {
      const dto = new MfaSetupRequestDto();
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-string token', async () => {
      const dto = Object.assign(new MfaSetupRequestDto(), {
        mfaChallengeToken: 12345,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('MfaSetupResponseDto', () => {
    it('should be instantiable with all properties', () => {
      const dto = new MfaSetupResponseDto();
      dto.otpauthUrl = 'otpauth://totp/Test?secret=ABC';
      dto.qrCodeDataUrl = 'data:image/png;base64,abc';
      dto.secret = 'JBSWY3DPEHPK3PXP';

      expect(dto.otpauthUrl).toContain('otpauth://');
      expect(dto.qrCodeDataUrl).toContain('data:image');
      expect(dto.secret).toBe('JBSWY3DPEHPK3PXP');
    });
  });

  describe('MfaCompleteRequestDto', () => {
    it('should validate with token and code', async () => {
      const dto = Object.assign(new MfaCompleteRequestDto(), {
        mfaChallengeToken: 'token-123',
        code: '123456',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing token', async () => {
      const dto = Object.assign(new MfaCompleteRequestDto(), {
        code: '123456',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject missing code', async () => {
      const dto = Object.assign(new MfaCompleteRequestDto(), {
        mfaChallengeToken: 'token-123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow optional deviceFingerprint', async () => {
      const dto = Object.assign(new MfaCompleteRequestDto(), {
        mfaChallengeToken: 'token-123',
        code: '123456',
        deviceFingerprint: 'fp-abc',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('UserResponseDto', () => {
    it('should be instantiable with all properties', () => {
      const dto = new UserResponseDto();
      dto.id = 'user-1';
      dto.email = 'test@example.com';
      dto.username = 'testuser';
      dto.displayName = 'Test User';
      dto.role = UserRole.USER;
      dto.avatarUrl = 'https://example.com/avatar.png';
      dto.provider = 'local';
      dto.isActive = true;
      dto.lastLoginAt = Date.now();
      dto.createdAt = Date.now();

      expect(dto.id).toBe('user-1');
      expect(dto.email).toBe('test@example.com');
      expect(dto.role).toBe(UserRole.USER);
      expect(dto.isActive).toBe(true);
    });

    it('should allow optional fields to be undefined', () => {
      const dto = new UserResponseDto();
      dto.id = 'user-1';
      dto.email = 'test@example.com';
      dto.role = UserRole.ADMIN;
      dto.provider = 'oidc';
      dto.isActive = true;
      dto.createdAt = Date.now();

      expect(dto.username).toBeUndefined();
      expect(dto.displayName).toBeUndefined();
      expect(dto.avatarUrl).toBeUndefined();
      expect(dto.lastLoginAt).toBeUndefined();
    });
  });

  describe('OidcCallbackDto', () => {
    it('should validate with code', async () => {
      const dto = Object.assign(new OidcCallbackDto(), {
        code: 'auth-code-123',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with code and state', async () => {
      const dto = Object.assign(new OidcCallbackDto(), {
        code: 'auth-code-123',
        state: 'csrf-state-token',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing code', async () => {
      const dto = Object.assign(new OidcCallbackDto(), {
        state: 'csrf-state',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-string code', async () => {
      const dto = Object.assign(new OidcCallbackDto(), {
        code: 12345,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateUserDto', () => {
    it('should validate with optional fields', async () => {
      const dto = Object.assign(new UpdateUserDto(), {
        displayName: 'New Name',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with all fields', async () => {
      const dto = Object.assign(new UpdateUserDto(), {
        username: 'newuser',
        displayName: 'New Display',
        role: UserRole.ADMIN,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with no fields (all optional)', async () => {
      const dto = new UpdateUserDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid role enum', async () => {
      const dto = Object.assign(new UpdateUserDto(), {
        role: 'superadmin',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept USER role', async () => {
      const dto = Object.assign(new UpdateUserDto(), {
        role: UserRole.USER,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('ChangePasswordDto', () => {
    it('should validate valid password change', async () => {
      const dto = Object.assign(new ChangePasswordDto(), {
        currentPassword: 'oldpass123',
        newPassword: 'newpass123',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject short new password', async () => {
      const dto = Object.assign(new ChangePasswordDto(), {
        currentPassword: 'oldpass123',
        newPassword: 'short',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject missing currentPassword', async () => {
      const dto = Object.assign(new ChangePasswordDto(), {
        newPassword: 'newpass123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject missing newPassword', async () => {
      const dto = Object.assign(new ChangePasswordDto(), {
        currentPassword: 'oldpass123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept exactly 8 character new password', async () => {
      const dto = Object.assign(new ChangePasswordDto(), {
        currentPassword: 'oldpass123',
        newPassword: '12345678',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('CreateUserApiKeyDto', () => {
    it('should validate with name', async () => {
      const dto = Object.assign(new CreateUserApiKeyDto(), { name: 'CI Key' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing name', async () => {
      const dto = new CreateUserApiKeyDto();
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject name longer than 64 characters', async () => {
      const dto = Object.assign(new CreateUserApiKeyDto(), {
        name: 'a'.repeat(65),
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept name exactly 64 characters', async () => {
      const dto = Object.assign(new CreateUserApiKeyDto(), {
        name: 'a'.repeat(64),
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-string name', async () => {
      const dto = Object.assign(new CreateUserApiKeyDto(), {
        name: 12345,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UserApiKeyListItemDto', () => {
    it('should be instantiable with all properties', () => {
      const dto = new UserApiKeyListItemDto();
      dto.id = 'key-1';
      dto.name = 'My Key';
      dto.keyPrefix = 'sdj_12ab34cd56ef';
      dto.lastUsedAt = Date.now();
      dto.revokedAt = null;
      dto.createdAt = Date.now();

      expect(dto.id).toBe('key-1');
      expect(dto.name).toBe('My Key');
      expect(dto.keyPrefix).toBe('sdj_12ab34cd56ef');
      expect(dto.revokedAt).toBeNull();
    });

    it('should allow optional fields to be undefined', () => {
      const dto = new UserApiKeyListItemDto();
      dto.id = 'key-1';
      dto.name = 'Key';
      dto.keyPrefix = 'sdj_abc';
      dto.createdAt = Date.now();

      expect(dto.lastUsedAt).toBeUndefined();
      expect(dto.revokedAt).toBeUndefined();
    });
  });

  describe('CreateUserApiKeyResponseDto', () => {
    it('should be instantiable with apiKey and item', () => {
      const item = new UserApiKeyListItemDto();
      item.id = 'key-1';
      item.name = 'Test Key';
      item.keyPrefix = 'sdj_abc';
      item.createdAt = Date.now();

      const dto = new CreateUserApiKeyResponseDto();
      dto.apiKey = 'sdj_full_api_key_here';
      dto.item = item;

      expect(dto.apiKey).toBe('sdj_full_api_key_here');
      expect(dto.item.id).toBe('key-1');
      expect(dto.item.name).toBe('Test Key');
    });
  });
});
