import { Injectable, signal, computed } from '@angular/core';
import { NotificationRequest, NotificationType } from '@scrape-dojo/shared';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

/** Extended notification with visibility state */
export interface ActiveNotification extends NotificationRequest {
  visible: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private permission: NotificationPermission = 'default';
  private enabled = true;

  // Signal-based notifications for modal display
  private _notifications = signal<ActiveNotification[]>([]);

  /** All active (visible) notifications */
  notifications = computed(() =>
    this._notifications().filter((n) => n.visible),
  );

  /** Current notification to show in modal (most recent) */
  currentNotification = computed(() => {
    const visible = this.notifications();
    return visible.length > 0 ? visible[visible.length - 1] : null;
  });

  /** Has any visible notifications */
  hasNotifications = computed(() => this.notifications().length > 0);

  constructor() {
    this.loadPreference();
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Check if browser notifications are supported
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Check if notifications are enabled by user preference
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Toggle notifications on/off
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('notifications_enabled', String(enabled));
  }

  /**
   * Load preference from localStorage
   */
  private loadPreference(): void {
    const stored = localStorage.getItem('notifications_enabled');
    this.enabled = stored !== 'false'; // Default to true
  }

  /**
   * Request permission to show notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Browser notifications not supported');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Show a browser notification
   */
  async notify(options: NotificationOptions): Promise<void> {
    if (!this.enabled) {
      return;
    }

    if (!this.isSupported()) {
      return;
    }

    // Request permission if not yet granted
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        return;
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        badge: '/favicon.ico',
        silent: false,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Focus window on click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Notify workflow started
   */
  notifyWorkflowStarted(workflowId: string): void {
    this.notify({
      title: '🚀 Workflow Started',
      body: `Workflow "${workflowId}" is now running`,
      tag: `workflow-${workflowId}`,
    });
  }

  /**
   * Notify workflow succeeded
   */
  notifyWorkflowSuccess(workflowId: string): void {
    this.notify({
      title: '✅ Workflow Completed',
      body: `Workflow "${workflowId}" finished successfully`,
      tag: `workflow-${workflowId}`,
    });
  }

  /**
   * Notify workflow failed
   */
  notifyWorkflowFailed(workflowId: string, error?: string): void {
    this.notify({
      title: '❌ Workflow Failed',
      body: error
        ? `Workflow "${workflowId}" failed: ${error}`
        : `Workflow "${workflowId}" failed`,
      tag: `workflow-${workflowId}`,
    });
  }

  // ==========================================
  // Backend Notification Support (Modal + Browser)
  // ==========================================

  /**
   * Show a notification from backend (SSE event)
   */
  showFromBackend(data: {
    notificationId: string;
    scrapeId: string;
    runId?: string;
    type: NotificationType;
    title: string;
    message: string;
    iconUrl?: string;
    browserNotification?: boolean;
    autoDismiss?: number;
  }): void {
    const notification: ActiveNotification = {
      notificationId: data.notificationId,
      scrapeId: data.scrapeId,
      runId: data.runId,
      type: data.type,
      title: data.title,
      message: data.message,
      iconUrl: data.iconUrl,
      browserNotification: data.browserNotification ?? false,
      autoDismiss: data.autoDismiss ?? 5000,
      timestamp: Date.now(),
      visible: true,
    };

    this._notifications.update((list) => [...list, notification]);

    // Show browser notification if requested
    if (data.browserNotification) {
      this.showBrowserNotification(notification);
    }

    // Auto-dismiss if configured
    if (data.autoDismiss && data.autoDismiss > 0) {
      setTimeout(() => {
        this.dismiss(data.notificationId);
      }, data.autoDismiss);
    }
  }

  /**
   * Dismiss a specific notification
   */
  dismiss(notificationId: string): void {
    this._notifications.update((list) =>
      list.map((n) =>
        n.notificationId === notificationId ? { ...n, visible: false } : n,
      ),
    );

    // Cleanup old notifications after a delay
    setTimeout(() => {
      this._notifications.update((list) =>
        list.filter((n) => n.visible || Date.now() - n.timestamp < 60000),
      );
    }, 1000);
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    this._notifications.update((list) =>
      list.map((n) => ({ ...n, visible: false })),
    );
  }

  /**
   * Show browser notification with job icon
   */
  private showBrowserNotification(notification: ActiveNotification): void {
    if (!this.enabled || !this.isSupported() || this.permission !== 'granted') {
      // Try to request permission
      if (this.permission === 'default') {
        this.requestPermission();
      }
      return;
    }

    const iconEmoji = this.getTypeEmoji(notification.type);

    try {
      const browserNotif = new Notification(
        `${iconEmoji} ${notification.title}`,
        {
          body: notification.message,
          icon: notification.iconUrl || '/favicon.ico',
          tag: notification.notificationId,
          badge: '/favicon.ico',
          requireInteraction: notification.autoDismiss === 0,
          silent: false,
        },
      );

      browserNotif.onclick = () => {
        window.focus();
        browserNotif.close();
        this.dismiss(notification.notificationId);
      };

      // Auto-close if configured
      if (notification.autoDismiss && notification.autoDismiss > 0) {
        setTimeout(() => browserNotif.close(), notification.autoDismiss);
      }
    } catch (error) {
      console.error('Failed to show browser notification:', error);
    }
  }

  /**
   * Get emoji for notification type
   */
  private getTypeEmoji(type: NotificationType): string {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  }
}
