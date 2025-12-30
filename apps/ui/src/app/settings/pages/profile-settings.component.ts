import { Component, OnInit, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../auth/services/auth.service';
import 'iconify-icon';

@Component({
    selector: 'app-profile-settings',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslocoModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    template: `
        <div class="bg-[var(--dojo-surface)] rounded-lg border border-[var(--dojo-border)] p-6">
            <h2 class="text-xl font-bold text-[var(--dojo-text)] mb-6">
                {{ 'settings.profile.title' | transloco }}
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

            <form (ngSubmit)="saveProfile()" class="space-y-6">
                <!-- Email (readonly) -->
                <div>
                    <label class="block text-sm font-medium text-[var(--dojo-text)] mb-2">
                        {{ 'settings.profile.email' | transloco }}
                    </label>
                    <input
                        type="email"
                        [value]="profile?.email || ''"
                        disabled
                        class="w-full px-4 py-3 bg-[var(--dojo-bg)] border border-[var(--dojo-border)] rounded-lg text-[var(--dojo-text-muted)] cursor-not-allowed"
                    />
                    <p class="text-xs text-[var(--dojo-text-muted)] mt-1">
                        {{ 'settings.profile.email_readonly' | transloco }}
                    </p>
                </div>

                <!-- Username -->
                <div>
                    <label class="block text-sm font-medium text-[var(--dojo-text)] mb-2">
                        {{ 'settings.profile.username' | transloco }}
                    </label>
                    <input
                        type="text"
                        [(ngModel)]="username"
                        name="username"
                        class="w-full px-4 py-3 bg-[var(--dojo-bg)] border border-[var(--dojo-border)] rounded-lg text-[var(--dojo-text)] focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                        placeholder="johndoe"
                    />
                </div>

                <!-- Display Name -->
                <div>
                    <label class="block text-sm font-medium text-[var(--dojo-text)] mb-2">
                        {{ 'settings.profile.display_name' | transloco }}
                    </label>
                    <input
                        type="text"
                        [(ngModel)]="displayName"
                        name="displayName"
                        class="w-full px-4 py-3 bg-[var(--dojo-bg)] border border-[var(--dojo-border)] rounded-lg text-[var(--dojo-text)] focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                        placeholder="John Doe"
                    />
                </div>

                <!-- Role (readonly) -->
                <div>
                    <label class="block text-sm font-medium text-[var(--dojo-text)] mb-2">
                        {{ 'settings.profile.role' | transloco }}
                    </label>
                    <div class="px-4 py-3 bg-[var(--dojo-bg)] border border-[var(--dojo-border)] rounded-lg">
                        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                              [class.bg-orange-500/20]="profile?.role === 'admin'"
                              [class.text-orange-500]="profile?.role === 'admin'"
                              [class.bg-blue-500/20]="profile?.role === 'user'"
                              [class.text-blue-500]="profile?.role === 'user'">
                            <iconify-icon [icon]="profile?.role === 'admin' ? 'mdi:shield-crown' : 'mdi:account'"></iconify-icon>
                            {{ profile?.role || 'user' }}
                        </span>
                    </div>
                </div>

                <!-- Provider (readonly) -->
                <div>
                    <label class="block text-sm font-medium text-[var(--dojo-text)] mb-2">
                        {{ 'settings.profile.provider' | transloco }}
                    </label>
                    <div class="px-4 py-3 bg-[var(--dojo-bg)] border border-[var(--dojo-border)] rounded-lg">
                        <span class="inline-flex items-center gap-2 text-[var(--dojo-text)]">
                            <iconify-icon [icon]="profile?.provider === 'oidc' ? 'mdi:cloud-lock' : 'mdi:account-key'"></iconify-icon>
                            {{ profile?.provider === 'oidc' ? 'SSO / OIDC' : 'Local' }}
                        </span>
                    </div>
                </div>

                <!-- Submit Button -->
                <div class="flex gap-3 pt-4">
                    <button
                        type="submit"
                        [disabled]="isLoading"
                        class="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        @if (isLoading) {
                            <iconify-icon icon="mdi:loading" class="text-lg animate-spin"></iconify-icon>
                        } @else {
                            <iconify-icon icon="mdi:content-save" class="text-lg"></iconify-icon>
                        }
                        <span>{{ 'settings.profile.save' | transloco }}</span>
                    </button>
                </div>
            </form>
        </div>
    `,
})
export class ProfileSettingsComponent implements OnInit {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private transloco = inject(TranslocoService);

    profile: any = null;
    username = '';
    displayName = '';
    isLoading = false;
    successMessage = '';
    errorMessage = '';

    ngOnInit(): void {
        this.loadProfile();
    }

    loadProfile(): void {
        this.http.get('/api/users/me/profile').subscribe({
            next: (data: any) => {
                this.profile = data;
                this.username = data.username || '';
                this.displayName = data.displayName || '';
            },
            error: (err) => {
                this.errorMessage = err?.error?.message || this.transloco.translate('settings.profile.load_error');
            },
        });
    }

    saveProfile(): void {
        this.isLoading = true;
        this.successMessage = '';
        this.errorMessage = '';

        this.http.put('/api/users/me/profile', {
            username: this.username || null,
            displayName: this.displayName || null,
        }).subscribe({
            next: () => {
                this.successMessage = this.transloco.translate('settings.profile.save_success');
                this.isLoading = false;
                // Reload user profile in auth service
                this.authService.loadUserProfile().subscribe();
            },
            error: (err) => {
                this.errorMessage = err?.error?.message || this.transloco.translate('settings.profile.save_error');
                this.isLoading = false;
            },
        });
    }
}
