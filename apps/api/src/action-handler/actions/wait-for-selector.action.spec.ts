import { vi } from 'vitest';
import { WaitForSelectorAction } from './wait-for-selector.action';
import { createActionInstance } from 'src/_test/test-utils';

describe('WaitForSelectorAction', () => {
  let action: WaitForSelectorAction;

  beforeEach(() => {
    action = createActionInstance(WaitForSelectorAction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(WaitForSelectorAction).toBeDefined();
  });

  describe('run', () => {
    it('should wait for selector and return true on success', async () => {
      action.params = { selector: '#element' } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);

      const result = await action.run();

      expect(result).toBe(true);
      expect((action as any).page.waitForSelector).toHaveBeenCalledWith(
        '#element',
        {
          timeout: 30000,
        },
      );
    });

    it('should use custom timeout', async () => {
      action.params = { selector: '#el', timeout: 5000 } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);

      await action.run();

      expect((action as any).page.waitForSelector).toHaveBeenCalledWith('#el', {
        timeout: 5000,
      });
    });

    it('should return false when optional and element not found', async () => {
      action.params = { selector: '#missing', optional: true } as any;
      (action as any).page.waitForSelector.mockRejectedValue(
        new Error('Timeout'),
      );

      const result = await action.run();

      expect(result).toBe(false);
      expect((action as any).logger.warn).toHaveBeenCalled();
    });

    it('should throw when required and element not found', async () => {
      action.params = { selector: '#missing' } as any;
      (action as any).page.waitForSelector.mockRejectedValue(
        new Error('Timeout'),
      );

      await expect(action.run()).rejects.toThrow('Timeout');
    });

    it('should skip when condition is not "true"', async () => {
      action.params = { selector: '#el', condition: 'false' } as any;

      const result = await action.run();

      expect(result).toBe(false);
      expect((action as any).page.waitForSelector).not.toHaveBeenCalled();
    });

    it('should proceed when condition is "true"', async () => {
      action.params = { selector: '#el', condition: 'true' } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);

      const result = await action.run();

      expect(result).toBe(true);
    });

    it('should proceed when condition is undefined', async () => {
      action.params = { selector: '#el' } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);

      const result = await action.run();

      expect(result).toBe(true);
    });
  });
});
