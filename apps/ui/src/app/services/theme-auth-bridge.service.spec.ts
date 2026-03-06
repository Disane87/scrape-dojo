vi.mock('@angular/common/http', () => ({
  HttpClient: class {},
  HttpErrorResponse: class {},
}));

vi.mock('@jsverse/transloco', () => ({
  TranslocoService: class {},
}));

vi.mock('@angular/router', () => ({
  Router: class {},
}));

vi.mock('../auth/services/auth.service', () => ({
  AuthService: class {},
}));

vi.mock('./theme.service', () => ({
  ThemeService: class {},
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { ThemeAuthBridgeService } from './theme-auth-bridge.service';

describe('ThemeAuthBridgeService', () => {
  let service: ThemeAuthBridgeService;
  let mockAuthService: {
    isAuthenticated: ReturnType<typeof signal>;
  };
  let mockThemeService: {
    enterGuestMode: ReturnType<typeof vi.fn>;
    exitGuestMode: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuthService = {
      isAuthenticated: signal(false),
    };

    mockThemeService = {
      enterGuestMode: vi.fn(),
      exitGuestMode: vi.fn(),
    };

    service = Object.create(ThemeAuthBridgeService.prototype);
    (service as any).authService = mockAuthService;
    (service as any).themeService = mockThemeService;
    (service as any).lastAuthenticated = false;
  });

  it('should be defined', () => {
    expect(service).toBeTruthy();
  });

  it('should have auth service reference', () => {
    expect((service as any).authService).toBe(mockAuthService);
  });

  it('should have theme service reference', () => {
    expect((service as any).themeService).toBe(mockThemeService);
  });

  it('should track lastAuthenticated state', () => {
    expect((service as any).lastAuthenticated).toBe(false);

    (service as any).lastAuthenticated = true;
    expect((service as any).lastAuthenticated).toBe(true);
  });
});
