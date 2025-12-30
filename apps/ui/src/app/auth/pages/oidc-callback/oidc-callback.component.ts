import { Component, OnInit, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';
import 'iconify-icon';

@Component({
  selector: 'app-oidc-callback',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-[var(--dojo-bg)] via-[var(--dojo-surface)] to-[var(--dojo-bg)] flex items-center justify-center text-[var(--dojo-text)]">
      <div class="bg-[var(--dojo-surface)] backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/50 border border-[var(--dojo-border)] p-8 max-w-md w-full mx-4">
        <div class="text-center">
          <!-- Logo -->
          <div class="flex justify-center mb-6">
            <div class="relative">
              <div class="absolute inset-0 bg-orange-500/30 blur-2xl rounded-full scale-150"></div>
              <img src="/logos/scrape-dojo-readme-logo.png" alt="Scrape Dojo" class="h-20 relative drop-shadow-2xl" />
            </div>
          </div>

          <!-- Loading State -->
          @if (isProcessing) {
            <div class="flex flex-col items-center gap-4">
              <svg class="animate-spin h-8 w-8 text-orange-500" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h2 class="text-lg font-semibold text-[var(--dojo-text)]">{{ 'auth.oidc_callback.processing_title' | transloco }}</h2>
              <p class="text-[var(--dojo-text-muted)] text-sm">{{ 'auth.oidc_callback.processing_subtitle' | transloco }}</p>
            </div>
          }

          <!-- Error State -->
          @if (errorMessage) {
            <div class="flex flex-col items-center gap-4">
              <iconify-icon icon="mdi:alert-circle" class="text-4xl text-red-400"></iconify-icon>
              <h2 class="text-lg font-semibold text-red-300">{{ 'auth.oidc_callback.failed_title' | transloco }}</h2>
              <p class="text-red-400 text-sm">{{ errorMessage }}</p>
              <button 
                class="mt-4 px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors"
                (click)="backToLogin()"
              >
                {{ 'auth.oidc_callback.back_to_login' | transloco }}
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class OidcCallbackComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private transloco = inject(TranslocoService);

  isProcessing = true;
  errorMessage = '';

  ngOnInit(): void {
    this.processCallback();
  }

  private processCallback(): void {
    // Get query parameters
    const params = this.route.snapshot.queryParams;
    const accessToken = params['access_token'];
    const refreshToken = params['refresh_token'];
    const expiresIn = params['expires_in'];
    const mfaChallengeToken = params['mfa_challenge_token'];
    const mfaSetupRequired = params['mfa_setup_required'];
    const error = params['auth_error'];

    if (error) {
      this.errorMessage = decodeURIComponent(error);
      this.isProcessing = false;
      return;
    }

    if (mfaChallengeToken) {
      const returnUrl = params['return_url'] ? decodeURIComponent(params['return_url']) : '/';
      this.router.navigate(['/mfa'], {
        queryParams: {
          mfa_challenge_token: mfaChallengeToken,
          mfa_setup_required: mfaSetupRequired ?? '0',
          return_url: encodeURIComponent(returnUrl),
        },
      });
      return;
    }

    if (accessToken && refreshToken) {
      // Store tokens and load user profile
      const tokenResponse = {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: parseInt(expiresIn || '900', 10),
      };

      // Store tokens in AuthService
      this.authService.storeTokens(tokenResponse);

      // Load user profile
      this.authService.loadUserProfile().subscribe({
        next: () => {
          // Get return URL from query parameter
          const returnUrl = params['return_url'] ? decodeURIComponent(params['return_url']) : '/';
          this.router.navigate([returnUrl]);
        },
        error: (err) => {
          console.error('Failed to load user profile:', err);
          this.errorMessage = this.transloco.translate('auth.oidc_callback.profile_load_failed');
          this.isProcessing = false;
        },
      });
    } else {
      this.errorMessage = this.transloco.translate('auth.oidc_callback.invalid_response');
      this.isProcessing = false;
    }
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }
}