import { vi } from 'vitest';
import { ApiKeyGuard } from './api-key.guard';
import { ForbiddenException } from '@nestjs/common';

describe('ApiKeyGuard', () => {
  let mockReflector: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockReflector = { getAllAndOverride: vi.fn() };
    vi.clearAllMocks();
  });

  function createGuard(apiKey?: string, authEnabled = 'true') {
    mockConfigService = {
      get: vi.fn((key: string, defaultVal?: string) => {
        if (key === 'SCRAPE_DOJO_AUTH_API_KEY') return apiKey;
        if (key === 'SCRAPE_DOJO_AUTH_ENABLED') return authEnabled;
        return defaultVal;
      }),
    };
    return new ApiKeyGuard(mockReflector, mockConfigService);
  }

  function createMockContext(headers: Record<string, string> = {}) {
    const request = { headers, apiKeyAuth: undefined };
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(request),
      }),
      _request: request,
    } as any;
  }

  it('should return true for public routes', () => {
    const guard = createGuard('my-key');
    mockReflector.getAllAndOverride.mockReturnValue(true);
    expect(guard.canActivate(createMockContext())).toBe(true);
  });

  it('should return true when no API key configured', () => {
    const guard = createGuard(undefined);
    mockReflector.getAllAndOverride.mockReturnValue(false);
    expect(guard.canActivate(createMockContext())).toBe(true);
  });

  it('should return true and set flag when API key matches', () => {
    const guard = createGuard('secret-key');
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const ctx = createMockContext({ 'x-api-key': 'secret-key' });
    expect(guard.canActivate(ctx)).toBe(true);
    expect(ctx._request.apiKeyAuth).toBe(true);
  });

  it('should throw ForbiddenException when auth disabled and key required but not provided', () => {
    const guard = createGuard('secret-key', 'false');
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const ctx = createMockContext({});
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should return true when key does not match but auth is enabled', () => {
    const guard = createGuard('secret-key', 'true');
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const ctx = createMockContext({ 'x-api-key': 'wrong-key' });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
