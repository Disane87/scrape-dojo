import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import 'iconify-icon';

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
                <div class="mb-4 p-4 bg-green-500/10 border border-green-500 rounded-lg flex items-start gap-3">
                    <iconify-icon icon="mdi:check-circle" class="text-green-500 text-xl mt-0.5"></iconify-icon>
                    <span class="text-green-500">{{ successMessage }}</span>
                </div>
            }

            @if (errorMessage) {
                <div class="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-start gap-3">
                    <iconify-icon icon="mdi:alert-circle" class="text-red-500 text-xl mt-0.5"></iconify-icon>
                    <span class="text-red-500">{{ errorMessage }}</span>
                </div>
            }

            <!-- Change Password Section -->
            <div class="mb-8">
                <h3 class="text-lg font-semibold text-dojo-text mb-4 flex items-center gap-2">
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
                                <iconify-icon [icon]="showCurrentPassword ? 'mdi:eye-off' : 'mdi:eye'" class="text-xl"></iconify-icon>
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
                                <iconify-icon [icon]="showNewPassword ? 'mdi:eye-off' : 'mdi:eye'" class="text-xl"></iconify-icon>
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
                                <iconify-icon [icon]="showConfirmPassword ? 'mdi:eye-off' : 'mdi:eye'" class="text-xl"></iconify-icon>
                            </button>
                        </div>
                        @if (newPassword && confirmPassword && newPassword !== confirmPassword) {
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
                            <iconify-icon icon="mdi:loading" class="text-lg animate-spin"></iconify-icon>
                        } @else {
                            <iconify-icon icon="mdi:lock-check" class="text-lg"></iconify-icon>
                        }
                        <span>{{ 'settings.security.update_password' | transloco }}</span>
                    </button>
                </form>
            </div>
        </div>
    `,
})
export class SecuritySettingsComponent {
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

        this.http.put('/api/users/me/password', {
            currentPassword: this.currentPassword,
            newPassword: this.newPassword,
        }).subscribe({
            next: () => {
                this.successMessage = this.transloco.translate('settings.security.password_changed');
                this.currentPassword = '';
                this.newPassword = '';
                this.confirmPassword = '';
                this.isLoading = false;
            },
            error: (err) => {
                this.errorMessage = err?.error?.message || this.transloco.translate('settings.security.password_error');
                this.isLoading = false;
            },
        });
    }
}
