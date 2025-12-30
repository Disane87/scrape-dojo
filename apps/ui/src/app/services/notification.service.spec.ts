import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationService],
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('notifications', () => {
    it('should show success notification', (done) => {
      service.notifications$.subscribe(notification => {
        expect(notification.type).toBe('success');
        expect(notification.message).toBe('Success!');
        done();
      });

      service.showSuccess('Success!');
    });

    it('should show error notification', (done) => {
      service.notifications$.subscribe(notification => {
        expect(notification.type).toBe('error');
        expect(notification.message).toBe('Error!');
        done();
      });

      service.showError('Error!');
    });

    it('should show info notification', (done) => {
      service.notifications$.subscribe(notification => {
        expect(notification.type).toBe('info');
        expect(notification.message).toBe('Info!');
        done();
      });

      service.showInfo('Info!');
    });

    it('should show warning notification', (done) => {
      service.notifications$.subscribe(notification => {
        expect(notification.type).toBe('warning');
        expect(notification.message).toBe('Warning!');
        done();
      });

      service.showWarning('Warning!');
    });
  });
});
