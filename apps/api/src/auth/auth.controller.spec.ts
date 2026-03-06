import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { OidcService } from './services/oidc.service';
import { UserService } from './services/user.service';
import { ApiKeysService } from './services/api-keys.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;
  let oidcService: any;
  let userService: any;
  let configService: any;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    role: 'user',
    avatarUrl: null,
    provider: 'local',
    isActive: true,
    lastLoginAt: null,
    createdAt: Date.now(),
  };

  beforeEach(async () => {
    authService = {
      login: vi.fn(),
      register: vi.fn(),
      refreshTokens: vi.fn(),
      needsInitialSetup: vi.fn(),
      createInitialAdmin: vi.fn(),
      setupMfaFromChallenge: vi.fn(),
      completeMfaFromChallenge: vi.fn(),
      handleOidcUser: vi.fn(),
      logout: vi.fn(),
    };

    oidcService = {
      getProviderInfo: vi.fn(),
      isEnabled: vi.fn(),
      getAuthorizationUrl: vi.fn(),
      handleCallback: vi.fn(),
    };

    userService = {
      changePassword: vi.fn(),
    };

    configService = {
      get: vi.fn().mockReturnValue('http://localhost:4200'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: OidcService, useValue: oidcService },
        { provide: UserService, useValue: userService },
        { provide: ConfigService, useValue: configService },
        { provide: ApiKeysService, useValue: { validateApiKey: vi.fn() } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  function createMockReq(overrides: any = {}) {
    return {
      headers: { 'user-agent': 'test-agent', ...overrides.headers },
      socket: { remoteAddress: '127.0.0.1', ...overrides.socket },
      ...overrides,
    } as any;
  }

  function createMockRes() {
    const res: any = {
      redirect: vi.fn(),
    };
    return res;
  }

  describe('login', () => {
    it('should call authService.login with dto and request info', async () => {
      const dto = { email: 'test@example.com', password: 'pass123' };
      const tokenResponse = {
        accessToken: 'at',
        refreshToken: 'rt',
        tokenType: 'Bearer',
        expiresIn: 900,
      };
      authService.login.mockResolvedValue(tokenResponse);

      const req = createMockReq();
      const result = await controller.login(dto as any, req);

      expect(authService.login).toHaveBeenCalledWith(
        dto,
        'test-agent',
        '127.0.0.1',
      );
      expect(result).toEqual(tokenResponse);
    });

    it('should use x-forwarded-for header when available', async () => {
      const dto = { email: 'test@example.com', password: 'pass123' };
      authService.login.mockResolvedValue({});

      const req = createMockReq({
        headers: {
          'user-agent': 'ua',
          'x-forwarded-for': '10.0.0.1, 192.168.1.1',
        },
      });
      await controller.login(dto as any, req);

      expect(authService.login).toHaveBeenCalledWith(dto, 'ua', '10.0.0.1');
    });
  });

  describe('register', () => {
    it('should call authService.register with dto', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'pass123',
        username: 'newuser',
      };
      const tokenResponse = {
        accessToken: 'at',
        refreshToken: 'rt',
        tokenType: 'Bearer',
        expiresIn: 900,
      };
      authService.register.mockResolvedValue(tokenResponse);

      const result = await controller.register(dto as any);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(tokenResponse);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshTokens with the refresh token', async () => {
      const dto = { refreshToken: 'some-refresh-token' };
      const tokenResponse = {
        accessToken: 'new-at',
        refreshToken: 'new-rt',
        tokenType: 'Bearer',
        expiresIn: 900,
      };
      authService.refreshTokens.mockResolvedValue(tokenResponse);

      const result = await controller.refresh(dto as any);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        'some-refresh-token',
      );
      expect(result).toEqual(tokenResponse);
    });
  });

  describe('checkSetupRequired', () => {
    it('should return required status from authService', async () => {
      authService.needsInitialSetup.mockResolvedValue(true);

      const result = await controller.checkSetupRequired();

      expect(result).toEqual({ required: true });
      expect(authService.needsInitialSetup).toHaveBeenCalled();
    });

    it('should return false when setup is not required', async () => {
      authService.needsInitialSetup.mockResolvedValue(false);

      const result = await controller.checkSetupRequired();

      expect(result).toEqual({ required: false });
    });
  });

  describe('initialSetup', () => {
    it('should call authService.createInitialAdmin with dto', async () => {
      const dto = {
        email: 'admin@example.com',
        password: 'admin123',
        username: 'admin',
      };
      const tokenResponse = {
        accessToken: 'at',
        refreshToken: 'rt',
        tokenType: 'Bearer',
        expiresIn: 900,
      };
      authService.createInitialAdmin.mockResolvedValue(tokenResponse);

      const result = await controller.initialSetup(dto as any);

      expect(authService.createInitialAdmin).toHaveBeenCalledWith(dto);
      expect(result).toEqual(tokenResponse);
    });
  });

  describe('mfaSetup', () => {
    it('should call authService.setupMfaFromChallenge and return setup data', async () => {
      const setupData = {
        otpauthUrl: 'otpauth://...',
        qrCodeDataUrl: 'data:image/png;...',
        secret: 'ABCDEF',
        userId: '1',
      };
      authService.setupMfaFromChallenge.mockResolvedValue(setupData);

      const result = await controller.mfaSetup({
        mfaChallengeToken: 'challenge-token',
      } as any);

      expect(authService.setupMfaFromChallenge).toHaveBeenCalledWith(
        'challenge-token',
      );
      expect(result).toEqual({
        otpauthUrl: setupData.otpauthUrl,
        qrCodeDataUrl: setupData.qrCodeDataUrl,
        secret: setupData.secret,
      });
    });
  });

  describe('mfaComplete', () => {
    it('should call authService.completeMfaFromChallenge with dto and request info', async () => {
      const tokenResponse = {
        accessToken: 'at',
        refreshToken: 'rt',
        tokenType: 'Bearer',
        expiresIn: 900,
      };
      authService.completeMfaFromChallenge.mockResolvedValue(tokenResponse);

      const req = createMockReq();
      const result = await controller.mfaComplete(
        {
          mfaChallengeToken: 'ct',
          code: '123456',
          deviceFingerprint: 'fp',
        } as any,
        req,
      );

      expect(authService.completeMfaFromChallenge).toHaveBeenCalledWith(
        'ct',
        '123456',
        'fp',
        'test-agent',
        '127.0.0.1',
      );
      expect(result).toEqual(tokenResponse);
    });

    it('should use x-forwarded-for for IP address', async () => {
      authService.completeMfaFromChallenge.mockResolvedValue({});
      const req = createMockReq({
        headers: { 'user-agent': 'ua', 'x-forwarded-for': '10.0.0.5' },
      });

      await controller.mfaComplete(
        { mfaChallengeToken: 'ct', code: '123456' } as any,
        req,
      );

      expect(authService.completeMfaFromChallenge).toHaveBeenCalledWith(
        'ct',
        '123456',
        undefined,
        'ua',
        '10.0.0.5',
      );
    });
  });

  describe('getOidcConfig', () => {
    it('should return oidcService.getProviderInfo()', () => {
      const info = {
        enabled: true,
        name: 'Keycloak',
        loginUrl: '/auth/oidc/login',
      };
      oidcService.getProviderInfo.mockReturnValue(info);

      const result = controller.getOidcConfig();

      expect(result).toEqual(info);
      expect(oidcService.getProviderInfo).toHaveBeenCalled();
    });
  });

  describe('oidcLogin', () => {
    it('should throw BadRequestException when OIDC is not enabled', async () => {
      oidcService.isEnabled.mockReturnValue(false);
      const res = createMockRes();

      await expect(controller.oidcLogin(undefined as any, res)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should redirect to OIDC provider when enabled', async () => {
      oidcService.isEnabled.mockReturnValue(true);
      oidcService.getAuthorizationUrl.mockResolvedValue(
        'https://idp.example.com/auth?state=abc',
      );
      const res = createMockRes();

      await controller.oidcLogin(undefined as any, res);

      expect(oidcService.getAuthorizationUrl).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        'https://idp.example.com/auth?state=abc',
      );
    });

    it('should include redirect URL in state when provided', async () => {
      oidcService.isEnabled.mockReturnValue(true);
      oidcService.getAuthorizationUrl.mockResolvedValue(
        'https://idp.example.com/auth',
      );
      const res = createMockRes();

      await controller.oidcLogin('/dashboard', res);

      const stateArg = oidcService.getAuthorizationUrl.mock.calls[0][0];
      expect(stateArg).toContain('|/dashboard');
    });
  });

  describe('oidcCallback', () => {
    it('should redirect with error when error param is present', async () => {
      const res = createMockRes();

      await controller.oidcCallback(
        undefined as any,
        undefined as any,
        {},
        'access_denied',
        'User denied access',
        res,
      );

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('auth_error='),
      );
    });

    it('should throw BadRequestException when code or state is missing', async () => {
      const res = createMockRes();

      await expect(
        controller.oidcCallback(
          undefined as any,
          undefined as any,
          {},
          undefined as any,
          undefined as any,
          res,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should redirect with tokens on successful OIDC callback', async () => {
      const userInfo = {
        sub: 'sub1',
        email: 'user@example.com',
        iss: 'https://idp.example.com',
      };
      const tokens = { accessToken: 'at', refreshToken: 'rt', expiresIn: 900 };
      oidcService.handleCallback.mockResolvedValue(userInfo);
      authService.handleOidcUser.mockResolvedValue(tokens);
      const res = createMockRes();

      await controller.oidcCallback(
        'auth-code',
        'state-uuid|/dashboard',
        { code: 'auth-code', state: 'state-uuid|/dashboard' },
        undefined as any,
        undefined as any,
        res,
      );

      expect(oidcService.handleCallback).toHaveBeenCalledWith(
        'auth-code',
        'state-uuid|/dashboard',
        expect.any(Object),
      );
      expect(authService.handleOidcUser).toHaveBeenCalledWith(userInfo);
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('access_token=at'),
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('return_url=%2Fdashboard'),
      );
    });

    it('should redirect with MFA challenge token when MFA is required', async () => {
      const userInfo = {
        sub: 'sub1',
        email: 'user@example.com',
        iss: 'https://idp.example.com',
      };
      const mfaResponse = {
        mfaChallengeToken: 'mfa-ct',
        mfaSetupRequired: true,
        mfaRequired: false,
      };
      oidcService.handleCallback.mockResolvedValue(userInfo);
      authService.handleOidcUser.mockResolvedValue(mfaResponse);
      const res = createMockRes();

      await controller.oidcCallback(
        'auth-code',
        'state-uuid',
        { code: 'auth-code', state: 'state-uuid' },
        undefined as any,
        undefined as any,
        res,
      );

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('mfa_challenge_token='),
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('mfa_setup_required=1'),
      );
    });

    it('should redirect with error on exception during callback', async () => {
      oidcService.handleCallback.mockRejectedValue(
        new Error('OIDC exchange failed'),
      );
      const res = createMockRes();

      await controller.oidcCallback(
        'auth-code',
        'state',
        { code: 'auth-code', state: 'state' },
        undefined as any,
        undefined as any,
        res,
      );

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('auth_error=OIDC%20exchange%20failed'),
      );
    });

    it('should handle DB query failure in OIDC callback', async () => {
      const dbError = new Error('DB failure') as any;
      dbError.query = 'INSERT INTO users ...';
      dbError.parameters = ['param1'];
      oidcService.handleCallback.mockRejectedValue(dbError);
      const res = createMockRes();

      await controller.oidcCallback(
        'auth-code',
        'state',
        { code: 'auth-code', state: 'state' },
        undefined as any,
        undefined as any,
        res,
      );

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('auth_error='),
      );
    });
  });

  describe('getProfile', () => {
    it('should return mapped user response', () => {
      const result = controller.getProfile(mockUser as any);

      expect(result.id).toBe('1');
      expect(result.email).toBe('test@example.com');
      expect(result.username).toBe('testuser');
      expect(result.displayName).toBe('Test User');
      expect(result.role).toBe('user');
      expect(result.provider).toBe('local');
      expect(result.isActive).toBe(true);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with user id', async () => {
      authService.logout.mockResolvedValue(undefined);
      const user = { id: 'user-1' } as any;

      const result = await controller.logout(user);

      expect(authService.logout).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('changePassword', () => {
    it('should call userService.changePassword with correct params', async () => {
      userService.changePassword.mockResolvedValue(undefined);
      const user = { id: 'user-1' } as any;
      const dto = { currentPassword: 'old', newPassword: 'new' };

      const result = await controller.changePassword(user, dto as any);

      expect(userService.changePassword).toHaveBeenCalledWith(
        'user-1',
        'old',
        'new',
      );
      expect(result).toEqual({ message: 'Password changed successfully' });
    });
  });
});
