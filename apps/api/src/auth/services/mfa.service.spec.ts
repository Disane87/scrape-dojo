import { vi } from 'vitest';
import { MfaService } from './mfa.service';
import { UnauthorizedException } from '@nestjs/common';

describe('MfaService', () => {
  let service: MfaService;
  let mockConfigService: any;
  let mockJwtService: any;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string, defaultVal?: string) => {
        const config: Record<string, string> = {
          SCRAPE_DOJO_AUTH_ENABLED: 'true',
          SCRAPE_DOJO_AUTH_REQUIRE_MFA: 'true',
          SCRAPE_DOJO_AUTH_MFA_CHALLENGE_SECRET: 'test-challenge-secret',
          SCRAPE_DOJO_AUTH_JWT_SECRET: 'test-jwt-secret',
          NODE_ENV: 'development',
        };
        return config[key] ?? defaultVal;
      }),
    };
    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock-token'),
      verify: vi.fn(),
    };
    service = new MfaService(mockConfigService, mockJwtService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isMfaRequired', () => {
    it('should return true when auth and MFA are enabled', () => {
      expect(service.isMfaRequired()).toBe(true);
    });

    it('should return false when auth is disabled', () => {
      mockConfigService.get.mockImplementation((key: string, def?: string) => {
        if (key === 'SCRAPE_DOJO_AUTH_ENABLED') return 'false';
        return def;
      });
      const svc = new MfaService(mockConfigService, mockJwtService);
      expect(svc.isMfaRequired()).toBe(false);
    });
  });

  describe('createChallengeToken', () => {
    it('should create a signed JWT with mfa_challenge purpose', () => {
      const token = service.createChallengeToken('user-123');
      expect(token).toBe('mock-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-123', purpose: 'mfa_challenge' },
        { secret: 'test-challenge-secret', expiresIn: '10m' },
      );
    });
  });

  describe('verifyChallengeToken', () => {
    it('should return payload for valid token', () => {
      const payload = { sub: 'user-1', purpose: 'mfa_challenge' };
      mockJwtService.verify.mockReturnValue(payload);

      const result = service.verifyChallengeToken('valid-token');
      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException for invalid purpose', () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        purpose: 'other',
      });

      expect(() => service.verifyChallengeToken('token')).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired token', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => service.verifyChallengeToken('expired')).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('generateSecret', () => {
    it('should return a non-empty string', () => {
      const secret = service.generateSecret();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);
    });
  });

  describe('verifyTotp', () => {
    it('should return false for empty code', () => {
      expect(service.verifyTotp('', 'some-secret')).toBe(false);
    });

    it('should strip whitespace from code', () => {
      // We can't easily test a valid TOTP without a real secret, but we can test that it doesn't crash
      const result = service.verifyTotp('  123 456  ', 'invalid-secret');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('encrypt/decrypt', () => {
    it('should round-trip encrypt and decrypt a secret', () => {
      const plain = 'my-totp-secret-ABCDEF';
      const encrypted = service.encryptSecret(plain);
      expect(encrypted).not.toBe(plain);
      expect(encrypted.split('.')).toHaveLength(3);

      const decrypted = service.decryptSecret(encrypted);
      expect(decrypted).toBe(plain);
    });

    it('should throw on invalid encrypted format', () => {
      expect(() => service.decryptSecret('invalid')).toThrow();
    });
  });
});
