import { Injectable, signal, effect, computed } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private readonly STORAGE_KEY = 'scrape-dojo-theme';
    private readonly AUTH_TOKEN_KEY = 'scrape_dojo_access_token';

    /** Whether the app is currently in unauthenticated (guest) mode */
    private readonly guestMode = signal(this.shouldStartInGuestMode());

    /** Persisted user preference (stored in localStorage) */
    private readonly userTheme = signal<Theme>(this.getStoredTheme());

    /** Current system preference (updated via matchMedia listener) */
    private readonly systemPreference = signal<'light' | 'dark'>(this.getSystemPreference());

    /** Current theme setting (light, dark, or system). In guest mode, always 'system'. */
    readonly theme = computed<Theme>(() => (this.guestMode() ? 'system' : this.userTheme()));

    /** Resolved theme (always light or dark, based on system preference if theme is 'system') */
    readonly resolvedTheme = computed<'light' | 'dark'>(() => this.resolveTheme(this.theme()));

    constructor() {
        // Apply theme on initialization
        this.applyTheme(this.resolvedTheme());

        // Listen for system preference changes
        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e: MediaQueryListEvent) => {
                const resolved = e.matches ? 'dark' : 'light';
                this.systemPreference.set(resolved);
            };

            if (typeof mediaQuery.addEventListener === 'function') {
                mediaQuery.addEventListener('change', handler);
            } else if (typeof (mediaQuery as unknown as { addListener?: (cb: any) => void }).addListener === 'function') {
                (mediaQuery as unknown as { addListener: (cb: any) => void }).addListener(handler);
            }
        }

        // React to theme changes
        effect(() => {
            const resolved = this.resolvedTheme();
            this.applyTheme(resolved);

            // Persist only when authenticated/user mode is active.
            // In guest mode we deliberately prefer the OS theme and avoid clobbering saved prefs.
            if (!this.guestMode()) {
                const theme = this.userTheme();
                this.storeTheme(theme);
            }
        });
    }

    /** Toggle between light, dark, and system */
    cycleTheme(): void {
        const current = this.theme();
        const themeOrder: Record<Theme, Theme> = {
            light: 'dark',
            dark: 'system',
            system: 'light'
        };
        this.setTheme(themeOrder[current]);
    }

    /** Set a specific theme */
    setTheme(theme: Theme): void {
        this.userTheme.set(theme);
    }

    /**
     * Enter unauthenticated mode: follow OS preference and do not persist theme changes.
     * This should be enabled when the user is not logged in.
     */
    enterGuestMode(): void {
        this.guestMode.set(true);
    }

    /**
     * Exit unauthenticated mode.
     * Optionally locks the currently visible theme (resolved light/dark) as the user's persisted preference.
     */
    exitGuestMode(options?: { lockInResolvedTheme?: boolean }): void {
        const lockInResolvedTheme = options?.lockInResolvedTheme ?? false;
        const resolved = this.resolvedTheme();

        this.guestMode.set(false);

        if (lockInResolvedTheme) {
            this.userTheme.set(resolved);
        }
    }

    /** Check if system prefers dark mode */
    private getSystemPreference(): 'light' | 'dark' {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    private shouldStartInGuestMode(): boolean {
        if (typeof localStorage === 'undefined') return true;
        return !localStorage.getItem(this.AUTH_TOKEN_KEY);
    }

    /** Resolve theme setting to actual light/dark */
    private resolveTheme(theme: Theme): 'light' | 'dark' {
        if (theme === 'system') {
            return this.systemPreference();
        }
        return theme;
    }

    /** Apply theme to document */
    private applyTheme(theme: 'light' | 'dark'): void {
        if (typeof document === 'undefined') return;

        const html = document.documentElement;
        // Tailwind convention: light is default, dark is controlled by the "dark" class
        html.classList.toggle('dark', theme === 'dark');

        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            const bg = getComputedStyle(html).getPropertyValue('--dojo-bg').trim();
            metaThemeColor.setAttribute('content', bg || (theme === 'dark' ? '#0a0a0a' : '#fafaf9'));
        }
    }

    /** Store theme preference */
    private storeTheme(theme: Theme): void {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(this.STORAGE_KEY, theme);
    }

    /** Get stored theme preference */
    private getStoredTheme(): Theme {
        if (typeof localStorage === 'undefined') return 'system';
        const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
        return stored || 'system';
    }
}
