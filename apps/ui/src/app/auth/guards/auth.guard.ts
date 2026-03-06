import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that protects routes requiring authentication
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Allow navigation when we have a token but the profile validation is still pending.
  // This prevents a redirect-to-login flicker on cold start while still letting the AuthService
  // validate and potentially log out if the token is invalid.
  if (authService.getAccessToken()) {
    return true;
  }

  // Store intended URL for redirect after login
  const returnUrl = state.url;
  router.navigate(['/login'], { queryParams: { returnUrl } });
  return false;
};

/**
 * Guard that protects routes requiring admin role
 */
export const adminGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  if (!authService.isAdmin()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};

/**
 * Guard that prevents authenticated users from accessing (e.g., login page)
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Only block the login/register pages once the stored session has been validated.
  // This avoids trapping users on a blank/unauthorized dashboard when stale tokens exist.
  if (authService.isAuthenticated() && authService.isSessionValidated()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};

/**
 * Guard that checks if initial setup is required
 */
export const setupGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    const status = await authService.checkSetupRequired().toPromise();
    if (status?.required) {
      return true;
    }
    router.navigate(['/login']);
    return false;
  } catch {
    router.navigate(['/login']);
    return false;
  }
};
