import { vi } from 'vitest';
import { LocalStrategy } from './local.strategy';
import { UnauthorizedException } from '@nestjs/common';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let mockUserService: any;

  beforeEach(() => {
    mockUserService = {
      validateLocalUser: vi.fn(),
    };
    strategy = new LocalStrategy(mockUserService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user on successful validation', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      mockUserService.validateLocalUser.mockResolvedValue(mockUser);

      const result = await strategy.validate('test@test.com', 'password123');
      expect(result).toBe(mockUser);
      expect(mockUserService.validateLocalUser).toHaveBeenCalledWith(
        'test@test.com',
        'password123',
      );
    });

    it('should throw UnauthorizedException on validation failure', async () => {
      mockUserService.validateLocalUser.mockRejectedValue(
        new Error('Invalid credentials'),
      );

      await expect(strategy.validate('bad@test.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
