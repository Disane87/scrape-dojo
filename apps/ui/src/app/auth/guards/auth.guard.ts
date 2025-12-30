import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that protects routes requiring authentication
 */
export const authGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated()) {
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
    state: RouterStateSnapshot
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

    if (authService.isAuthenticated()) {
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
