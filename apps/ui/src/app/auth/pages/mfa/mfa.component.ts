import {
  Component,
  OnInit,
  inject,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';
import { MfaSetupResponse, TokenResponse } from '../../models';
import { timeout, catchError, finalize } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { generateDeviceFingerprint } from '../../utils/device-fingerprint';
import 'iconify-icon';

@Component({
  selector: 'app-mfa',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-linear-to-br from-dojo-bg via-dojo-surface to-dojo-bg px-4 py-8 relative overflow-hidden text-dojo-text"
    >
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

      <div
        class="relative w-full max-w-md motion-safe:animate-[fadeInUp_0.5s_ease-out]"
      >
        <div
          class="bg-dojo-surface backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/50 border border-dojo-border p-8"
        >
          <div class="flex justify-center mb-6">
            <div class="relative">
              <div
                class="absolute inset-0 bg-orange-500/30 blur-2xl rounded-full scale-150"
              ></div>
              <img
                src="/logos/scrape-dojo-readme-logo.png"
                alt="Scrape Dojo"
                class="h-20 relative drop-shadow-2xl"
              />
            </div>
          </div>

          <h2
            class="text-center text-2xl font-bold bg-linear-to-r from-orange-400 via-red-500 to-orange-400 bg-clip-text text-transparent mb-2"
          >
            {{
              (setupRequired ? 'auth.mfa.title_setup' : 'auth.mfa.title_verify')
                | transloco
            }}
          </h2>
          <p class="text-center text-dojo-text-muted text-sm mb-6">
            {{
              (setupRequired
                ? 'auth.mfa.subtitle_setup'
                : 'auth.mfa.subtitle_verify'
              ) | transloco
            }}
          </p>

          @if (errorMessage) {
            <div
              class="mb-6 p-4 bg-red-500/10 border-2 border-red-500 rounded-xl flex items-start gap-3 animate-shake"
            >
              <iconify-icon
                icon="mdi:alert-circle"
                class="text-red-500 text-2xl shrink-0 mt-0.5"
              ></iconify-icon>
              <div class="flex-1">
                <div class="font-semibold text-red-500 mb-1">
                  {{ 'auth.mfa.error_title' | transloco }}
                </div>
                <div class="text-sm text-red-400">{{ errorMessage }}</div>
              </div>
              <button
                type="button"
                (click)="errorMessage = ''"
                class="text-red-500 hover:text-red-400 transition-colors"
              >
                <iconify-icon icon="mdi:close" class="text-xl"></iconify-icon>
              </button>
            </div>
          }

          @if (setupRequired) {
            @if (qrCodeDataUrl) {
              <div class="flex flex-col items-center gap-3 mb-6">
                <div class="bg-white rounded-xl p-3">
                  <img [src]="qrCodeDataUrl" alt="MFA QR" class="w-48 h-48" />
                </div>
              </div>
            } @else if (isLoading) {
              <div
                class="flex items-center justify-center gap-3 text-dojo-text-muted mb-6"
              >
                <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                    fill="none"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>{{ 'auth.mfa.loading_qr' | transloco }}</span>
              </div>
            }

            @if (secret) {
              <div
                class="w-full bg-dojo-surface-2 border border-dojo-border rounded-xl p-3 mb-6"
              >
                <div class="text-xs text-dojo-text-subtle mb-1">
                  {{ 'auth.mfa.secret_label' | transloco }}
                </div>
                <div class="text-sm break-all text-dojo-text">{{ secret }}</div>
              </div>
            }
          }

          @if (!setupRequired || qrCodeDataUrl || secret) {
            <form (ngSubmit)="onSubmit()" class="space-y-4">
              <div class="space-y-2">
                <label
                  class="flex items-center gap-2 text-sm font-medium text-dojo-text"
                >
                  <iconify-icon
                    icon="mdi:shield-key-outline"
                    class="text-orange-400"
                  ></iconify-icon>
                  <span>{{ 'auth.mfa.code_label' | transloco }}</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="code"
                  name="code"
                  [class]="getInputClass()"
                  placeholder="123456"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  [disabled]="isLoading"
                  (input)="onCodeInput()"
                  required
                />
              </div>

              <button
                type="submit"
                class="w-full mt-4 px-6 py-3.5 bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400
                                   text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25
                                   hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98]
                                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                                   transition-all duration-300 flex items-center justify-center gap-2"
                [disabled]="isLoading || !isCodeValid()"
              >
                @if (isLoading) {
                  <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                      fill="none"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                } @else {
                  <iconify-icon icon="mdi:check" class="text-lg"></iconify-icon>
                }
                <span>{{ 'auth.mfa.submit' | transloco }}</span>
              </button>
            </form>
          }

          <div class="text-center mt-6 pt-6 border-t border-dojo-border">
            <a
              class="text-sm text-dojo-text-muted hover:text-dojo-text transition-colors"
              (click)="backToLogin()"
            >
              {{ 'auth.mfa.back_to_login' | transloco }}
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class MfaComponent implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private transloco = inject(TranslocoService);
  private cdr = inject(ChangeDetectorRef);

  mfaChallengeToken = '';
  setupRequired = false;
  returnUrl = '/';

  isLoading = false;
  errorMessage = '';

  qrCodeDataUrl = '';
  secret = '';

  code = '';

  constructor() {
    const params = this.route.snapshot.queryParams ?? {};

    this.mfaChallengeToken =
      params['mfa_challenge_token'] || params['mfaChallengeToken'] || '';
    this.setupRequired =
      params['mfa_setup_required'] === 'true' ||
      params['mfa_setup_required'] === '1' ||
      params['mfaSetupRequired'] === 'true' ||
      params['mfaSetupRequired'] === '1';

    this.returnUrl =
      params['returnUrl'] ||
      (params['return_url'] ? decodeURIComponent(params['return_url']) : '/') ||
      '/';

    if (!this.mfaChallengeToken) {
      this.errorMessage = this.transloco.translate(
        'auth.oidc_callback.invalid_response',
      );
    }
  }

  ngOnInit(): void {
    if (!this.mfaChallengeToken) {
      return;
    }

    if (this.setupRequired) {
      this.loadSetup();
    }
  }

  isCodeValid(): boolean {
    const normalized = (this.code || '').replace(/\s+/g, '');
    return normalized.length === 6 && /^\d{6}$/.test(normalized);
  }

  getInputClass(): string {
    const baseClasses =
      'w-full px-4 py-3 rounded-xl text-dojo-text placeholder-dojo-text-subtle focus:outline-none transition-all duration-300';

    if (this.errorMessage && this.code) {
      return `${baseClasses} bg-red-500/10 border-2 border-red-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500`;
    }

    return `${baseClasses} bg-dojo-surface-2 border border-dojo-border focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 focus:bg-dojo-surface-2`;
  }

  onCodeInput(): void {
    // Clear error when user starts typing
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }

  private loadSetup(): void {
    this.isLoading = true;
    this.errorMessage = '';
    // Ensure the loading indicator renders even if the HTTP callback runs outside Angular change detection.
    this.cdr.detectChanges();

    this.http
      .post<MfaSetupResponse>('/api/auth/mfa/setup', {
        mfaChallengeToken: this.mfaChallengeToken,
      })
      .pipe(
        timeout({ first: 15000 }),
        catchError((err) => {
          if (err?.name === 'TimeoutError') {
            this.errorMessage =
              'MFA setup request timed out. Please try again.';
            return EMPTY;
          }

          this.errorMessage =
            err?.error?.message ||
            err?.message ||
            this.transloco.translate('auth.mfa.setup_failed');
          return EMPTY;
        }),
        finalize(() => {
          this.isLoading = false;
          // Ensure UI updates even when running outside Zone.
          Promise.resolve().then(() => this.cdr.detectChanges());
        }),
      )
      .subscribe({
        next: (resp) => {
          this.qrCodeDataUrl = resp?.qrCodeDataUrl ?? '';
          this.secret = resp?.secret ?? '';

          if (!this.qrCodeDataUrl && !this.secret) {
            this.errorMessage = this.transloco.translate(
              'auth.mfa.setup_failed',
            );
          }

          // Immediately reflect QR/secret in the view.
          this.cdr.detectChanges();
        },
      });
  }

  onSubmit(): void {
    if (!this.isCodeValid() || !this.mfaChallengeToken) return;

    const normalized = (this.code || '').replace(/\s+/g, '');

    this.isLoading = true;
    this.errorMessage = '';

    this.http
      .post<TokenResponse>('/api/auth/mfa/complete', {
        mfaChallengeToken: this.mfaChallengeToken,
        code: normalized,
        deviceFingerprint: generateDeviceFingerprint(),
      })
      .subscribe({
        next: (tokens) => {
          this.authService.storeTokens(tokens);
          this.authService.loadUserProfile().subscribe({
            next: () => {
              this.isLoading = false;
              this.router.navigate([this.returnUrl]);
            },
            error: () => {
              this.isLoading = false;
              this.router.navigate([this.returnUrl]);
            },
          });
        },
        error: (err) => {
          const message = err?.error?.message || err?.message;

          // If the backend says setup is required, switch to setup mode and load the QR.
          if (
            typeof message === 'string' &&
            message.toLowerCase().includes('mfa setup required')
          ) {
            this.setupRequired = true;
            this.code = '';
            this.loadSetup();
            return;
          }

          this.errorMessage = this.getDetailedErrorMessage(err);
          this.isLoading = false;
          this.code = ''; // Clear the code on error
        },
      });
  }

  private getDetailedErrorMessage(err: any): string {
    const message = err?.error?.message || err?.message || '';
    const statusCode = err?.status;

    // Map specific error messages to user-friendly translations
    if (message.toLowerCase().includes('invalid mfa code')) {
      return this.transloco.translate('auth.mfa.error_invalid_code');
    }
    if (message.toLowerCase().includes('expired')) {
      return this.transloco.translate('auth.mfa.error_expired');
    }
    if (message.toLowerCase().includes('mfa setup required')) {
      return this.transloco.translate('auth.mfa.error_setup_required');
    }
    if (statusCode === 401) {
      return this.transloco.translate('auth.mfa.error_unauthorized');
    }
    if (statusCode === 429) {
      return this.transloco.translate('auth.mfa.error_rate_limit');
    }

    // Fallback to generic error message
    return message || this.transloco.translate('auth.mfa.verify_failed');
  }

  backToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.returnUrl },
    });
  }
}
