import { vi } from 'vitest';
import { of } from 'rxjs';

const mockAuthService: any = {
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  refreshToken: vi.fn(),
  logout: vi.fn(),
};

vi.mock('@angular/core', () => ({
  inject: vi.fn(() => mockAuthService),
}));

vi.mock('@angular/common/http', () => {
  class MockHttpErrorResponse {
    status: number;
    statusText: string;
    url: string;
    error: any;
    constructor(init: any = {}) {
      this.status = init.status ?? 0;
      this.statusText = init.statusText ?? '';
      this.url = init.url ?? '';
      this.error = init.error;
    }
  }
  return {
    HttpClient: class {},
    HttpErrorResponse: MockHttpErrorResponse,
    HttpRequest: class {},
  };
});

vi.mock('@angular/router', () => ({
  Router: class {},
}));

vi.mock('../services/auth.service', () => ({
  AuthService: class {},
}));

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNext = vi.fn();
  });

  function createRequest(url: string) {
    return {
      url,
      clone: vi.fn(function (this: any, opts: any) {
        return { ...this, url, headers: opts?.setHeaders || {} };
      }),
    } as any;
  }

  describe('skip auth URLs', () => {
    it('should skip auth for login endpoint', () => {
      const req = createRequest('/api/auth/login');
      mockNext.mockReturnValue(of({ type: 0 }));
      authInterceptor(req, mockNext);
      expect(mockNext).toHaveBeenCalledWith(req);
    });

    it('should skip auth for health endpoint', () => {
      const req = createRequest('/api/health');
      mockNext.mockReturnValue(of({ type: 0 }));
      authInterceptor(req, mockNext);
      expect(mockNext).toHaveBeenCalledWith(req);
    });

    it('should skip auth for static assets', () => {
      const req = createRequest('/assets/logo.png');
      mockNext.mockReturnValue(of({ type: 0 }));
      authInterceptor(req, mockNext);
      expect(mockNext).toHaveBeenCalledWith(req);
    });

    it('should skip auth for i18n files', () => {
      const req = createRequest('/i18n/en.json');
      mockNext.mockReturnValue(of({ type: 0 }));
      authInterceptor(req, mockNext);
      expect(mockNext).toHaveBeenCalledWith(req);
    });
  });

  describe('authenticated requests', () => {
    it('should add Authorization header when token exists', () => {
      const req = createRequest('/api/scrapes');
      mockAuthService.getAccessToken.mockReturnValue('my-token');
      mockNext.mockReturnValue(of({ type: 0 }));
      authInterceptor(req, mockNext);
      expect(req.clone).toHaveBeenCalledWith({
        setHeaders: { Authorization: 'Bearer my-token' },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should block request and return 401 when no token', () => {
      const req = createRequest('/api/scrapes');
      mockAuthService.getAccessToken.mockReturnValue(null);
      const result$ = authInterceptor(req, mockNext);
      return new Promise<void>((resolve, reject) => {
        result$.subscribe({
          error: (err: any) => {
            try {
              expect(err.status).toBe(401);
              expect(mockNext).not.toHaveBeenCalled();
              resolve();
            } catch (e) {
              reject(e);
            }
          },
        });
      });
    });
  });
});
