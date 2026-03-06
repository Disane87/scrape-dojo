import { vi } from 'vitest';
import { RolesGuard } from './roles.guard';
import { ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let mockReflector: any;

  beforeEach(() => {
    mockReflector = { getAllAndOverride: vi.fn() };
    guard = new RolesGuard(mockReflector);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function createMockContext(user: any = null) {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user }),
      }),
    } as any;
  }

  it('should return true when no roles required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    expect(guard.canActivate(createMockContext())).toBe(true);
  });

  it('should return true when roles array is empty', () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(createMockContext())).toBe(true);
  });

  it('should throw ForbiddenException when no user', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);
    expect(() => guard.canActivate(createMockContext(null))).toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when user lacks role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);
    expect(() =>
      guard.canActivate(createMockContext({ role: 'user' })),
    ).toThrow(ForbiddenException);
  });

  it('should return true when user has required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);
    expect(guard.canActivate(createMockContext({ role: 'admin' }))).toBe(true);
  });

  it('should accept any of the required roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin', 'editor']);
    expect(guard.canActivate(createMockContext({ role: 'editor' }))).toBe(true);
  });
});
