import {
  Component,
  inject,
  OnInit,
  signal,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ModalComponent } from '../shared';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../auth/services/auth.service';
import { generateDeviceFingerprint } from '../../auth/utils/device-fingerprint';
import 'iconify-icon';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  provider: string;
}

interface TrustedDevice {
  id: string;
  deviceName: string;
  lastIpAddress: string;
  lastUsedAt: number;
  createdAt: number;
}

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

type SettingsTab = 'profile' | 'security' | 'devices';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <app-modal
      [isOpen]="isOpen()"
      [title]="'settings.title' | transloco"
      [size]="'lg'"
      (closed)="close()"
      [icon]="'mdi:cog'"
    >
      <!-- Tabs -->
      <div class="flex gap-1 p-1 bg-dojo-surface-2 rounded-xl mb-6">
        <button
          type="button"
          (click)="activeTab.set('profile')"
          [ngClass]="getTabClasses('profile')"
        >
          <div class="flex items-center justify-center gap-2">
            <iconify-icon icon="mdi:account" class="text-lg"></iconify-icon>
            <span>{{ 'settings.profile.title' | transloco }}</span>
          </div>
        </button>
        <button
          type="button"
          (click)="activeTab.set('security')"
          [ngClass]="getTabClasses('security')"
        >
          <div class="flex items-center justify-center gap-2">
            <iconify-icon icon="mdi:shield-lock" class="text-lg"></iconify-icon>
            <span>{{ 'settings.security.title' | transloco }}</span>
          </div>
        </button>
        <button
          type="button"
          (click)="activeTab.set('devices')"
          [ngClass]="getTabClasses('devices')"
        >
          <div class="flex items-center justify-center gap-2">
            <iconify-icon icon="mdi:devices" class="text-lg"></iconify-icon>
            <span>{{ 'settings.devices.title' | transloco }}</span>
          </div>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="overflow-y-auto max-h-[60vh]">
        @if (activeTab() === 'profile') {
          <div class="space-y-4">
            @if (loadingProfile()) {
              <div class="flex justify-center py-8">
                <svg
                  class="animate-spin h-8 w-8 text-dojo-accent"
                  viewBox="0 0 24 24"
                >
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
              </div>
            } @else if (profile()) {
              <div>
                <label class="block text-sm font-medium text-dojo-text mb-2">
                  {{ 'settings.profile.email' | transloco }}
                </label>
                <input
                  type="email"
                  [value]="profile()!.email"
                  disabled
                  class="w-full px-4 py-2.5 bg-dojo-surface-2 border border-dojo-border rounded-lg text-dojo-text-muted cursor-not-allowed"
                />
                <p class="mt-1 text-xs text-dojo-text-subtle">
                  {{ 'settings.profile.email_readonly' | transloco }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-dojo-text mb-2">
                  {{ 'settings.profile.username' | transloco }}
                </label>
                <input
                  type="text"
                  [(ngModel)]="profileForm.username"
                  class="w-full px-4 py-2.5 bg-dojo-surface-2 border border-dojo-border rounded-lg text-dojo-text
                                           focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-dojo-text mb-2">
                  {{ 'settings.profile.display_name' | transloco }}
                </label>
                <input
                  type="text"
                  [(ngModel)]="profileForm.displayName"
                  class="w-full px-4 py-2.5 bg-dojo-surface-2 border border-dojo-border rounded-lg text-dojo-text
                                           focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                />
              </div>
            }
          </div>
        }

        @if (activeTab() === 'security') {
          <div class="space-y-4">
            @if (profile()?.provider !== 'local') {
              <div
                class="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg"
              >
                <iconify-icon
                  icon="mdi:information"
                  class="text-xl text-blue-400 flex-shrink-0 mt-0.5"
                ></iconify-icon>
                <div class="text-sm text-blue-300">
                  {{
                    'settings.security.password_change_local_only'
                      | transloco: { provider: profile()?.provider }
                  }}
                </div>
              </div>
            } @else {
              <h3 class="text-lg font-semibold text-dojo-text mb-4">
                {{ 'settings.security.change_password' | transloco }}
              </h3>

              <div>
                <label class="block text-sm font-medium text-dojo-text mb-2">
                  {{ 'settings.security.current_password' | transloco }}
                </label>
                <input
                  type="password"
                  [(ngModel)]="passwordForm.currentPassword"
                  class="w-full px-4 py-2.5 bg-dojo-surface-2 border border-dojo-border rounded-lg text-dojo-text
                                           focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-dojo-text mb-2">
                  {{ 'settings.security.new_password' | transloco }}
                </label>
                <input
                  type="password"
                  [(ngModel)]="passwordForm.newPassword"
                  class="w-full px-4 py-2.5 bg-dojo-surface-2 border border-dojo-border rounded-lg text-dojo-text
                                           focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                />
                @if (
                  passwordForm.newPassword &&
                  passwordForm.newPassword.length < 8
                ) {
                  <p class="mt-1 text-xs text-red-400">
                    {{ 'settings.security.password_min_length' | transloco }}
                  </p>
                }
              </div>

              <div>
                <label class="block text-sm font-medium text-dojo-text mb-2">
                  {{ 'settings.security.confirm_password' | transloco }}
                </label>
                <input
                  type="password"
                  [(ngModel)]="passwordForm.confirmPassword"
                  class="w-full px-4 py-2.5 bg-dojo-surface-2 border border-dojo-border rounded-lg text-dojo-text
                                           focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                />
                @if (
                  passwordForm.confirmPassword &&
                  passwordForm.newPassword !== passwordForm.confirmPassword
                ) {
                  <p class="mt-1 text-xs text-red-400">
                    {{ 'settings.security.password_mismatch' | transloco }}
                  </p>
                }
              </div>
            }

            <!-- API Keys -->
            <div class="pt-6 border-t border-dojo-border/60">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 class="text-lg font-semibold text-dojo-text">
                    {{ 'settings.security.api_keys.title' | transloco }}
                  </h3>
                  <p class="text-sm text-dojo-text-muted">
                    {{ 'settings.security.api_keys.subtitle' | transloco }}
                  </p>
                </div>
                <button
                  type="button"
                  (click)="loadApiKeys()"
                  [disabled]="loadingApiKeys()"
                  class="px-3 py-1.5 text-sm text-dojo-text-muted hover:text-dojo-text hover:bg-dojo-surface-2 rounded-lg border border-dojo-border transition"
                >
                  <span>{{
                    'settings.security.api_keys.refresh' | transloco
                  }}</span>
                </button>
              </div>

              <div class="mt-4 flex flex-col gap-2">
                <label class="block text-sm font-medium text-dojo-text">{{
                  'settings.security.api_keys.name_label' | transloco
                }}</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    [(ngModel)]="apiKeyForm.name"
                    [placeholder]="
                      'settings.security.api_keys.name_placeholder' | transloco
                    "
                    class="flex-1 px-4 py-2.5 bg-dojo-surface-2 border border-dojo-border rounded-lg text-dojo-text
                                               focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                  />
                  <button
                    type="button"
                    (click)="createApiKey()"
                    [disabled]="creatingApiKey() || !apiKeyForm.name.trim()"
                    class="px-4 py-2.5 bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400
                                               text-white font-semibold rounded-lg shadow-lg
                                               disabled:opacity-50 disabled:cursor-not-allowed
                                               transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    @if (creatingApiKey()) {
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
                      <iconify-icon
                        icon="mdi:key-plus"
                        class="text-lg"
                      ></iconify-icon>
                    }
                    <span>{{
                      'settings.security.api_keys.create' | transloco
                    }}</span>
                  </button>
                </div>
                <p class="text-xs text-dojo-text-subtle">
                  {{ 'settings.security.api_keys.one_time_notice' | transloco }}
                </p>
              </div>

              <div class="mt-4">
                @if (loadingApiKeys()) {
                  <div class="flex justify-center py-6">
                    <svg
                      class="animate-spin h-6 w-6 text-dojo-accent"
                      viewBox="0 0 24 24"
                    >
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
                  </div>
                } @else if (apiKeys().length === 0) {
                  <div class="text-center py-6 text-dojo-text-muted">
                    <iconify-icon
                      icon="mdi:key-outline"
                      class="text-4xl mb-2"
                    ></iconify-icon>
                    <p>
                      {{ 'settings.security.api_keys.no_keys' | transloco }}
                    </p>
                  </div>
                } @else {
                  <div class="space-y-2">
                    @for (k of apiKeys(); track k.id) {
                      <div
                        class="flex items-center justify-between p-4 bg-dojo-surface-2 border border-dojo-border rounded-lg"
                      >
                        <div class="flex-1">
                          <div class="font-medium text-dojo-text">
                            {{ k.name }}
                          </div>
                          <div class="text-xs text-dojo-text-muted">
                            <span class="font-mono">{{ k.keyPrefix }}…</span>
                            •
                            {{
                              'settings.security.api_keys.created' | transloco
                            }}: {{ formatAbsoluteDate(k.createdAt) }} •
                            {{
                              'settings.security.api_keys.last_used'
                                | transloco
                            }}:
                            {{
                              k.lastUsedAt
                                ? formatAbsoluteDate(k.lastUsedAt)
                                : ('settings.security.api_keys.never'
                                  | transloco)
                            }}
                          </div>
                        </div>
                        <button
                          type="button"
                          (click)="revokeApiKey(k.id)"
                          [disabled]="revokingApiKeyId() === k.id"
                          class="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
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
        }

        @if (activeTab() === 'devices') {
          <div class="space-y-4">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-dojo-text">
                  {{ 'settings.devices.title' | transloco }}
                </h3>
                <p class="text-sm text-dojo-text-muted">
                  {{ 'settings.devices.subtitle' | transloco }}
                </p>
              </div>
              @if (devices().length > 1) {
                <button
                  type="button"
                  (click)="removeAllDevices()"
                  [disabled]="removingDevice()"
                  class="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/30 transition"
                >
                  {{ 'settings.devices.remove_all' | transloco }}
                </button>
              }
            </div>

            @if (loadingDevices()) {
              <div class="flex justify-center py-8">
                <svg
                  class="animate-spin h-8 w-8 text-dojo-accent"
                  viewBox="0 0 24 24"
                >
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
              </div>
            } @else if (devices().length === 0) {
              <div class="text-center py-8 text-dojo-text-muted">
                <iconify-icon
                  icon="mdi:devices"
                  class="text-4xl mb-2"
                ></iconify-icon>
                <p>{{ 'settings.devices.no_devices' | transloco }}</p>
              </div>
            } @else {
              <div class="space-y-2">
                @for (device of devices(); track device.id) {
                  <div
                    class="flex items-center justify-between p-4 bg-dojo-surface-2 border border-dojo-border rounded-lg"
                  >
                    <div class="flex items-center gap-3 flex-1">
                      <iconify-icon
                        [icon]="getDeviceIcon(device.deviceName)"
                        class="text-2xl text-dojo-accent"
                      ></iconify-icon>
                      <div class="flex-1">
                        <div class="font-medium text-dojo-text">
                          {{ device.deviceName }}
                        </div>
                        <div class="text-xs text-dojo-text-muted">
                          {{ device.lastIpAddress }} •
                          {{ formatDate(device.lastUsedAt) }}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      (click)="removeDevice(device.id)"
                      [disabled]="removingDevice()"
                      class="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                    >
                      {{ 'settings.devices.remove' | transloco }}
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Footer with action buttons -->
      <div modal-footer class="flex items-center gap-2 w-full">
        @if (activeTab() === 'profile' && profile()) {
          <button
            type="button"
            (click)="saveProfile()"
            [disabled]="savingProfile()"
            class="flex-1 px-4 py-2.5 bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400
                               text-white font-semibold rounded-lg shadow-lg
                               disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all duration-300 flex items-center justify-center gap-2"
          >
            @if (savingProfile()) {
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
              <iconify-icon
                icon="mdi:content-save"
                class="text-lg"
              ></iconify-icon>
            }
            <span>{{ 'settings.profile.save' | transloco }}</span>
          </button>
        }
        @if (activeTab() === 'security' && profile()?.provider === 'local') {
          <button
            type="button"
            (click)="changePassword()"
            [disabled]="!isPasswordFormValid() || changingPassword()"
            class="flex-1 px-4 py-2.5 bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400
                               text-white font-semibold rounded-lg shadow-lg
                               disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all duration-300 flex items-center justify-center gap-2"
          >
            @if (changingPassword()) {
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
              <iconify-icon icon="mdi:key" class="text-lg"></iconify-icon>
            }
            <span>{{ 'settings.security.update_password' | transloco }}</span>
          </button>
        }
      </div>
    </app-modal>
  `,
})
export class SettingsModalComponent implements OnInit {
  isOpen = signal(true); // Always true for auxiliary route
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private transloco = inject(TranslocoService);
  private router = inject(Router);

  activeTab = signal<SettingsTab>('profile');

  // Profile
  profile = signal<UserProfile | null>(null);
  loadingProfile = signal(false);
  savingProfile = signal(false);
  profileForm = { username: '', displayName: '' };

  // Security
  changingPassword = signal(false);
  passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

  // Devices
  devices = signal<TrustedDevice[]>([]);
  loadingDevices = signal(false);
  removingDevice = signal(false);

  // API Keys
  apiKeys = signal<UserApiKeyListItem[]>([]);
  loadingApiKeys = signal(false);
  creatingApiKey = signal(false);
  revokingApiKeyId = signal<string | null>(null);
  apiKeyForm = { name: '' };

  ngOnInit(): void {
    this.loadProfile();
    this.loadDevices();
    this.loadApiKeys();
  }

  close(): void {
    this.router.navigate([{ outlets: { modal: null } }]);
  }

  getTabClasses(tab: SettingsTab): string {
    const base =
      'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all';
    const isActive = this.activeTab() === tab;

    if (isActive) {
      return `${base} bg-dojo-surface text-dojo-text shadow-sm`;
    }
    return `${base} text-dojo-text-muted hover:text-dojo-text`;
  }

  // Profile methods
  loadProfile(): void {
    this.loadingProfile.set(true);
    this.http.get<UserProfile>('/api/users/me/profile').subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.profileForm.username = profile.username;
        this.profileForm.displayName = profile.displayName;
        this.loadingProfile.set(false);
      },
      error: () => {
        this.loadingProfile.set(false);
      },
    });
  }

  saveProfile(): void {
    this.savingProfile.set(true);
    this.http
      .put<UserProfile>('/api/users/me/profile', {
        username: this.profileForm.username,
        displayName: this.profileForm.displayName,
      })
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.savingProfile.set(false);
          // Reload user in auth service
          this.authService.loadUserProfile().subscribe();
        },
        error: () => {
          this.savingProfile.set(false);
        },
      });
  }

  // Security methods
  isPasswordFormValid(): boolean {
    return (
      this.passwordForm.currentPassword.length > 0 &&
      this.passwordForm.newPassword.length >= 8 &&
      this.passwordForm.newPassword === this.passwordForm.confirmPassword
    );
  }

  changePassword(): void {
    if (!this.isPasswordFormValid()) return;

    this.changingPassword.set(true);
    this.http
      .put('/api/users/me/password', {
        currentPassword: this.passwordForm.currentPassword,
        newPassword: this.passwordForm.newPassword,
      })
      .subscribe({
        next: () => {
          this.passwordForm = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          };
          this.changingPassword.set(false);
        },
        error: () => {
          this.changingPassword.set(false);
        },
      });
  }

  // Device methods
  loadDevices(): void {
    this.loadingDevices.set(true);
    this.http.get<TrustedDevice[]>('/api/users/me/devices').subscribe({
      next: (devices) => {
        this.devices.set(devices);
        this.loadingDevices.set(false);
      },
      error: () => {
        this.loadingDevices.set(false);
      },
    });
  }

  removeDevice(deviceId: string): void {
    if (!confirm(this.getTranslation('settings.devices.confirm_remove')))
      return;

    this.removingDevice.set(true);
    this.http.delete(`/api/users/me/devices/${deviceId}`).subscribe({
      next: () => {
        this.devices.update((devices) =>
          devices.filter((d) => d.id !== deviceId),
        );
        this.removingDevice.set(false);
      },
      error: () => {
        this.removingDevice.set(false);
      },
    });
  }

  removeAllDevices(): void {
    if (!confirm(this.getTranslation('settings.devices.confirm_remove_all')))
      return;

    this.removingDevice.set(true);
    this.http
      .delete('/api/users/me/devices', {
        headers: {
          'X-Device-Fingerprint': generateDeviceFingerprint(),
        },
      })
      .subscribe({
        next: () => {
          this.loadDevices();
          this.removingDevice.set(false);
        },
        error: () => {
          this.removingDevice.set(false);
        },
      });
  }

  getDeviceIcon(deviceName: string): string {
    const name = deviceName.toLowerCase();
    if (
      name.includes('mobile') ||
      name.includes('android') ||
      name.includes('iphone')
    ) {
      return 'mdi:cellphone';
    }
    if (name.includes('tablet') || name.includes('ipad')) {
      return 'mdi:tablet';
    }
    if (name.includes('mac')) {
      return 'mdi:laptop-mac';
    }
    if (name.includes('windows')) {
      return 'mdi:microsoft-windows';
    }
    if (name.includes('linux')) {
      return 'mdi:linux';
    }
    return 'mdi:monitor';
  }

  formatDate(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return this.getTranslation('settings.devices.just_now');
    if (minutes < 60)
      return this.getTranslation('settings.devices.minutes_ago', { minutes });
    if (hours === 1) return this.getTranslation('settings.devices.hour_ago');
    if (hours < 24)
      return this.getTranslation('settings.devices.hours_ago', { hours });
    if (days === 1) return this.getTranslation('settings.devices.yesterday');
    return this.getTranslation('settings.devices.days_ago', { days });
  }

  private getTranslation(key: string, params?: Record<string, any>): string {
    return this.transloco.translate(key, params);
  }

  // API Key methods
  loadApiKeys(): void {
    this.loadingApiKeys.set(true);
    this.http.get<UserApiKeyListItem[]>('/api/users/me/api-keys').subscribe({
      next: (keys) => {
        this.apiKeys.set(keys.filter((k) => !k.revokedAt));
        this.loadingApiKeys.set(false);
      },
      error: () => {
        this.loadingApiKeys.set(false);
      },
    });
  }

  createApiKey(): void {
    const name = this.apiKeyForm.name.trim();
    if (!name) return;

    this.creatingApiKey.set(true);
    this.http
      .post<CreateUserApiKeyResponse>('/api/users/me/api-keys', { name })
      .subscribe({
        next: (res) => {
          this.apiKeyForm.name = '';
          this.creatingApiKey.set(false);
          this.loadApiKeys();
          // Show only once in a copy-friendly prompt.
          window.prompt(
            this.getTranslation('settings.security.api_keys.copy_prompt'),
            res.apiKey,
          );
        },
        error: () => {
          this.creatingApiKey.set(false);
        },
      });
  }

  revokeApiKey(apiKeyId: string): void {
    if (
      !confirm(this.getTranslation('settings.security.api_keys.confirm_revoke'))
    )
      return;

    this.revokingApiKeyId.set(apiKeyId);
    this.http.delete(`/api/users/me/api-keys/${apiKeyId}`).subscribe({
      next: () => {
        this.apiKeys.update((keys) => keys.filter((k) => k.id !== apiKeyId));
        this.revokingApiKeyId.set(null);
      },
      error: () => {
        this.revokingApiKeyId.set(null);
      },
    });
  }

  formatAbsoluteDate(timestamp: number): string {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return String(timestamp);
    }
  }
}
