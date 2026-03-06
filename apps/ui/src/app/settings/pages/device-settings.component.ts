import {
  Component,
  OnInit,
  inject,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { generateDeviceFingerprint } from '../../auth/utils/device-fingerprint';
import 'iconify-icon';

interface TrustedDevice {
  id: string;
  deviceName: string;
  lastIpAddress: string;
  lastUsedAt: number;
  createdAt: number;
}

@Component({
  selector: 'app-device-settings',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="bg-dojo-surface rounded-lg border border-dojo-border p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-dojo-text">
            {{ 'settings.devices.title' | transloco }}
          </h2>
          <p class="text-sm text-dojo-text-muted mt-1">
            {{ 'settings.devices.subtitle' | transloco }}
          </p>
        </div>

        @if (devices.length > 1) {
          <button
            (click)="removeAllDevices()"
            [disabled]="isLoading"
            class="px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 border border-red-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <iconify-icon icon="mdi:delete-sweep"></iconify-icon>
            <span>{{ 'settings.devices.remove_all' | transloco }}</span>
          </button>
        }
      </div>

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

      @if (isLoadingDevices) {
        <div class="flex items-center justify-center py-12">
          <iconify-icon
            icon="mdi:loading"
            class="text-4xl text-orange-500 animate-spin"
          ></iconify-icon>
        </div>
      } @else if (devices.length === 0) {
        <div class="text-center py-12">
          <iconify-icon
            icon="mdi:devices"
            class="text-6xl text-dojo-text-muted mb-4"
          ></iconify-icon>
          <p class="text-dojo-text-muted">
            {{ 'settings.devices.no_devices' | transloco }}
          </p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (device of devices; track device.id) {
            <div
              class="bg-dojo-bg border border-dojo-border rounded-lg p-4 hover:border-orange-500/50 transition-all"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-4 flex-1">
                  <div class="mt-1">
                    <iconify-icon
                      [icon]="getDeviceIcon(device.deviceName)"
                      class="text-3xl text-orange-500"
                    >
                    </iconify-icon>
                  </div>
                  <div class="flex-1">
                    <h3 class="font-medium text-dojo-text mb-1">
                      {{ device.deviceName }}
                    </h3>
                    <div class="space-y-1 text-sm text-dojo-text-muted">
                      <div class="flex items-center gap-2">
                        <iconify-icon icon="mdi:ip-network"></iconify-icon>
                        <span>{{ device.lastIpAddress }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <iconify-icon icon="mdi:clock-outline"></iconify-icon>
                        <span
                          >{{ 'settings.devices.last_used' | transloco }}:
                          {{ formatDate(device.lastUsedAt) }}</span
                        >
                      </div>
                      <div class="flex items-center gap-2">
                        <iconify-icon icon="mdi:calendar-plus"></iconify-icon>
                        <span
                          >{{ 'settings.devices.added' | transloco }}:
                          {{ formatDate(device.createdAt) }}</span
                        >
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  (click)="removeDevice(device.id)"
                  [disabled]="isLoading"
                  class="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  [title]="transloco.translate('settings.devices.remove')"
                >
                  <iconify-icon
                    icon="mdi:delete"
                    class="text-xl"
                  ></iconify-icon>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DeviceSettingsComponent implements OnInit {
  private http = inject(HttpClient);
  public transloco = inject(TranslocoService);

  devices: TrustedDevice[] = [];
  isLoadingDevices = false;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadDevices();
  }

  loadDevices(): void {
    this.isLoadingDevices = true;
    this.errorMessage = '';

    this.http.get<TrustedDevice[]>('/api/users/me/devices').subscribe({
      next: (devices) => {
        this.devices = devices;
        this.isLoadingDevices = false;
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          this.transloco.translate('settings.devices.load_error');
        this.isLoadingDevices = false;
      },
    });
  }

  removeDevice(deviceId: string): void {
    if (!confirm(this.transloco.translate('settings.devices.confirm_remove'))) {
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http.delete(`/api/users/me/devices/${deviceId}`).subscribe({
      next: () => {
        this.successMessage = this.transloco.translate(
          'settings.devices.remove_success',
        );
        this.isLoading = false;
        this.loadDevices();
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          this.transloco.translate('settings.devices.remove_error');
        this.isLoading = false;
      },
    });
  }

  removeAllDevices(): void {
    if (
      !confirm(this.transloco.translate('settings.devices.confirm_remove_all'))
    ) {
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http
      .delete('/api/users/me/devices', {
        headers: {
          'X-Device-Fingerprint': generateDeviceFingerprint(),
        },
      })
      .subscribe({
        next: () => {
          this.successMessage = this.transloco.translate(
            'settings.devices.remove_all_success',
          );
          this.isLoading = false;
          this.loadDevices();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message ||
            this.transloco.translate('settings.devices.remove_all_error');
          this.isLoading = false;
        },
      });
  }

  getDeviceIcon(deviceName: string): string {
    const name = deviceName.toLowerCase();
    if (name.includes('windows')) return 'mdi:microsoft-windows';
    if (name.includes('mac')) return 'mdi:apple';
    if (name.includes('linux')) return 'mdi:linux';
    if (name.includes('android')) return 'mdi:android';
    if (
      name.includes('ios') ||
      name.includes('iphone') ||
      name.includes('ipad')
    )
      return 'mdi:apple-ios';
    if (name.includes('chrome')) return 'mdi:google-chrome';
    if (name.includes('firefox')) return 'mdi:firefox';
    if (name.includes('safari')) return 'mdi:apple-safari';
    if (name.includes('edge')) return 'mdi:microsoft-edge';
    return 'mdi:devices';
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1
          ? this.transloco.translate('settings.devices.just_now')
          : this.transloco.translate('settings.devices.minutes_ago', {
              minutes,
            });
      }
      return hours === 1
        ? this.transloco.translate('settings.devices.hour_ago')
        : this.transloco.translate('settings.devices.hours_ago', { hours });
    }
    if (days === 1)
      return this.transloco.translate('settings.devices.yesterday');
    if (days < 7)
      return this.transloco.translate('settings.devices.days_ago', { days });

    return date.toLocaleDateString();
  }
}
