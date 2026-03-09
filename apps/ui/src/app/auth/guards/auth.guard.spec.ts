import { vi } from 'vitest';
import { of, throwError } from 'rxjs';

const mockAuthService: any = {
  getAccessToken: vi.fn(),
  isAuthenticated: vi.fn(),
  isAdmin: vi.fn(),
  isSessionValidated: vi.fn(),
  checkSetupRequired: vi.fn(),
};
const mockRouter: any = {
  navigate: vi.fn(),
};

let injectCallCount = 0;

vi.mock('@angular/core', () => ({
  inject: vi.fn(() => {
    injectCallCount++;
    if (injectCallCount % 2 === 1) return mockAuthService;
    return mockRouter;
  }),
}));

vi.mock('@angular/router', () => ({
  Router: class {},
}));

vi.mock('../services/auth.service', () => ({
  AuthService: class {},
}));

import { authGuard, adminGuard, guestGuard, setupGuard } from './auth.guard';

describe('Auth Guards', () => {
  const mockRoute: any = {};
  const mockState: any = { url: '/dashboard' };

  beforeEach(() => {
    vi.clearAllMocks();
    injectCallCount = 0;
  });

  describe('authGuard', () => {
    it('should return true when user has access token', () => {
      mockAuthService.getAccessToken.mockReturnValue('valid-token');
      const result = authGuard(mockRoute, mockState);
      expect(result).toBe(true);
    });

    it('should redirect to login when no access token', () => {
      mockAuthService.getAccessToken.mockReturnValue(null);
      const result = authGuard(mockRoute, mockState);
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/dashboard' },
      });
    });
  });

  describe('adminGuard', () => {
    it('should return true for admin users', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.isAdmin.mockReturnValue(true);
      const result = adminGuard(mockRoute, mockState);
      expect(result).toBe(true);
    });

    it('should redirect to login when not authenticated', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);
      const result = adminGuard(mockRoute, mockState);
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/dashboard' },
      });
    });

    it('should redirect to home when not admin', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.isAdmin.mockReturnValue(false);
      const result = adminGuard(mockRoute, mockState);
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('guestGuard', () => {
    it('should return true when not authenticated', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);
      mockAuthService.isSessionValidated.mockReturnValue(false);
      const result = guestGuard(mockRoute, mockState);
      expect(result).toBe(true);
    });

    it('should redirect to home when authenticated and validated', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.isSessionValidated.mockReturnValue(true);
      const result = guestGuard(mockRoute, mockState);
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should allow when authenticated but session not validated', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.isSessionValidated.mockReturnValue(false);
      const result = guestGuard(mockRoute, mockState);
      expect(result).toBe(true);
    });
  });

  describe('setupGuard', () => {
    it('should return true when setup is required', async () => {
      mockAuthService.checkSetupRequired.mockReturnValue(
        of({ required: true }),
      );
      const result = await setupGuard(mockRoute, mockState);
      expect(result).toBe(true);
    });

    it('should redirect to login when setup not required', async () => {
      mockAuthService.checkSetupRequired.mockReturnValue(
        of({ required: false }),
      );
      const result = await setupGuard(mockRoute, mockState);
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should redirect to login on error', async () => {
      mockAuthService.checkSetupRequired.mockReturnValue(
        throwError(() => new Error('Network error')),
      );
      const result = await setupGuard(mockRoute, mockState);
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
