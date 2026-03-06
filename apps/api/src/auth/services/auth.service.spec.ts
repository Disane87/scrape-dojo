import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { MfaService } from './mfa.service';
import { DeviceService } from './device.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: any;
  let jwtService: any;
  let configService: any;
  let mfaService: any;
  let deviceService: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'user',
    provider: 'local',
    isActive: true,
    mfaEnabled: false,
    mfaSecret: null,
    refreshTokenHash: null,
  };

  beforeEach(async () => {
    userService = {
      validateLocalUser: vi.fn(),
      createLocalUser: vi.fn(),
      upsertOidcUser: vi.fn(),
      findById: vi.fn(),
      setRefreshTokenHash: vi.fn().mockResolvedValue(undefined),
      needsInitialSetup: vi.fn(),
      createInitialAdmin: vi.fn(),
      setMfaSecret: vi.fn().mockResolvedValue(undefined),
      setMfaEnabled: vi.fn().mockResolvedValue(undefined),
      changePassword: vi.fn(),
    };

    jwtService = {
      sign: vi.fn().mockReturnValue('mock-token'),
      verify: vi.fn(),
    };

    configService = {
      get: vi.fn().mockImplementation((key: string, defaultValue?: string) => {
        const map: Record<string, string> = {
          SCRAPE_DOJO_AUTH_ACCESS_TOKEN_EXPIRY: '15m',
          SCRAPE_DOJO_AUTH_REFRESH_TOKEN_EXPIRY: '7d',
          SCRAPE_DOJO_AUTH_JWT_SECRET: 'test-jwt-secret',
          SCRAPE_DOJO_AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-secret',
          SCRAPE_DOJO_AUTH_TRUSTED_DEVICE_RISK_IP: 'true',
          SCRAPE_DOJO_AUTH_MFA_ISSUER: 'Scrape Dojo',
        };
        return map[key] ?? defaultValue;
      }),
    };

    mfaService = {
      isMfaRequired: vi.fn().mockReturnValue(false),
      createChallengeToken: vi.fn().mockReturnValue('challenge-token'),
      verifyChallengeToken: vi.fn().mockReturnValue({ sub: 'user-1' }),
      generateSecret: vi.fn().mockReturnValue('TOTP_SECRET'),
      buildOtpAuthUrl: vi.fn().mockReturnValue('otpauth://totp/...'),
      buildQrCodeDataUrl: vi
        .fn()
        .mockResolvedValue('data:image/png;base64,...'),
      encryptSecret: vi.fn().mockReturnValue('encrypted-secret'),
      decryptSecret: vi.fn().mockReturnValue('plain-secret'),
      verifyTotp: vi.fn().mockReturnValue(true),
    };

    deviceService = {
      generateFingerprint: vi.fn().mockReturnValue('device-fp'),
      getTrustedDevice: vi.fn().mockResolvedValue(null),
      updateDeviceLastUsed: vi.fn().mockResolvedValue(undefined),
      parseDeviceName: vi.fn().mockReturnValue('Chrome on Windows'),
      trustDevice: vi.fn().mockResolvedValue(undefined),
      isNetworkChangeRisky: vi.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: MfaService, useValue: mfaService },
        { provide: DeviceService, useValue: deviceService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isMfaRequired', () => {
    it('should delegate to mfaService.isMfaRequired', () => {
      mfaService.isMfaRequired.mockReturnValue(true);
      expect(service.isMfaRequired()).toBe(true);

      mfaService.isMfaRequired.mockReturnValue(false);
      expect(service.isMfaRequired()).toBe(false);
    });
  });

  describe('login', () => {
    it('should return tokens when MFA is not required', async () => {
      userService.validateLocalUser.mockResolvedValue(mockUser);
      mfaService.isMfaRequired.mockReturnValue(false);

      const result = await service.login({
        email: 'test@example.com',
        password: 'pass123',
      } as any);

      expect(userService.validateLocalUser).toHaveBeenCalledWith(
        'test@example.com',
        'pass123',
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('tokenType', 'Bearer');
    });

    it('should return MFA challenge when MFA is required and user has no MFA enabled', async () => {
      userService.validateLocalUser.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
      });
      mfaService.isMfaRequired.mockReturnValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'pass123',
      } as any);

      expect(result).toHaveProperty('mfaSetupRequired', true);
      expect(result).toHaveProperty('mfaChallengeToken', 'challenge-token');
    });

    it('should return MFA challenge when MFA enabled but no code provided', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
      };
      userService.validateLocalUser.mockResolvedValue(userWithMfa);
      mfaService.isMfaRequired.mockReturnValue(true);
      deviceService.getTrustedDevice.mockResolvedValue(null);

      const result = await service.login(
        { email: 'test@example.com', password: 'pass123' } as any,
        'user-agent',
        '127.0.0.1',
      );

      expect(result).toHaveProperty('mfaRequired', true);
      expect(result).toHaveProperty('mfaSetupRequired', false);
    });

    it('should throw UnauthorizedException for invalid MFA code', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
      };
      userService.validateLocalUser.mockResolvedValue(userWithMfa);
      mfaService.isMfaRequired.mockReturnValue(true);
      mfaService.decryptSecret.mockReturnValue('plain-secret');
      mfaService.verifyTotp.mockReturnValue(false);
      deviceService.getTrustedDevice.mockResolvedValue(null);

      await expect(
        service.login(
          {
            email: 'test@example.com',
            password: 'pass123',
            mfaCode: '000000',
          } as any,
          'ua',
          '1.2.3.4',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens when valid MFA code is provided', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
      };
      userService.validateLocalUser.mockResolvedValue(userWithMfa);
      mfaService.isMfaRequired.mockReturnValue(true);
      mfaService.decryptSecret.mockReturnValue('plain-secret');
      mfaService.verifyTotp.mockReturnValue(true);
      deviceService.getTrustedDevice.mockResolvedValue(null);

      const result = await service.login(
        {
          email: 'test@example.com',
          password: 'pass123',
          mfaCode: '123456',
        } as any,
        'Mozilla/5.0',
        '127.0.0.1',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(deviceService.trustDevice).toHaveBeenCalled();
    });

    it('should skip MFA when device is trusted and not risky', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
      };
      userService.validateLocalUser.mockResolvedValue(userWithMfa);
      mfaService.isMfaRequired.mockReturnValue(true);
      deviceService.generateFingerprint.mockReturnValue('device-fp');
      deviceService.getTrustedDevice.mockResolvedValue({
        lastIpAddress: '127.0.0.1',
      });
      deviceService.isNetworkChangeRisky.mockReturnValue(false);

      const result = await service.login(
        { email: 'test@example.com', password: 'pass123' } as any,
        'Mozilla/5.0',
        '127.0.0.1',
      );

      expect(result).toHaveProperty('accessToken');
      expect(deviceService.updateDeviceLastUsed).toHaveBeenCalled();
    });

    it('should require MFA when trusted device has risky network change', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
      };
      userService.validateLocalUser.mockResolvedValue(userWithMfa);
      mfaService.isMfaRequired.mockReturnValue(true);
      deviceService.generateFingerprint.mockReturnValue('device-fp');
      deviceService.getTrustedDevice.mockResolvedValue({
        lastIpAddress: '10.0.0.1',
      });
      deviceService.isNetworkChangeRisky.mockReturnValue(true);

      const result = await service.login(
        { email: 'test@example.com', password: 'pass123' } as any,
        'Mozilla/5.0',
        '192.168.1.1',
      );

      expect(result).toHaveProperty('mfaRequired', true);
    });

    it('should return MFA setup challenge when MFA enabled but no mfaSecret', async () => {
      const userWithMfaNoSecret = {
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: null,
      };
      userService.validateLocalUser.mockResolvedValue(userWithMfaNoSecret);
      mfaService.isMfaRequired.mockReturnValue(true);
      deviceService.getTrustedDevice.mockResolvedValue(null);

      const result = await service.login(
        {
          email: 'test@example.com',
          password: 'pass123',
          mfaCode: '123456',
        } as any,
        'ua',
        '1.2.3.4',
      );

      expect(result).toHaveProperty('mfaSetupRequired', true);
    });

    it('should use deviceFingerprint from dto when available', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
      };
      userService.validateLocalUser.mockResolvedValue(userWithMfa);
      mfaService.isMfaRequired.mockReturnValue(true);
      mfaService.verifyTotp.mockReturnValue(true);
      deviceService.getTrustedDevice.mockResolvedValue(null);

      await service.login(
        {
          email: 'test@example.com',
          password: 'pass123',
          mfaCode: '123456',
          deviceFingerprint: 'client-fp',
        } as any,
        'ua',
        '1.2.3.4',
      );

      // The deviceFingerprint from dto should be preferred
      expect(deviceService.trustDevice).toHaveBeenCalledWith(
        'user-1',
        'client-fp',
        expect.any(String),
        '1.2.3.4',
      );
    });
  });

  describe('register', () => {
    it('should create user and return tokens when MFA not required', async () => {
      userService.createLocalUser.mockResolvedValue(mockUser);
      mfaService.isMfaRequired.mockReturnValue(false);

      const dto = {
        email: 'new@example.com',
        password: 'pass123',
        username: 'newuser',
      };
      const result = await service.register(dto as any);

      expect(userService.createLocalUser).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('accessToken');
    });

    it('should return MFA challenge when MFA is required', async () => {
      userService.createLocalUser.mockResolvedValue(mockUser);
      mfaService.isMfaRequired.mockReturnValue(true);

      const result = await service.register({
        email: 'new@example.com',
        password: 'pass123',
      } as any);

      expect(result).toHaveProperty('mfaSetupRequired', true);
      expect(result).toHaveProperty('mfaChallengeToken');
    });
  });

  describe('handleOidcUser', () => {
    const claims = {
      sub: 'oidc-sub',
      email: 'oidc@example.com',
      iss: 'https://issuer.com',
    };

    it('should upsert user and return tokens when MFA not required', async () => {
      userService.upsertOidcUser.mockResolvedValue(mockUser);
      mfaService.isMfaRequired.mockReturnValue(false);

      const result = await service.handleOidcUser(claims);

      expect(userService.upsertOidcUser).toHaveBeenCalledWith(claims);
      expect(result).toHaveProperty('accessToken');
    });

    it('should return MFA challenge when MFA is required and user has MFA enabled', async () => {
      const mfaUser = { ...mockUser, mfaEnabled: true, mfaSecret: 'secret' };
      userService.upsertOidcUser.mockResolvedValue(mfaUser);
      mfaService.isMfaRequired.mockReturnValue(true);

      const result = await service.handleOidcUser(claims);

      expect(result).toHaveProperty('mfaRequired', true);
      expect(result).toHaveProperty('mfaSetupRequired', false);
    });

    it('should return MFA setup challenge when MFA required but user has no MFA', async () => {
      userService.upsertOidcUser.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
      });
      mfaService.isMfaRequired.mockReturnValue(true);

      const result = await service.handleOidcUser(claims);

      expect(result).toHaveProperty('mfaSetupRequired', true);
    });
  });

  describe('refreshTokens', () => {
    it('should throw UnauthorizedException when token verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw when user is not found', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1' });
      userService.findById.mockResolvedValue(null);

      await expect(service.refreshTokens('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw when user is not active', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1' });
      userService.findById.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.refreshTokens('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw when MFA is required but user has not set up MFA', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1' });
      userService.findById.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
      });
      mfaService.isMfaRequired.mockReturnValue(true);

      await expect(service.refreshTokens('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return new tokens when refresh token is valid and user is active', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1' });
      userService.findById.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: null,
      });
      mfaService.isMfaRequired.mockReturnValue(false);

      const result = await service.refreshTokens('valid-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('tokenType', 'Bearer');
    });
  });

  describe('logout', () => {
    it('should call setRefreshTokenHash with null', async () => {
      await service.logout('user-1');

      expect(userService.setRefreshTokenHash).toHaveBeenCalledWith(
        'user-1',
        null,
      );
    });
  });

  describe('validateJwtPayload', () => {
    it('should return user if active', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.validateJwtPayload({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'user',
        provider: 'local',
      });

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      userService.findById.mockResolvedValue(null);

      const result = await service.validateJwtPayload({
        sub: 'nonexistent',
        email: '',
        role: '',
        provider: '',
      });

      expect(result).toBeNull();
    });

    it('should return null if user is not active', async () => {
      userService.findById.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.validateJwtPayload({
        sub: 'user-1',
        email: '',
        role: '',
        provider: '',
      });

      expect(result).toBeNull();
    });
  });

  describe('needsInitialSetup', () => {
    it('should delegate to userService.needsInitialSetup', async () => {
      userService.needsInitialSetup.mockResolvedValue(true);

      const result = await service.needsInitialSetup();

      expect(result).toBe(true);
      expect(userService.needsInitialSetup).toHaveBeenCalled();
    });

    it('should return false when setup is not needed', async () => {
      userService.needsInitialSetup.mockResolvedValue(false);

      const result = await service.needsInitialSetup();

      expect(result).toBe(false);
    });
  });

  describe('createInitialAdmin', () => {
    it('should create admin and return tokens when MFA not required', async () => {
      const adminUser = { ...mockUser, role: 'admin' };
      userService.createInitialAdmin.mockResolvedValue(adminUser);
      mfaService.isMfaRequired.mockReturnValue(false);

      const dto = {
        email: 'admin@example.com',
        password: 'admin123',
        username: 'admin',
      };
      const result = await service.createInitialAdmin(dto as any);

      expect(userService.createInitialAdmin).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('accessToken');
    });

    it('should return MFA challenge when MFA is required', async () => {
      const adminUser = { ...mockUser, role: 'admin' };
      userService.createInitialAdmin.mockResolvedValue(adminUser);
      mfaService.isMfaRequired.mockReturnValue(true);

      const dto = {
        email: 'admin@example.com',
        password: 'admin123',
        username: 'admin',
      };
      const result = await service.createInitialAdmin(dto as any);

      expect(result).toHaveProperty('mfaSetupRequired', true);
      expect(result).toHaveProperty('mfaChallengeToken');
    });
  });

  describe('createMfaChallenge', () => {
    it('should return challenge with mfaRequired when setupRequired is false', () => {
      const result = service.createMfaChallenge(mockUser as any, {
        setupRequired: false,
      });

      expect(result).toEqual({
        mfaRequired: true,
        mfaSetupRequired: false,
        mfaChallengeToken: 'challenge-token',
      });
    });

    it('should return challenge with mfaSetupRequired when setupRequired is true', () => {
      const result = service.createMfaChallenge(mockUser as any, {
        setupRequired: true,
      });

      expect(result).toEqual({
        mfaRequired: false,
        mfaSetupRequired: true,
        mfaChallengeToken: 'challenge-token',
      });
    });
  });

  describe('setupMfaFromChallenge', () => {
    it('should generate MFA setup data for a valid challenge', async () => {
      mfaService.verifyChallengeToken.mockReturnValue({ sub: 'user-1' });
      userService.findById.mockResolvedValue(mockUser);

      const result = await service.setupMfaFromChallenge('challenge-token');

      expect(result).toHaveProperty('otpauthUrl');
      expect(result).toHaveProperty('qrCodeDataUrl');
      expect(result).toHaveProperty('secret', 'TOTP_SECRET');
      expect(result).toHaveProperty('userId', 'user-1');
      expect(mfaService.generateSecret).toHaveBeenCalled();
      expect(mfaService.encryptSecret).toHaveBeenCalledWith('TOTP_SECRET');
      expect(userService.setMfaSecret).toHaveBeenCalledWith(
        'user-1',
        'encrypted-secret',
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mfaService.verifyChallengeToken.mockReturnValue({ sub: 'nonexistent' });
      userService.findById.mockResolvedValue(null);

      await expect(
        service.setupMfaFromChallenge('challenge-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is not active', async () => {
      mfaService.verifyChallengeToken.mockReturnValue({ sub: 'user-1' });
      userService.findById.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.setupMfaFromChallenge('challenge-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('completeMfaFromChallenge', () => {
    it('should complete MFA and return tokens for valid code', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
      };
      mfaService.verifyChallengeToken.mockReturnValue({ sub: 'user-1' });
      userService.findById.mockResolvedValue(userWithMfa);
      mfaService.decryptSecret.mockReturnValue('plain-secret');
      mfaService.verifyTotp.mockReturnValue(true);

      const result = await service.completeMfaFromChallenge(
        'ct',
        '123456',
        'fp',
        'ua',
        '1.2.3.4',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(deviceService.trustDevice).toHaveBeenCalled();
    });

    it('should enable MFA if not already enabled', async () => {
      const userWithSecret = {
        ...mockUser,
        mfaEnabled: false,
        mfaSecret: 'encrypted-secret',
      };
      mfaService.verifyChallengeToken.mockReturnValue({ sub: 'user-1' });
      userService.findById.mockResolvedValue(userWithSecret);
      mfaService.decryptSecret.mockReturnValue('plain-secret');
      mfaService.verifyTotp.mockReturnValue(true);

      await service.completeMfaFromChallenge('ct', '123456');

      expect(userService.setMfaEnabled).toHaveBeenCalledWith('user-1', true);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mfaService.verifyChallengeToken.mockReturnValue({ sub: 'nonexistent' });
      userService.findById.mockResolvedValue(null);

      await expect(
        service.completeMfaFromChallenge('ct', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user has no mfaSecret', async () => {
      mfaService.verifyChallengeToken.mockReturnValue({ sub: 'user-1' });
      userService.findById.mockResolvedValue({ ...mockUser, mfaSecret: null });

      await expect(
        service.completeMfaFromChallenge('ct', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid MFA code', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
      };
      mfaService.verifyChallengeToken.mockReturnValue({ sub: 'user-1' });
      userService.findById.mockResolvedValue(userWithMfa);
      mfaService.decryptSecret.mockReturnValue('plain-secret');
      mfaService.verifyTotp.mockReturnValue(false);

      await expect(
        service.completeMfaFromChallenge('ct', '000000'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should not trust device when no fingerprint info is available', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
      };
      mfaService.verifyChallengeToken.mockReturnValue({ sub: 'user-1' });
      userService.findById.mockResolvedValue(userWithMfa);
      mfaService.decryptSecret.mockReturnValue('plain-secret');
      mfaService.verifyTotp.mockReturnValue(true);

      await service.completeMfaFromChallenge('ct', '123456');

      expect(deviceService.trustDevice).not.toHaveBeenCalled();
    });
  });
});
