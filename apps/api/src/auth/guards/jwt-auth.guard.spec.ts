import { vi } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockReflector: any;
  let mockApiKeysService: any;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };
    mockApiKeysService = {
      validateApiKey: vi.fn(),
    };
    guard = new JwtAuthGuard(mockReflector, mockApiKeysService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  function createMockContext(overrides: any = {}): ExecutionContext {
    const request = { headers: {}, ...overrides.request };
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(request),
      }),
      ...overrides,
    } as any;
  }

  describe('canActivate', () => {
    it('should return true for public routes', () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext();

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should validate API key when x-api-key header is present', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const mockUser = { id: '1', email: 'test@test.com' };
      mockApiKeysService.validateApiKey.mockResolvedValue(mockUser);

      const request = { headers: { 'x-api-key': 'valid-key' } } as any;
      const context = createMockContext({ request });
      // Get the same request object the guard will modify
      const actualRequest = context.switchToHttp().getRequest();

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(actualRequest.user).toEqual(mockUser);
      expect(actualRequest.apiKeyAuth).toBe(true);
    });

    it('should throw UnauthorizedException for invalid API key', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockApiKeysService.validateApiKey.mockResolvedValue(null);

      const request = { headers: { 'x-api-key': 'invalid-key' } };
      const context = createMockContext({ request });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
