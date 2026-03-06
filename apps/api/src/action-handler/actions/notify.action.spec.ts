import { vi } from 'vitest';
import { NotifyAction } from './notify.action';
import { createActionInstance } from 'src/_test/test-utils';

describe('NotifyAction', () => {
  let action: NotifyAction;

  beforeEach(() => {
    action = createActionInstance(NotifyAction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(NotifyAction).toBeDefined();
  });

  describe('run', () => {
    it('should log notification when no events service available', async () => {
      action.params = { title: 'Test', message: 'Hello', type: 'info' } as any;
      (action as any).data = { scrapeEventsService: null };

      const result = await action.run();

      expect(result).toBe(true);
      expect((action as any).logger.warn).toHaveBeenCalled();
      expect((action as any).logger.log).toHaveBeenCalledWith(
        '📢 [INFO] Test: Hello',
      );
    });

    it('should send notification via events service', async () => {
      const mockEventsService = {
        sendNotification: vi.fn().mockResolvedValue(undefined),
      };
      action.params = { title: 'Alert', message: 'Something happened' } as any;
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 'scrape-1',
        runId: 'run-1',
        metadata: {},
      };

      const result = await action.run();

      expect(result).toBe(true);
      expect(mockEventsService.sendNotification).toHaveBeenCalledWith(
        'scrape-1',
        'run-1',
        expect.objectContaining({
          type: 'info',
          title: 'Alert',
          message: 'Something happened',
        }),
      );
    });

    it('should use custom notification type', async () => {
      const mockEventsService = {
        sendNotification: vi.fn().mockResolvedValue(undefined),
      };
      action.params = {
        title: 'Error',
        message: 'Failed',
        type: 'error',
      } as any;
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
        metadata: {},
      };

      await action.run();

      expect(mockEventsService.sendNotification).toHaveBeenCalledWith(
        's1',
        'r1',
        expect.objectContaining({ type: 'error' }),
      );
    });

    it('should include icon URL from metadata', async () => {
      const mockEventsService = {
        sendNotification: vi.fn().mockResolvedValue(undefined),
      };
      action.params = { title: 'Test', message: 'msg' } as any;
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
        metadata: { icon: 'https://example.com/icon.png' },
      };

      await action.run();

      expect(mockEventsService.sendNotification).toHaveBeenCalledWith(
        's1',
        'r1',
        expect.objectContaining({ iconUrl: 'https://example.com/icon.png' }),
      );
    });

    it('should handle relative icon paths', async () => {
      const mockEventsService = {
        sendNotification: vi.fn().mockResolvedValue(undefined),
      };
      action.params = { title: 'Test', message: 'msg' } as any;
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
        metadata: { icon: 'my-icon.svg' },
      };

      await action.run();

      expect(mockEventsService.sendNotification).toHaveBeenCalledWith(
        's1',
        'r1',
        expect.objectContaining({ iconUrl: '/assets/icons/my-icon.svg' }),
      );
    });

    it('should use "unknown" as scrapeId when not available', async () => {
      const mockEventsService = {
        sendNotification: vi.fn().mockResolvedValue(undefined),
      };
      action.params = { title: 'Test', message: 'msg' } as any;
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: null,
        runId: undefined,
        metadata: {},
      };

      await action.run();

      expect(mockEventsService.sendNotification).toHaveBeenCalledWith(
        'unknown',
        undefined,
        expect.anything(),
      );
    });
  });
});
