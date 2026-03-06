import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, ReplaySubject } from 'rxjs';
import { catchError, take, switchMap, finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

// Track if we're currently refreshing
let isRefreshing = false;
let refreshTokenSubject = new ReplaySubject<string>(1);

/**
 * HTTP Interceptor that adds JWT token to requests
 * and handles token refresh on 401 errors
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);

  // Skip auth for these endpoints (public routes)
  const skipAuthUrls = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/setup',
    '/api/auth/mfa/setup',
    '/api/auth/mfa/complete',
    '/api/auth/setup-required',
    '/api/auth/oidc/config',
    '/api/auth/oidc/login',
    '/api/auth/oidc/callback',
    '/api/auth/logout',
    '/api/health',
    // Static assets
    '/assets/',
    '/i18n/',
    '.json',
  ];

  const shouldSkip = skipAuthUrls.some((url) => req.url.includes(url));

  if (shouldSkip) {
    return next(req);
  }

  // Block requests if not authenticated (no token)
  const token = authService.getAccessToken();
  if (!token) {
    // Don't make the request at all - return an error
    console.warn(
      `[AuthInterceptor] Blocked unauthenticated request to: ${req.url}`,
    );
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 401,
          statusText: 'Unauthorized',
          url: req.url,
          error: { message: 'Not authenticated' },
        }),
    );
  }

  // Add token to request
  const authReq = addTokenToRequest(req, token);

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return handle401Error(authReq, next, authService);
      }
      return throwError(() => error);
    }),
  );
};

/**
 * Add Bearer token to request headers
 */
function addTokenToRequest(
  req: HttpRequest<unknown>,
  token: string,
): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Handle 401 errors by refreshing the token
 */
function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
): Observable<HttpEvent<unknown>> {
  // Don't try to refresh if there's no refresh token
  const refreshToken = authService.getRefreshToken();
  if (!refreshToken) {
    authService.logout();
    return throwError(() => new HttpErrorResponse({ status: 401 }));
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject = new ReplaySubject<string>(1);

    return authService.refreshToken().pipe(
      switchMap((tokens) => {
        isRefreshing = false;
        refreshTokenSubject.next(tokens.accessToken);
        refreshTokenSubject.complete();
        return next(addTokenToRequest(req, tokens.accessToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshTokenSubject.error(err);
        const status =
          err instanceof HttpErrorResponse ? err.status : (err as any)?.status;
        if (status === 401 || status === 403) {
          authService.logout();
        }
        return throwError(() => err);
      }),
      finalize(() => {
        isRefreshing = false;
      }),
    );
  }

  // Wait for token refresh to complete
  return refreshTokenSubject.pipe(
    take(1),
    switchMap((token) => next(addTokenToRequest(req, token))),
  );
}
