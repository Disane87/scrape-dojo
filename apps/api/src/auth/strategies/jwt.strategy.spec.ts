import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtStrategy } from './jwt.strategy';
import { AuthService, JwtPayload } from '../services/auth.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'user',
    isActive: true,
  };

  const mockAuthService = {
    validateJwtPayload: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: string) => {
      const values: Record<string, string> = {
        SCRAPE_DOJO_AUTH_ENABLED: 'true',
        SCRAPE_DOJO_AUTH_REQUIRE_MFA: 'true',
        SCRAPE_DOJO_AUTH_JWT_SECRET: 'test-jwt-secret',
      };
      return values[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user when payload is valid and MFA is true', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'user',
        provider: 'local',
        mfa: true,
      };
      mockAuthService.validateJwtPayload.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);
      expect(mockAuthService.validateJwtPayload).toHaveBeenCalledWith(payload);
    });

    it('should throw UnauthorizedException when MFA is required but not provided', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'user',
        provider: 'local',
        mfa: false,
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow('MFA required');
    });

    it('should throw UnauthorizedException when MFA is undefined and required', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'user',
        provider: 'local',
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'user',
        provider: 'local',
        mfa: true,
      };
      mockAuthService.validateJwtPayload.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Invalid token or user not found',
      );
    });
  });

  describe('with MFA not required', () => {
    let strategyNoMfa: JwtStrategy;

    beforeEach(async () => {
      const noMfaConfigService = {
        get: vi.fn((key: string, defaultValue?: string) => {
          const values: Record<string, string> = {
            SCRAPE_DOJO_AUTH_ENABLED: 'true',
            SCRAPE_DOJO_AUTH_REQUIRE_MFA: 'false',
            SCRAPE_DOJO_AUTH_JWT_SECRET: 'test-jwt-secret',
          };
          return values[key] ?? defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          { provide: AuthService, useValue: mockAuthService },
          { provide: ConfigService, useValue: noMfaConfigService },
        ],
      }).compile();

      strategyNoMfa = module.get<JwtStrategy>(JwtStrategy);
    });

    it('should not require MFA when SCRAPE_DOJO_AUTH_REQUIRE_MFA is false', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'user',
        provider: 'local',
        mfa: false,
      };
      mockAuthService.validateJwtPayload.mockResolvedValue(mockUser);

      const result = await strategyNoMfa.validate(payload);

      expect(result).toEqual(mockUser);
    });
  });

  describe('with auth disabled', () => {
    let strategyAuthDisabled: JwtStrategy;

    beforeEach(async () => {
      const disabledConfigService = {
        get: vi.fn((key: string, defaultValue?: string) => {
          const values: Record<string, string> = {
            SCRAPE_DOJO_AUTH_ENABLED: 'false',
            SCRAPE_DOJO_AUTH_REQUIRE_MFA: 'true',
            SCRAPE_DOJO_AUTH_JWT_SECRET: 'test-jwt-secret',
          };
          return values[key] ?? defaultValue;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          { provide: AuthService, useValue: mockAuthService },
          { provide: ConfigService, useValue: disabledConfigService },
        ],
      }).compile();

      strategyAuthDisabled = module.get<JwtStrategy>(JwtStrategy);
    });

    it('should not require MFA when auth is disabled', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'user',
        provider: 'local',
      };
      mockAuthService.validateJwtPayload.mockResolvedValue(mockUser);

      const result = await strategyAuthDisabled.validate(payload);

      expect(result).toEqual(mockUser);
    });
  });
});
