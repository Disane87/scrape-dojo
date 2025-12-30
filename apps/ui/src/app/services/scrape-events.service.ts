import { Injectable, NgZone, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ScrapeEvent } from '@scrape-dojo/shared';
import { NotificationService } from './notification.service';
import { AuthService } from '../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ScrapeEventsService {
  private ngZone = inject(NgZone);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private eventSource: EventSource | null = null;
  private eventsSubject = new Subject<ScrapeEvent>();

  readonly events$ = this.eventsSubject.asObservable();

  connect(): void {
    if (this.eventSource) {
      return;
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      // Not authenticated -> don't start SSE (prevents noisy reconnect loops)
      return;
    }

    // Request notification permission on connect
    this.notificationService.requestPermission();

    this.ngZone.runOutsideAngular(() => {
      const url = `/api/events?access_token=${encodeURIComponent(token)}`;
      this.eventSource = new EventSource(url);

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

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.disconnect();
        // Reconnect after 3 seconds (only if still authenticated)
        setTimeout(() => {
          if (this.authService.getAccessToken()) {
            this.connect();
          }
        }, 3000);
      };
    });
  }

  /**
   * Handle browser notifications for scrape events
   */
  private handleNotification(event: ScrapeEvent): void {
    switch (event.type) {
      case 'scrape-start':
        this.notificationService.notifyWorkflowStarted(event.scrapeId || 'unknown');
        break;
      case 'scrape-end':
      case 'scrape-complete':
        if (!event.error) {
          this.notificationService.notifyWorkflowSuccess(event.scrapeId || 'unknown');
        } else {
          this.notificationService.notifyWorkflowFailed(event.scrapeId || 'unknown', event.error);
        }
        break;
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}
