import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { ScrapeIconComponent } from '../scrape-icon/scrape-icon.component';
import 'iconify-icon';

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule, ScrapeIconComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (notification(); as notif) {
      <div
        class="fixed inset-0 z-[60] flex items-end justify-end p-4 pointer-events-none"
      >
        <div
          class="pointer-events-auto w-full max-w-sm bg-dojo-surface border rounded-lg shadow-xl overflow-hidden animate-slide-in"
          [class]="borderClass(notif.type)"
        >
          <!-- Header -->
          <div class="flex items-start gap-3 p-4">
            <!-- Icon -->
            <div
              class="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              [class]="iconBgClass(notif.type)"
            >
              @if (notif.iconUrl && isImageUrl(notif.iconUrl)) {
                <img
                  [src]="notif.iconUrl"
                  [alt]="notif.title"
                  class="w-6 h-6 rounded object-cover"
                />
              } @else if (notif.iconUrl) {
                <app-scrape-icon
                  [icon]="notif.iconUrl"
                  [alt]="notif.title"
                  imgClass="w-6 h-6 rounded"
                  svgClass="w-5 h-5 text-dojo-text"
                />
              } @else {
                <iconify-icon
                  [icon]="'lucide:' + iconName(notif.type)"
                  class="w-5 h-5"
                  [class]="iconClass(notif.type)"
                ></iconify-icon>
              }
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-semibold text-dojo-text truncate">
                {{ notif.title }}
              </h4>
              <p class="text-sm text-dojo-text-muted mt-1">
                {{ notif.message }}
              </p>

              <!-- Scrape Info -->
              <p class="text-xs text-dojo-text-subtle mt-2">
                von <span class="font-medium">{{ notif.scrapeId }}</span>
              </p>
            </div>

            <!-- Close Button -->
            <button
              (click)="dismiss(notif.notificationId)"
              class="shrink-0 p-1 rounded hover:bg-dojo-surface-2 text-dojo-text-muted hover:text-dojo-text transition-colors"
            >
              <iconify-icon icon="lucide:x" class="w-4 h-4"></iconify-icon>
            </button>
          </div>

          <!-- Progress bar for auto-dismiss -->
          @if (notif.autoDismiss && notif.autoDismiss > 0) {
            <div class="h-1 bg-dojo-surface-2">
              <div
                class="h-full transition-all ease-linear"
                [class]="progressClass(notif.type)"
                [style.animation]="
                  'shrink ' + notif.autoDismiss + 'ms linear forwards'
                "
              ></div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      @keyframes slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes shrink {
        from {
          width: 100%;
        }
        to {
          width: 0%;
        }
      }

      .animate-slide-in {
        animation: slide-in 0.3s ease-out;
      }
    `,
  ],
})
export class NotificationModalComponent {
  private notificationService = inject(NotificationService);

  notification = this.notificationService.currentNotification;

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }

  /** Check if the URL is a real image URL (http/https/data) */
  isImageUrl(url: string): boolean {
    return (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('data:')
    );
  }

  borderClass(type: string): string {
    switch (type) {
      case 'success':
        return 'border-emerald-500/50';
      case 'warning':
        return 'border-amber-500/50';
      case 'error':
        return 'border-rose-500/50';
      default:
        return 'border-blue-500/50';
    }
  }

  iconBgClass(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/20';
      case 'error':
        return 'bg-rose-500/20';
      default:
        return 'bg-blue-500/20';
    }
  }

  iconClass(type: string): string {
    switch (type) {
      case 'success':
        return 'text-emerald-400';
      case 'warning':
        return 'text-amber-400';
      case 'error':
        return 'text-rose-400';
      default:
        return 'text-blue-400';
    }
  }

  iconName(type: string): string {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'alert-triangle';
      case 'error':
        return 'x-circle';
      default:
        return 'info';
    }
  }

  progressClass(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-emerald-500';
      case 'warning':
        return 'bg-amber-500';
      case 'error':
        return 'bg-rose-500';
      default:
        return 'bg-blue-500';
    }
  }
}
