import { Injectable, NgZone, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { ScrapeEvent } from '@scrape-dojo/shared';
import { NotificationService } from './notification.service';
import { AuthService } from '../auth/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class ScrapeEventsService {
  private ngZone = inject(NgZone);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private eventSource: EventSource | null = null;
  private eventsSubject = new Subject<ScrapeEvent>();
  private connecting = false;
  private retryCount = 0;
  private readonly maxRetries = 10;
  private readonly baseRetryDelay = 3000;
  private readonly maxRetryDelay = 30000;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly events$ = this.eventsSubject.asObservable();

  connect(): void {
    if (this.eventSource || this.connecting) {
      return;
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      // Not authenticated -> don't start SSE (prevents noisy reconnect loops)
      return;
    }

    this.connecting = true;

    // Request notification permission on connect
    this.notificationService.requestPermission();

    this.ngZone.runOutsideAngular(() => {
      const url = `/api/events?access_token=${encodeURIComponent(token)}`;
      this.eventSource = new EventSource(url);
      this.connecting = false;

      this.eventSource.onopen = () => {
        this.retryCount = 0;
      };

      this.eventSource.onmessage = (event) => {
        this.ngZone.run(() => {
          try {
            const data = JSON.parse(event.data) as ScrapeEvent;
            this.eventsSubject.next(data);

            // Send browser notifications for key events
            this.handleNotification(data);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        });
      };

      this.eventSource.onerror = () => {
        this.closeEventSource();

        if (this.retryCount >= this.maxRetries) {
          console.error(
            `SSE: max retries (${this.maxRetries}) reached, giving up`,
          );
          return;
        }

        // Exponential backoff: 3s, 6s, 12s, 24s, 30s (capped)
        const delay = Math.min(
          this.baseRetryDelay * Math.pow(2, this.retryCount),
          this.maxRetryDelay,
        );
        this.retryCount++;

        this.retryTimeout = setTimeout(() => {
          this.retryTimeout = null;
          if (this.authService.getAccessToken()) {
            this.connect();
          }
        }, delay);
      };
    });
  }

  /**
   * Handle browser notifications for scrape events
   */
  private handleNotification(event: ScrapeEvent): void {
    switch (event.type) {
      case 'scrape-start':
        this.notificationService.notifyWorkflowStarted(
          event.scrapeId || 'unknown',
        );
        break;
      case 'scrape-end':
      case 'scrape-complete':
        if (!event.error) {
          this.notificationService.notifyWorkflowSuccess(
            event.scrapeId || 'unknown',
          );
        } else {
          this.notificationService.notifyWorkflowFailed(
            event.scrapeId || 'unknown',
            event.error,
          );
        }
        break;
    }
  }

  disconnect(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.retryCount = 0;
    this.closeEventSource();
  }

  private closeEventSource(): void {
    this.connecting = false;
    if (this.eventSource) {
      this.eventSource.onmessage = null;
      this.eventSource.onerror = null;
      this.eventSource.onopen = null;
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  isConnected(): boolean {
    return (
      this.eventSource !== null &&
      this.eventSource.readyState === EventSource.OPEN
    );
  }
}
