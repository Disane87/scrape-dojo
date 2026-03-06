import { vi } from 'vitest';

// Mock the decorator to avoid side effects
vi.mock('../../_decorators/action.decorator', () => ({
  Action: () => (constructor: any) => constructor,
}));

import { NavigateAction } from './navigate.action';

describe('NavigateAction', () => {
  let action: NavigateAction;
  let mockPage: any;

  beforeEach(() => {
    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
    };

    action = Object.create(NavigateAction.prototype);
    (action as any).page = mockPage;
    (action as any).params = { url: 'https://example.com' };
    (action as any).logger = {
      log: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(NavigateAction).toBeDefined();
  });

  describe('run', () => {
    it('should navigate to the given URL with default options', async () => {
      await action.run();

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      expect((action as any).logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Navigating to: https://example.com'),
      );
      expect((action as any).logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Navigation completed'),
      );
    });

    it('should use custom waitUntil and timeout when provided', async () => {
      action.params = {
        url: 'https://example.com',
        waitUntil: 'networkidle0',
        timeout: 60000,
      } as any;

      await action.run();

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });
    });

    it('should throw error when page is not initialized', async () => {
      (action as any).page = null;

      await expect(action.run()).rejects.toThrow('Page is not initialized');
    });

    it('should retry with domcontentloaded on "frame was detached" error', async () => {
      mockPage.goto
        .mockRejectedValueOnce(new Error('frame was detached'))
        .mockResolvedValueOnce(undefined);

      await action.run();

      expect(mockPage.goto).toHaveBeenCalledTimes(2);
      expect(mockPage.goto).toHaveBeenNthCalledWith(1, 'https://example.com', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      expect(mockPage.goto).toHaveBeenNthCalledWith(2, 'https://example.com', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      expect((action as any).logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Frame detached during navigation, retrying'),
      );
    });

    it('should retry with domcontentloaded on "Navigating frame" error', async () => {
      mockPage.goto
        .mockRejectedValueOnce(new Error('Navigating frame was detached'))
        .mockResolvedValueOnce(undefined);

      await action.run();

      expect(mockPage.goto).toHaveBeenCalledTimes(2);
      expect((action as any).logger.warn).toHaveBeenCalled();
    });

    it('should rethrow non-frame-detached errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED'));

      await expect(action.run()).rejects.toThrow('net::ERR_CONNECTION_REFUSED');
      expect(mockPage.goto).toHaveBeenCalledTimes(1);
    });

    it('should use custom waitUntil but retry still uses domcontentloaded', async () => {
      action.params = {
        url: 'https://example.com',
        waitUntil: 'networkidle2',
        timeout: 15000,
      } as any;

      mockPage.goto
        .mockRejectedValueOnce(new Error('frame was detached'))
        .mockResolvedValueOnce(undefined);

      await action.run();

      expect(mockPage.goto).toHaveBeenNthCalledWith(1, 'https://example.com', {
        waitUntil: 'networkidle2',
        timeout: 15000,
      });
      expect(mockPage.goto).toHaveBeenNthCalledWith(2, 'https://example.com', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
    });
  });
});
