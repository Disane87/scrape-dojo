import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError, map, switchMap, finalize } from 'rxjs/operators';
import {
    User,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    MfaChallengeResponse,
    AuthFlowResult,
    OidcConfig,
    AuthState,
    ChangePasswordRequest,
    SetupStatus,
} from '../models';

const TOKEN_KEY = 'scrape_dojo_access_token';
const REFRESH_TOKEN_KEY = 'scrape_dojo_refresh_token';
const USER_KEY = 'scrape_dojo_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private router = inject(Router);

    // Signals for reactive state
    private _user = signal<User | null>(null);
    private _isLoading = signal(false);
    private _error = signal<string | null>(null);
    private _oidcConfig = signal<OidcConfig | null>(null);
    private _isInitialized = signal(false);
    private _sessionValidated = signal(false);

    // Public computed signals
    readonly user = this._user.asReadonly();
    readonly isLoading = this._isLoading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly oidcConfig = this._oidcConfig.asReadonly();
    readonly isInitialized = this._isInitialized.asReadonly();

    /**
     * Becomes true once we successfully validated the stored session against the API.
     * Prevents app-start API calls with stale tokens (e.g. after server restart / secret rotation).
     */
    readonly isSessionValidated = this._sessionValidated.asReadonly();

    readonly isAuthenticated = computed(
        () => this._sessionValidated() && !!this._user() && !!this.getAccessToken()
    );
    readonly isAdmin = computed(() => this._user()?.role === 'admin');
    readonly displayName = computed(() => {
        const user = this._user();
        return user?.displayName || user?.username || user?.email || '';
    });

    constructor() {
        this.initializeFromStorage();
    }

    /**
     * Initialize auth state from localStorage
     */
    private initializeFromStorage(): void {
        const token = this.getAccessToken();
        const userJson = localStorage.getItem(USER_KEY);

        // Start with an unvalidated session. We'll validate below.
        this._sessionValidated.set(false);

        if (token && userJson) {
            try {
                const user = JSON.parse(userJson) as User;
                this._user.set(user);
            } catch {
                this.clearStorage();
            }
        }

        // Validate any stored session after a microtask to avoid circular dependency with the interceptor.
        queueMicrotask(() => {
            const storedToken = this.getAccessToken();
            if (!storedToken) {
                return;
            }

            this.loadUserProfile().subscribe({
                next: () => this._sessionValidated.set(true),
                error: () => this.completeLogout(),
            });
        });

        // Load OIDC config after a microtask to avoid circular dependency
        // The interceptor injects AuthService, so we can't make HTTP calls in constructor
        queueMicrotask(() => this.loadOidcConfig());
        this._isInitialized.set(true);
    }

    /**
     * Load OIDC configuration
     */
    loadOidcConfig(): void {
        console.log('[AuthService] Loading OIDC config...');
        this.http.get<OidcConfig>('/api/auth/oidc/config').subscribe({
            next: (config) => {
                console.log('[AuthService] OIDC config loaded:', config);
                this._oidcConfig.set(config);
            },
            error: (err) => {
                console.error('[AuthService] OIDC config error:', err);
                this._oidcConfig.set({ enabled: false, name: '' });
            },
        });
    }

    /**
     * Check if initial setup is required
     */
    checkSetupRequired(): Observable<SetupStatus> {
        return this.http.get<SetupStatus>('/api/auth/setup-required');
    }

    /**
     * Create initial admin user
     */
    setup(data: RegisterRequest): Observable<AuthFlowResult> {
        this._isLoading.set(true);
        this._error.set(null);

        return this.http.post<TokenResponse | MfaChallengeResponse>('/api/auth/setup', data).pipe(
            switchMap((response) => this.handleAuthOrMfaChallenge(response)),
            catchError((err) => this.handleAuthError(err)),
            finalize(() => this._isLoading.set(false))
        );
    }

    /**
     * Login with email and password
     */
    login(credentials: LoginRequest): Observable<AuthFlowResult> {
        this._isLoading.set(true);
        this._error.set(null);

        return this.http.post<TokenResponse | MfaChallengeResponse>('/api/auth/login', credentials).pipe(
            switchMap((response) => this.handleAuthOrMfaChallenge(response)),
            catchError((err) => this.handleAuthError(err)),
            finalize(() => this._isLoading.set(false))
        );
    }

    /**
     * Register new user
     */
    register(data: RegisterRequest): Observable<AuthFlowResult> {
        this._isLoading.set(true);
        this._error.set(null);

        return this.http.post<TokenResponse | MfaChallengeResponse>('/api/auth/register', data).pipe(
            switchMap((response) => this.handleAuthOrMfaChallenge(response)),
            catchError((err) => this.handleAuthError(err)),
            finalize(() => this._isLoading.set(false))
        );
    }

    private isMfaChallengeResponse(value: unknown): value is MfaChallengeResponse {
        return (
            !!value &&
            typeof value === 'object' &&
            'mfaChallengeToken' in value &&
            typeof (value as any).mfaChallengeToken === 'string'
        );
    }

    private handleAuthOrMfaChallenge(
        response: TokenResponse | MfaChallengeResponse
    ): Observable<AuthFlowResult> {
        if (this.isMfaChallengeResponse(response)) {
            return of({ type: 'mfa', challenge: response });
        }

        this.handleAuthSuccess(response);
        return this.loadUserProfile().pipe(
            tap(() => this._sessionValidated.set(true)),
            map((user) => ({ type: 'authenticated', user } as const))
        );
    }

    /**
     * Logout current user
     */
    logout(): void {
        // Only call backend logout if we have a token
        const token = this.getAccessToken();
        if (token) {
            // Call backend logout (invalidates refresh token)
            this.http.post('/api/auth/logout', {}).subscribe({
                complete: () => this.completeLogout(),
                error: () => this.completeLogout(),
            });
        } else {
            // No token, just clear local state
            this.completeLogout();
        }
    }

    /**
     * Complete logout process
     */
    private completeLogout(): void {
        this.clearStorage();
        this._user.set(null);
        this._error.set(null);
        this._sessionValidated.set(false);
        this.router.navigate(['/login']);
    }

    /**
     * Refresh access token
     */
    refreshToken(): Observable<TokenResponse> {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            return throwError(() => new Error('No refresh token'));
        }

        return this.http.post<TokenResponse>('/api/auth/refresh', { refreshToken }).pipe(
            tap((response) => {
                this.storeTokens(response);
            }),
            catchError((err) => {
                this.completeLogout();
                return throwError(() => err);
            })
        );
    }

    /**
     * Load current user profile
     */
    loadUserProfile(): Observable<User> {
        return this.http.get<User>('/api/auth/me').pipe(
            tap((user) => {
                this._user.set(user);
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                // A successful profile load means the current stored tokens are accepted by the API.
                // This is the point where the session can be treated as authenticated.
                this._sessionValidated.set(true);
            })
        );
    }

    /**
     * Change password
     */
    changePassword(data: ChangePasswordRequest): Observable<void> {
        return this.http.post<void>('/api/auth/change-password', data);
    }

    /**
     * Initiate OIDC login
     */
    loginWithOidc(redirectUrl?: string): void {
        // Use full URL for browser redirect (proxy doesn't work for window.location.href)
        const apiBaseUrl = window.location.origin;
        const url = redirectUrl
            ? `${apiBaseUrl}/api/auth/oidc/login?redirect=${encodeURIComponent(redirectUrl)}`
            : `${apiBaseUrl}/api/auth/oidc/login`;
        window.location.href = url;
    }

    /**
     * Handle OIDC callback (tokens in URL)
     * @deprecated Use OidcCallbackComponent instead
     */
    handleOidcCallback(): boolean {
        // This method is deprecated - the callback is now handled by a dedicated component
        return false;
    }

    /**
     * Get access token
     */
    getAccessToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    }

    /**
     * Get refresh token
     */
    getRefreshToken(): string | null {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    }

    /**
     * Check if token is expired
     */
    isTokenExpired(token: string): boolean {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000; // Convert to milliseconds
            return Date.now() >= exp - 30000; // 30 second buffer
        } catch {
            return true;
        }
    }

    /**
     * Handle successful authentication
     */
    private handleAuthSuccess(response: TokenResponse): void {
        this.storeTokens(response);
    }

    /**
     * Handle authentication error
     */
    private handleAuthError(err: any): Observable<never> {
        const message = err.error?.message || err.message || 'Authentication failed';
        this._error.set(message);
        return throwError(() => err);
    }

    /**
     * Store tokens in localStorage (public for OIDC callback)
     */
    storeTokens(response: TokenResponse): void {
        localStorage.setItem(TOKEN_KEY, response.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    }

    /**
     * Clear all auth storage
     */
    private clearStorage(): void {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    /**
     * Clear error
     */
    clearError(): void {
        this._error.set(null);
    }
}
