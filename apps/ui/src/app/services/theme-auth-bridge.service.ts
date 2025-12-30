import { Injectable, effect, inject } from '@angular/core';
import { AuthService } from '../auth/services/auth.service';
import { ThemeService } from './theme.service';

@Injectable({ providedIn: 'root' })
export class ThemeAuthBridgeService {
    private authService = inject(AuthService);
    private themeService = inject(ThemeService);

    private lastAuthenticated = this.authService.isAuthenticated();

    constructor() {
        effect(() => {
            const authenticated = this.authService.isAuthenticated();

            if (!authenticated) {
                this.themeService.enterGuestMode();
            } else {
                // Only lock in the current (OS-derived) theme on the transition from guest -> authenticated.
                // If we're already authenticated on page load, keep the persisted preference as-is.
                const lockInResolvedTheme = !this.lastAuthenticated;
                this.themeService.exitGuestMode({ lockInResolvedTheme });
            }

            this.lastAuthenticated = authenticated;
        });
    }
}
