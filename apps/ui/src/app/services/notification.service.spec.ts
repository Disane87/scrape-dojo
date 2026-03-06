import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    localStorage.clear();
    service = new NotificationService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('notifications signal', () => {
    it('should start with no notifications', () => {
      expect(service.notifications().length).toBe(0);
      expect(service.hasNotifications()).toBe(false);
    });

    it('should show notification from backend', () => {
      service.showFromBackend({
        notificationId: 'test-1',
        scrapeId: 'scrape-1',
        type: 'success',
        title: 'Success!',
        message: 'Test message',
        autoDismiss: 0,
      });

      expect(service.notifications().length).toBe(1);
      expect(service.hasNotifications()).toBe(true);
      expect(service.currentNotification()?.title).toBe('Success!');
    });

    it('should dismiss notification', () => {
      service.showFromBackend({
        notificationId: 'test-1',
        scrapeId: 'scrape-1',
        type: 'info',
        title: 'Info',
        message: 'Test',
        autoDismiss: 0,
      });

      service.dismiss('test-1');
      expect(service.notifications().length).toBe(0);
    });

    it('should dismiss all notifications', () => {
      service.showFromBackend({
        notificationId: 'test-1',
        scrapeId: 'scrape-1',
        type: 'info',
        title: 'Info 1',
        message: 'Test 1',
        autoDismiss: 0,
      });
      service.showFromBackend({
        notificationId: 'test-2',
        scrapeId: 'scrape-1',
        type: 'error',
        title: 'Error 1',
        message: 'Test 2',
        autoDismiss: 0,
      });

      service.dismissAll();
      expect(service.notifications().length).toBe(0);
    });
  });

  describe('preferences', () => {
    it('should be enabled by default', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should toggle enabled state', () => {
      service.setEnabled(false);
      expect(service.isEnabled()).toBe(false);
      expect(localStorage.getItem('notifications_enabled')).toBe('false');
    });
  });
});
