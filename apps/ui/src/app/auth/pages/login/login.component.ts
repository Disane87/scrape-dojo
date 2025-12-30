import { Component, OnInit, inject, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';
import 'iconify-icon';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslocoModule, RouterLink],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    template: `
        <div class="min-h-screen flex items-center justify-center bg-linear-to-br from-dojo-bg via-dojo-surface to-dojo-bg px-4 py-8 relative overflow-hidden text-dojo-text">
            <!-- Decorative background elements -->
            <div class="absolute inset-0 overflow-hidden pointer-events-none">
                <div 
                    class="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl motion-safe:animate-float"
                ></div>
                <div 
                    class="absolute -bottom-40 -left-40 w-96 h-96 bg-red-500/10 rounded-full blur-3xl motion-safe:animate-float-reverse"
                ></div>
                <div 
                    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-orange-600/5 rounded-full blur-3xl motion-safe:animate-pulse-slow"
                ></div>
            </div>

            <div class="relative w-full max-w-md motion-safe:animate-[fadeInUp_0.5s_ease-out]">
                <!-- Card -->
                <div class="bg-dojo-surface backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/50 border border-dojo-border p-8">
                    <!-- Logo with glow effect -->
                    <div class="flex justify-center mb-8">
                        <div class="relative">
                            <div class="absolute inset-0 bg-orange-500/30 blur-2xl rounded-full scale-150"></div>
                            <img src="/logos/scrape-dojo-readme-logo.png" alt="Scrape Dojo" class="h-28 relative drop-shadow-2xl" />
                        </div>
                    </div>

                    <!-- Title -->
                    <h2 class="text-center text-3xl font-bold bg-linear-to-r from-orange-400 via-red-500 to-orange-400 bg-clip-text text-transparent mb-2" transloco="auth.login.title">
                        Anmelden
                    </h2>
                    <p class="text-center text-dojo-text-muted text-sm mb-8" transloco="auth.login.subtitle"></p>

                    <!-- Error Alert -->
                    @if (authService.error()) {
                        <div class="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 motion-safe:animate-[shake_0.3s_ease-in-out]">
                            <iconify-icon icon="mdi:alert-circle" class="text-xl text-red-400 shrink-0"></iconify-icon>
                            <span class="text-red-300 text-sm flex-1">{{ authService.error() }}</span>
                            <button 
                                class="text-red-400 hover:text-red-300 transition-colors p-1 rounded-lg hover:bg-red-500/20" 
                                (click)="authService.clearError()"
                            >
                                <iconify-icon icon="mdi:close" class="text-lg"></iconify-icon>
                            </button>
                        </div>
                    }

                    <!-- Login Form -->
                    <form (ngSubmit)="onSubmit()" class="space-y-5">
                        <!-- Email Field -->
                        <div class="space-y-2">
                            <label class="flex items-center gap-2 text-sm font-medium text-dojo-text">
                                <iconify-icon icon="mdi:email-outline" class="text-orange-400"></iconify-icon>
                                <span transloco="auth.login.email"></span>
                            </label>
                            <input
                                type="email"
                                [(ngModel)]="email"
                                name="email"
                                class="w-full px-4 py-3 bg-dojo-surface-2 border border-dojo-border rounded-xl text-dojo-text placeholder-dojo-text-subtle 
                                       focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 focus:bg-dojo-surface-2
                                       transition-all duration-300"
                                [placeholder]="'auth.login.emailPlaceholder' | transloco"
                                required
                                autocomplete="email"
                            />
                        </div>

                        <!-- Password Field -->
                        <div class="space-y-2">
                            <label class="flex items-center gap-2 text-sm font-medium text-dojo-text">
                                <iconify-icon icon="mdi:lock-outline" class="text-orange-400"></iconify-icon>
                                <span transloco="auth.login.password"></span>
                            </label>
                            <input
                                type="password"
                                [(ngModel)]="password"
                                name="password"
                                class="w-full px-4 py-3 bg-dojo-surface-2 border border-dojo-border rounded-xl text-dojo-text placeholder-dojo-text-subtle 
                                       focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 focus:bg-dojo-surface-2
                                       transition-all duration-300"
                                [placeholder]="'auth.login.passwordPlaceholder' | transloco"
                                required
                                autocomplete="current-password"
                            />
                        </div>

                        <!-- Submit Button -->
                        <button
                            type="submit"
                            class="w-full mt-6 px-6 py-3.5 bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400
                                   text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25
                                   hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98]
                                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                                   transition-all duration-300 flex items-center justify-center gap-2"
                            [disabled]="authService.isLoading() || !isValid()"
                        >
                            @if (authService.isLoading()) {
                                <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            } @else {
                                <iconify-icon icon="mdi:login" class="text-lg"></iconify-icon>
                            }
                            <span transloco="auth.login.submit"></span>
                        </button>
                    </form>

                    <!-- OIDC Login -->
                    @if (authService.oidcConfig()?.enabled) {
                        <div class="flex items-center gap-4 my-6">
                            <div class="flex-1 h-px bg-dojo-border"></div>
                            <span class="text-dojo-text-subtle text-sm" transloco="auth.login.or"></span>
                            <div class="flex-1 h-px bg-dojo-border"></div>
                        </div>
                        <button
                            class="w-full px-6 py-3 border border-dojo-border hover:border-dojo-border bg-dojo-surface-2 hover:bg-dojo-surface-2
                                   text-dojo-text-muted hover:text-dojo-text font-medium rounded-xl
                                   hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 
                                   flex items-center justify-center gap-2"
                            (click)="loginWithOidc()"
                            [disabled]="authService.isLoading()"
                        >
                            <iconify-icon icon="mdi:shield-key-outline" class="text-lg"></iconify-icon>
                            <span>{{ 'auth.login.oidc' | transloco: { provider: authService.oidcConfig()?.name } }}</span>
                        </button>
                    }

                    <!-- Register Link -->
                    <div class="text-center mt-8 pt-6 border-t border-dojo-border">
                        <span class="text-sm text-dojo-text-muted" transloco="auth.login.noAccount"></span>
                        <a routerLink="/register" 
                           class="ml-1 text-orange-400 hover:text-orange-300 font-semibold transition-colors" 
                           transloco="auth.login.register">
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class LoginComponent implements OnInit {
    authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    email = '';
    password = '';
    private returnUrl = '/';

    ngOnInit(): void {
        // Get return URL from query params
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        
        // Ensure OIDC config is loaded
        if (!this.authService.oidcConfig()) {
            this.authService.loadOidcConfig();
        }
    }

    isValid(): boolean {
        return this.email.length > 0 && this.password.length >= 8;
    }

    onSubmit(): void {
        if (!this.isValid()) return;

        this.authService.login({ email: this.email, password: this.password }).subscribe({
            next: (result) => {
                if (result.type === 'mfa') {
                    this.router.navigate(['/mfa'], {
                        queryParams: {
                            mfa_challenge_token: result.challenge.mfaChallengeToken,
                            mfa_setup_required: result.challenge.mfaSetupRequired ? '1' : '0',
                            returnUrl: this.returnUrl,
                        },
                    });
                    return;
                }

                this.router.navigate([this.returnUrl]);
            },
        });
    }

    loginWithOidc(): void {
        this.authService.loginWithOidc(this.returnUrl);
    }
}
