import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OidcService } from './oidc.service';

// Mock the openid-client module
vi.mock('openid-client', () => ({
  discovery: vi.fn(),
  randomPKCECodeVerifier: vi.fn(() => 'mock-code-verifier'),
  calculatePKCECodeChallenge: vi.fn(async () => 'mock-code-challenge'),
  buildAuthorizationUrl: vi.fn(
    () => new URL('https://provider.example.com/authorize?code_challenge=mock'),
  ),
  authorizationCodeGrant: vi.fn(),
  fetchUserInfo: vi.fn(),
}));

import * as openidClient from 'openid-client';

describe('OidcService', () => {
  let service: OidcService;

  const mockConfigValues: Record<string, string> = {
    SCRAPE_DOJO_AUTH_OIDC_ENABLED: 'false',
    SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL: 'https://issuer.example.com',
    SCRAPE_DOJO_AUTH_OIDC_CLIENT_ID: 'test-client-id',
    SCRAPE_DOJO_AUTH_OIDC_CLIENT_SECRET: 'test-client-secret',
    SCRAPE_DOJO_AUTH_OIDC_REDIRECT_URI:
      'http://localhost:3000/auth/oidc/callback',
    SCRAPE_DOJO_AUTH_OIDC_SCOPES: 'openid profile email',
    SCRAPE_DOJO_AUTH_OIDC_PROVIDER_NAME: 'Test Provider',
  };

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: string) => {
      return mockConfigValues[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OidcService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OidcService>(OidcService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isEnabled', () => {
    it('should return false when OIDC is disabled', () => {
      expect(service.isEnabled()).toBe(false);
    });

    it('should return false when enabled but config not discovered yet', () => {
      // Even if oidcConfig.enabled is set, config (openid-client Configuration) is null
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('getProviderInfo', () => {
    it('should return disabled info when OIDC is not enabled', () => {
      const info = service.getProviderInfo();

      expect(info).toEqual({ enabled: false, name: '' });
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should throw BadRequestException when OIDC is not configured', async () => {
      await expect(service.getAuthorizationUrl('test-state')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleCallback', () => {
    it('should throw BadRequestException when OIDC is not configured', async () => {
      await expect(service.handleCallback('code', 'state')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('onModuleInit - disabled', () => {
    it('should not attempt discovery when disabled', async () => {
      await service.onModuleInit();

      expect(openidClient.discovery).not.toHaveBeenCalled();
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('with OIDC enabled and configured', () => {
    let enabledService: OidcService;
    const mockConfig = { serverMetadata: vi.fn() };

    beforeEach(async () => {
      const enabledConfigValues: Record<string, string> = {
        ...mockConfigValues,
        SCRAPE_DOJO_AUTH_OIDC_ENABLED: 'true',
      };

      const enabledConfigService = {
        get: vi.fn((key: string, defaultValue?: string) => {
          return enabledConfigValues[key] ?? defaultValue;
        }),
      };

      vi.mocked(openidClient.discovery).mockResolvedValue(mockConfig as any);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OidcService,
          {
            provide: ConfigService,
            useValue: enabledConfigService,
          },
        ],
      }).compile();

      enabledService = module.get<OidcService>(OidcService);
      await enabledService.onModuleInit();
    });

    it('isEnabled should return true after successful discovery', () => {
      expect(enabledService.isEnabled()).toBe(true);
    });

    it('getProviderInfo should return enabled info', () => {
      const info = enabledService.getProviderInfo();

      expect(info).toEqual({
        enabled: true,
        name: 'Test Provider',
        loginUrl: '/auth/oidc/login',
      });
    });

    it('getAuthorizationUrl should generate URL with PKCE', async () => {
      const url = await enabledService.getAuthorizationUrl('my-state');

      expect(openidClient.randomPKCECodeVerifier).toHaveBeenCalled();
      expect(openidClient.calculatePKCECodeChallenge).toHaveBeenCalledWith(
        'mock-code-verifier',
      );
      expect(openidClient.buildAuthorizationUrl).toHaveBeenCalledWith(
        mockConfig,
        expect.objectContaining({
          redirect_uri: 'http://localhost:3000/auth/oidc/callback',
          scope: 'openid profile email',
          state: 'my-state',
          code_challenge: 'mock-code-challenge',
          code_challenge_method: 'S256',
        }),
      );
      expect(url).toBe(
        'https://provider.example.com/authorize?code_challenge=mock',
      );
    });

    it('handleCallback should throw when state has no stored verifier', async () => {
      await expect(
        enabledService.handleCallback('code', 'unknown-state'),
      ).rejects.toThrow(BadRequestException);
    });

    it('handleCallback should exchange code for tokens and return user info', async () => {
      // First generate an auth URL to store the code verifier
      await enabledService.getAuthorizationUrl('valid-state');

      const mockTokens = {
        claims: () => ({
          sub: 'oidc-user-1',
          email: 'user@example.com',
          name: 'Test User',
          preferred_username: 'testuser',
          picture: 'https://example.com/pic.jpg',
          iss: 'https://issuer.example.com',
        }),
        access_token: 'mock-access-token',
      };
      vi.mocked(openidClient.authorizationCodeGrant).mockResolvedValue(
        mockTokens as any,
      );

      const result = await enabledService.handleCallback(
        'auth-code',
        'valid-state',
      );

      expect(result).toEqual({
        sub: 'oidc-user-1',
        email: 'user@example.com',
        name: 'Test User',
        preferred_username: 'testuser',
        picture: 'https://example.com/pic.jpg',
        iss: 'https://issuer.example.com',
      });
    });

    it('handleCallback should fetch userinfo when email is not in claims', async () => {
      await enabledService.getAuthorizationUrl('state-no-email');

      const mockTokens = {
        claims: () => ({
          sub: 'oidc-user-2',
          email: '',
          iss: 'https://issuer.example.com',
        }),
        access_token: 'mock-access-token',
      };
      vi.mocked(openidClient.authorizationCodeGrant).mockResolvedValue(
        mockTokens as any,
      );
      vi.mocked(openidClient.fetchUserInfo).mockResolvedValue({
        sub: 'oidc-user-2',
        email: 'fetched@example.com',
        name: 'Fetched User',
        picture: 'https://example.com/fetched-pic.jpg',
      } as any);

      const result = await enabledService.handleCallback(
        'auth-code',
        'state-no-email',
      );

      expect(openidClient.fetchUserInfo).toHaveBeenCalled();
      expect(result.email).toBe('fetched@example.com');
    });

    it('handleCallback should throw when email is not available from any source', async () => {
      await enabledService.getAuthorizationUrl('state-missing-email');

      const mockTokens = {
        claims: () => ({
          sub: 'oidc-user-3',
          email: '',
          iss: 'https://issuer.example.com',
        }),
        access_token: 'mock-access-token',
      };
      vi.mocked(openidClient.authorizationCodeGrant).mockResolvedValue(
        mockTokens as any,
      );
      vi.mocked(openidClient.fetchUserInfo).mockResolvedValue({
        sub: 'oidc-user-3',
        email: '',
      } as any);

      await expect(
        enabledService.handleCallback('code', 'state-missing-email'),
      ).rejects.toThrow(BadRequestException);
    });

    it('handleCallback should throw when claims are null', async () => {
      await enabledService.getAuthorizationUrl('state-no-claims');

      const mockTokens = {
        claims: () => null,
        access_token: 'mock-access-token',
      };
      vi.mocked(openidClient.authorizationCodeGrant).mockResolvedValue(
        mockTokens as any,
      );

      await expect(
        enabledService.handleCallback('code', 'state-no-claims'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('onModuleInit - missing config', () => {
    it('should disable OIDC when issuer URL is missing', async () => {
      const missingIssuerConfig = {
        get: vi.fn((key: string, defaultValue?: string) => {
          if (key === 'SCRAPE_DOJO_AUTH_OIDC_ENABLED') return 'true';
          if (key === 'SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL') return '';
          if (key === 'SCRAPE_DOJO_AUTH_OIDC_CLIENT_ID') return 'client-id';
          return defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          OidcService,
          { provide: ConfigService, useValue: missingIssuerConfig },
        ],
      }).compile();

      const svc = module.get<OidcService>(OidcService);
      await svc.onModuleInit();

      expect(svc.isEnabled()).toBe(false);
    });
  });

  describe('onModuleInit - discovery failure', () => {
    it('should disable OIDC when discovery fails', async () => {
      const enabledConfig = {
        get: vi.fn((key: string, defaultValue?: string) => {
          if (key === 'SCRAPE_DOJO_AUTH_OIDC_ENABLED') return 'true';
          if (key === 'SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL')
            return 'https://issuer.example.com';
          if (key === 'SCRAPE_DOJO_AUTH_OIDC_CLIENT_ID') return 'client-id';
          return defaultValue;
        }),
      };

      vi.mocked(openidClient.discovery).mockRejectedValue(
        new Error('Network error'),
      );

      const module = await Test.createTestingModule({
        providers: [
          OidcService,
          { provide: ConfigService, useValue: enabledConfig },
        ],
      }).compile();

      const svc = module.get<OidcService>(OidcService);
      await svc.onModuleInit();

      expect(svc.isEnabled()).toBe(false);
    });
  });

  describe('getLogoutUrl', () => {
    it('should return null when config is not set', () => {
      const result = service.getLogoutUrl();
      expect(result).toBeNull();
    });
  });

  describe('with OIDC enabled - getLogoutUrl', () => {
    let enabledService: OidcService;
    const mockConfig = { serverMetadata: vi.fn() };

    beforeEach(async () => {
      const enabledConfigValues: Record<string, string> = {
        ...mockConfigValues,
        SCRAPE_DOJO_AUTH_OIDC_ENABLED: 'true',
      };

      const enabledConfigService = {
        get: vi.fn((key: string, defaultValue?: string) => {
          return enabledConfigValues[key] ?? defaultValue;
        }),
      };

      vi.mocked(openidClient.discovery).mockResolvedValue(mockConfig as any);

      const module = await Test.createTestingModule({
        providers: [
          OidcService,
          { provide: ConfigService, useValue: enabledConfigService },
        ],
      }).compile();

      enabledService = module.get<OidcService>(OidcService);
      await enabledService.onModuleInit();
    });

    it('should return null when no end_session_endpoint', () => {
      mockConfig.serverMetadata.mockReturnValue({});
      const result = enabledService.getLogoutUrl();
      expect(result).toBeNull();
    });

    it('should return logout URL with id_token_hint', () => {
      mockConfig.serverMetadata.mockReturnValue({
        end_session_endpoint: 'https://provider.example.com/logout',
      });
      const result = enabledService.getLogoutUrl('my-id-token');
      expect(result).toContain('id_token_hint=my-id-token');
      expect(result).toContain('https://provider.example.com/logout');
    });

    it('should return logout URL with post_logout_redirect_uri', () => {
      mockConfig.serverMetadata.mockReturnValue({
        end_session_endpoint: 'https://provider.example.com/logout',
      });
      const result = enabledService.getLogoutUrl(
        undefined,
        'http://localhost:3000',
      );
      expect(result).toContain('post_logout_redirect_uri=');
      expect(result).not.toContain('id_token_hint');
    });

    it('should return logout URL with both parameters', () => {
      mockConfig.serverMetadata.mockReturnValue({
        end_session_endpoint: 'https://provider.example.com/logout',
      });
      const result = enabledService.getLogoutUrl(
        'token-123',
        'http://localhost:3000',
      );
      expect(result).toContain('id_token_hint=token-123');
      expect(result).toContain('post_logout_redirect_uri=');
    });

    it('should return logout URL with no parameters', () => {
      mockConfig.serverMetadata.mockReturnValue({
        end_session_endpoint: 'https://provider.example.com/logout',
      });
      const result = enabledService.getLogoutUrl();
      expect(result).toBe('https://provider.example.com/logout?');
    });
  });

  describe('with OIDC enabled - handleCallback extra params', () => {
    let enabledService: OidcService;
    const mockConfig = { serverMetadata: vi.fn() };

    beforeEach(async () => {
      const enabledConfigValues: Record<string, string> = {
        ...mockConfigValues,
        SCRAPE_DOJO_AUTH_OIDC_ENABLED: 'true',
      };

      const enabledConfigService = {
        get: vi.fn((key: string, defaultValue?: string) => {
          return enabledConfigValues[key] ?? defaultValue;
        }),
      };

      vi.mocked(openidClient.discovery).mockResolvedValue(mockConfig as any);

      const module = await Test.createTestingModule({
        providers: [
          OidcService,
          { provide: ConfigService, useValue: enabledConfigService },
        ],
      }).compile();

      enabledService = module.get<OidcService>(OidcService);
      await enabledService.onModuleInit();
    });

    it('should skip empty and code/state extra callback params', async () => {
      await enabledService.getAuthorizationUrl('state-extra');

      const mockTokens = {
        claims: () => ({
          sub: 'user-1',
          email: 'user@example.com',
          name: 'User',
          iss: 'https://issuer.example.com',
        }),
        access_token: 'token',
      };
      vi.mocked(openidClient.authorizationCodeGrant).mockResolvedValue(
        mockTokens as any,
      );

      const result = await enabledService.handleCallback(
        'code',
        'state-extra',
        {
          code: 'should-skip',
          state: 'should-skip',
          iss: 'https://issuer.example.com',
          empty_param: '',
        },
      );

      expect(result.email).toBe('user@example.com');
    });

    it('should handle fetchUserInfo failure gracefully', async () => {
      await enabledService.getAuthorizationUrl('state-fetch-fail');

      const mockTokens = {
        claims: () => ({
          sub: 'user-1',
          email: '',
          iss: 'https://issuer.example.com',
        }),
        access_token: 'token',
      };
      vi.mocked(openidClient.authorizationCodeGrant).mockResolvedValue(
        mockTokens as any,
      );
      vi.mocked(openidClient.fetchUserInfo).mockRejectedValue(
        new Error('network error'),
      );

      // Should throw because email is still empty after fetch failure
      await expect(
        enabledService.handleCallback('code', 'state-fetch-fail'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle authorizationCodeGrant failure', async () => {
      await enabledService.getAuthorizationUrl('state-grant-fail');

      vi.mocked(openidClient.authorizationCodeGrant).mockRejectedValue(
        new Error('grant failed'),
      );

      await expect(
        enabledService.handleCallback('code', 'state-grant-fail'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('onModuleInit - missing client ID', () => {
    it('should disable OIDC when client ID is missing', async () => {
      const missingClientConfig = {
        get: vi.fn((key: string, defaultValue?: string) => {
          if (key === 'SCRAPE_DOJO_AUTH_OIDC_ENABLED') return 'true';
          if (key === 'SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL')
            return 'https://issuer.example.com';
          if (key === 'SCRAPE_DOJO_AUTH_OIDC_CLIENT_ID') return '';
          return defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          OidcService,
          { provide: ConfigService, useValue: missingClientConfig },
        ],
      }).compile();

      const svc = module.get<OidcService>(OidcService);
      await svc.onModuleInit();

      expect(svc.isEnabled()).toBe(false);
    });
  });

  describe('onModuleInit - no client secret', () => {
    it('should pass undefined for empty client secret', async () => {
      const noSecretConfig = {
        get: vi.fn((key: string, defaultValue?: string) => {
          if (key === 'SCRAPE_DOJO_AUTH_OIDC_ENABLED') return 'true';
          if (key === 'SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL')
            return 'https://issuer.example.com';
          if (key === 'SCRAPE_DOJO_AUTH_OIDC_CLIENT_ID') return 'client-id';
          if (key === 'SCRAPE_DOJO_AUTH_OIDC_CLIENT_SECRET') return '';
          return defaultValue;
        }),
      };

      const mockDiscoveryConfig = { serverMetadata: vi.fn() };
      vi.mocked(openidClient.discovery).mockResolvedValue(
        mockDiscoveryConfig as any,
      );

      const module = await Test.createTestingModule({
        providers: [
          OidcService,
          { provide: ConfigService, useValue: noSecretConfig },
        ],
      }).compile();

      const svc = module.get<OidcService>(OidcService);
      await svc.onModuleInit();

      expect(openidClient.discovery).toHaveBeenCalledWith(
        expect.any(URL),
        'client-id',
        undefined,
      );
    });
  });
});
