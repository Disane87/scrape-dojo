import {
  Component,
  inject,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import 'iconify-icon';

interface UserApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt?: number | null;
  revokedAt?: number | null;
  createdAt: number;
}

interface CreateUserApiKeyResponse {
  apiKey: string;
  item: UserApiKeyListItem;
}

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="bg-dojo-surface rounded-lg border border-dojo-border p-6">
      <h2 class="text-xl font-bold text-dojo-text mb-6">
        {{ 'settings.security.title' | transloco }}
      </h2>

      @if (successMessage) {
        <div
          class="mb-4 p-4 bg-green-500/10 border border-green-500 rounded-lg flex items-start gap-3"
        >
          <iconify-icon
            icon="mdi:check-circle"
            class="text-green-500 text-xl mt-0.5"
          ></iconify-icon>
          <span class="text-green-500">{{ successMessage }}</span>
        </div>
      }

      @if (errorMessage) {
        <div
          class="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-start gap-3"
        >
          <iconify-icon
            icon="mdi:alert-circle"
            class="text-red-500 text-xl mt-0.5"
          ></iconify-icon>
          <span class="text-red-500">{{ errorMessage }}</span>
        </div>
      }

      <!-- Change Password Section -->
      <div class="mb-8">
        <h3
          class="text-lg font-semibold text-dojo-text mb-4 flex items-center gap-2"
        >
          <iconify-icon icon="mdi:lock-reset"></iconify-icon>
          {{ 'settings.security.change_password' | transloco }}
        </h3>

        <form (ngSubmit)="changePassword()" class="space-y-4">
          <!-- Current Password -->
          <div>
            <label class="block text-sm font-medium text-dojo-text mb-2">
              {{ 'settings.security.current_password' | transloco }}
            </label>
            <div class="relative">
              <input
                [type]="showCurrentPassword ? 'text' : 'password'"
                [(ngModel)]="currentPassword"
                name="currentPassword"
                required
                class="w-full px-4 py-3 pr-12 bg-dojo-bg border border-dojo-border rounded-lg text-dojo-text focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
              />
              <button
                type="button"
                (click)="showCurrentPassword = !showCurrentPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-dojo-text-muted hover:text-dojo-text"
              >
                <iconify-icon
                  [icon]="showCurrentPassword ? 'mdi:eye-off' : 'mdi:eye'"
                  class="text-xl"
                ></iconify-icon>
              </button>
            </div>
          </div>

          <!-- New Password -->
          <div>
            <label class="block text-sm font-medium text-dojo-text mb-2">
              {{ 'settings.security.new_password' | transloco }}
            </label>
            <div class="relative">
              <input
                [type]="showNewPassword ? 'text' : 'password'"
                [(ngModel)]="newPassword"
                name="newPassword"
                required
                minlength="8"
                class="w-full px-4 py-3 pr-12 bg-dojo-bg border border-dojo-border rounded-lg text-dojo-text focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
              />
              <button
                type="button"
                (click)="showNewPassword = !showNewPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-dojo-text-muted hover:text-dojo-text"
              >
                <iconify-icon
                  [icon]="showNewPassword ? 'mdi:eye-off' : 'mdi:eye'"
                  class="text-xl"
                ></iconify-icon>
              </button>
            </div>
            @if (newPassword && newPassword.length < 8) {
              <p class="text-xs text-red-500 mt-1">
                {{ 'settings.security.password_min_length' | transloco }}
              </p>
            }
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-sm font-medium text-dojo-text mb-2">
              {{ 'settings.security.confirm_password' | transloco }}
            </label>
            <div class="relative">
              <input
                [type]="showConfirmPassword ? 'text' : 'password'"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                required
                class="w-full px-4 py-3 pr-12 bg-dojo-bg border border-dojo-border rounded-lg text-dojo-text focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
              />
              <button
                type="button"
                (click)="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-dojo-text-muted hover:text-dojo-text"
              >
                <iconify-icon
                  [icon]="showConfirmPassword ? 'mdi:eye-off' : 'mdi:eye'"
                  class="text-xl"
                ></iconify-icon>
              </button>
            </div>
            @if (
              newPassword && confirmPassword && newPassword !== confirmPassword
            ) {
              <p class="text-xs text-red-500 mt-1">
                {{ 'settings.security.password_mismatch' | transloco }}
              </p>
            }
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            [disabled]="!isPasswordFormValid() || isLoading"
            class="w-full px-6 py-3 bg-linear-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            @if (isLoading) {
              <iconify-icon
                icon="mdi:loading"
                class="text-lg animate-spin"
              ></iconify-icon>
            } @else {
              <iconify-icon
                icon="mdi:lock-check"
                class="text-lg"
              ></iconify-icon>
            }
            <span>{{ 'settings.security.update_password' | transloco }}</span>
          </button>
        </form>
      </div>

      <!-- API Keys Section -->
      <div class="pt-6 border-t border-dojo-border/60">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3
              class="text-lg font-semibold text-dojo-text mb-1 flex items-center gap-2"
            >
              <iconify-icon icon="mdi:key"></iconify-icon>
              {{ 'settings.security.api_keys.title' | transloco }}
            </h3>
            <p class="text-sm text-dojo-text-muted">
              {{ 'settings.security.api_keys.subtitle' | transloco }}
            </p>
          </div>
          <button
            type="button"
            (click)="loadApiKeys()"
            [disabled]="loadingApiKeys"
            class="px-3 py-1.5 text-sm text-dojo-text-muted hover:text-dojo-text hover:bg-dojo-bg rounded-lg border border-dojo-border transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{{ 'settings.security.api_keys.refresh' | transloco }}</span>
          </button>
        </div>

        <div class="flex flex-col gap-2">
          <label class="block text-sm font-medium text-dojo-text">{{
            'settings.security.api_keys.name_label' | transloco
          }}</label>
          <div class="flex gap-2">
            <input
              type="text"
              [(ngModel)]="apiKeyName"
              [placeholder]="
                'settings.security.api_keys.name_placeholder' | transloco
              "
              class="flex-1 px-4 py-3 bg-dojo-bg border border-dojo-border rounded-lg text-dojo-text focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
            />
            <button
              type="button"
              (click)="createApiKey()"
              [disabled]="creatingApiKey || !apiKeyName.trim()"
              class="px-4 py-3 bg-linear-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              @if (creatingApiKey) {
                <iconify-icon
                  icon="mdi:loading"
                  class="text-lg animate-spin"
                ></iconify-icon>
              } @else {
                <iconify-icon
                  icon="mdi:key-plus"
                  class="text-lg"
                ></iconify-icon>
              }
              <span>{{ 'settings.security.api_keys.create' | transloco }}</span>
            </button>
          </div>
          <p class="text-xs text-dojo-text-muted">
            {{ 'settings.security.api_keys.one_time_notice' | transloco }}
          </p>
        </div>

        <div class="mt-4">
          @if (loadingApiKeys) {
            <div class="flex items-center justify-center py-6">
              <iconify-icon
                icon="mdi:loading"
                class="text-3xl text-orange-500 animate-spin"
              ></iconify-icon>
            </div>
          } @else if (apiKeys.length === 0) {
            <div class="text-center py-6 text-dojo-text-muted">
              <iconify-icon
                icon="mdi:key-outline"
                class="text-4xl mb-2"
              ></iconify-icon>
              <p>{{ 'settings.security.api_keys.no_keys' | transloco }}</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (k of apiKeys; track k.id) {
                <div
                  class="bg-dojo-bg border border-dojo-border rounded-lg p-4 flex items-center justify-between gap-4"
                >
                  <div class="min-w-0">
                    <div class="font-medium text-dojo-text">{{ k.name }}</div>
                    <div class="text-xs text-dojo-text-muted">
                      <span class="font-mono">{{ k.keyPrefix }}…</span>
                      • {{ 'settings.security.api_keys.created' | transloco }}:
                      {{ formatAbsoluteDate(k.createdAt) }} •
                      {{ 'settings.security.api_keys.last_used' | transloco }}:
                      {{
                        k.lastUsedAt
                          ? formatAbsoluteDate(k.lastUsedAt)
                          : ('settings.security.api_keys.never' | transloco)
                      }}
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="revokeApiKey(k.id)"
                    [disabled]="revokingApiKeyId === k.id"
                    class="px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ 'settings.security.api_keys.revoke' | transloco }}
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class SecuritySettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private transloco = inject(TranslocoService);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  apiKeys: UserApiKeyListItem[] = [];
  loadingApiKeys = false;
  creatingApiKey = false;
  revokingApiKeyId: string | null = null;
  apiKeyName = '';

  ngOnInit(): void {
    this.loadApiKeys();
  }

  isPasswordFormValid(): boolean {
    return (
      this.currentPassword.length >= 8 &&
      this.newPassword.length >= 8 &&
      this.newPassword === this.confirmPassword
    );
  }

  changePassword(): void {
    if (!this.isPasswordFormValid()) return;

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http
      .put('/api/users/me/password', {
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.successMessage = this.transloco.translate(
            'settings.security.password_changed',
          );
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            this.transloco.translate('settings.security.password_error');
          this.isLoading = false;
        },
      });
  }

  loadApiKeys(): void {
    this.loadingApiKeys = true;
    this.http.get<UserApiKeyListItem[]>('/api/users/me/api-keys').subscribe({
      next: (keys) => {
        this.apiKeys = (keys ?? []).filter((k) => !k.revokedAt);
        this.loadingApiKeys = false;
      },
      error: () => {
        this.loadingApiKeys = false;
      },
    });
  }

  createApiKey(): void {
    const name = this.apiKeyName.trim();
    if (!name) return;

    this.creatingApiKey = true;
    this.http
      .post<CreateUserApiKeyResponse>('/api/users/me/api-keys', { name })
      .subscribe({
        next: (res) => {
          this.apiKeyName = '';
          this.creatingApiKey = false;
          this.loadApiKeys();

          const copyPrompt = this.transloco.translate(
            'settings.security.api_keys.copy_prompt',
          );
          window.prompt(copyPrompt, res.apiKey);
        },
        error: () => {
          this.creatingApiKey = false;
        },
      });
  }

  revokeApiKey(apiKeyId: string): void {
    const ok = confirm(
      this.transloco.translate('settings.security.api_keys.confirm_revoke'),
    );
    if (!ok) return;

    this.revokingApiKeyId = apiKeyId;
    this.http.delete(`/api/users/me/api-keys/${apiKeyId}`).subscribe({
      next: () => {
        this.apiKeys = this.apiKeys.filter((k) => k.id !== apiKeyId);
        this.revokingApiKeyId = null;
      },
      error: () => {
        this.revokingApiKeyId = null;
      },
    });
  }

  formatAbsoluteDate(timestamp: number): string {
    const d = new Date(timestamp);
    if (!Number.isFinite(d.getTime())) return '';
    return d.toLocaleString();
  }
}
