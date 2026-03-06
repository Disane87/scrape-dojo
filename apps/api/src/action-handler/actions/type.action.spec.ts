import { vi } from 'vitest';

// Mock the decorator to avoid side effects
vi.mock('../../_decorators/action.decorator', () => ({
  Action: () => (constructor: any) => constructor,
}));

import { TypeAction } from './type.action';

describe('TypeAction', () => {
  let action: TypeAction;
  let mockPage: any;
  let mockElement: any;

  beforeEach(() => {
    mockElement = {
      evaluate: vi.fn().mockResolvedValue(true),
      focus: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      type: vi.fn().mockResolvedValue(undefined),
    };

    mockPage = {
      $$: vi.fn().mockResolvedValue([mockElement]),
      keyboard: {
        press: vi.fn().mockResolvedValue(undefined),
      },
      waitForNavigation: vi.fn().mockResolvedValue(undefined),
    };

    action = Object.create(TypeAction.prototype);
    (action as any).page = mockPage;
    (action as any).params = {
      selector: '#username',
      text: 'hello',
      pressEnter: false,
    };
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
    expect(TypeAction).toBeDefined();
  });

  describe('run', () => {
    it('should type text into the selected element', async () => {
      // After typing, readElementValue returns the typed text
      mockElement.evaluate
        .mockResolvedValueOnce(true) // isUsable check
        .mockResolvedValueOnce('hello'); // readElementValue

      await action.run();

      expect(mockPage.$$).toHaveBeenCalledWith('#username');
      expect(mockElement.focus).toHaveBeenCalled();
      expect(mockElement.click).toHaveBeenCalledWith({ clickCount: 3 });
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Backspace');
      expect(mockElement.type).toHaveBeenCalledWith('hello');
    });

    it('should skip typing when condition is "false"', async () => {
      action.params = {
        selector: '#username',
        text: 'hello',
        pressEnter: false,
        condition: 'false',
      } as any;

      await action.run();

      expect(mockPage.$$).not.toHaveBeenCalled();
      expect((action as any).logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Skipping type action'),
      );
    });

    it('should proceed when condition is "true"', async () => {
      action.params = {
        selector: '#username',
        text: 'hello',
        pressEnter: false,
        condition: 'true',
      } as any;

      mockElement.evaluate
        .mockResolvedValueOnce(true) // isUsable check
        .mockResolvedValueOnce('hello'); // readElementValue

      await action.run();

      expect((action as any).logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Condition met'),
      );
      expect(mockPage.$$).toHaveBeenCalledWith('#username');
    });

    it('should mask password in log output', async () => {
      action.params = {
        selector: 'input[type="password"]',
        text: 'secret123',
        pressEnter: false,
      } as any;

      mockElement.evaluate
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce('secret123');

      await action.run();

      expect((action as any).logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('********'),
      );
      // Should NOT contain the actual password in debug log
      const debugCalls = (action as any).logger.debug.mock.calls
        .map((c: any[]) => c[0])
        .filter((msg: string) => msg.includes('Text:'));
      expect(debugCalls[0]).not.toContain('secret123');
    });

    it('should press Enter when pressEnter is true', async () => {
      action.params = {
        selector: '#search',
        text: 'query',
        pressEnter: true,
      } as any;

      mockElement.evaluate
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce('query');

      await action.run();

      expect((action as any).logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Pressing Enter'),
      );
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Enter');
      expect(mockPage.waitForNavigation).toHaveBeenCalled();
    });

    it('should fall back to direct value set when typing does not work', async () => {
      mockElement.evaluate
        .mockResolvedValueOnce(true) // isUsable check
        .mockResolvedValueOnce('') // readElementValue returns empty
        .mockResolvedValueOnce(undefined); // fallback evaluate

      await action.run();

      expect((action as any).logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('falling back to direct value set'),
      );
      // The fallback evaluate call should have been made (3rd evaluate call)
      expect(mockElement.evaluate).toHaveBeenCalledTimes(3);
    });

    it('should throw when no element found for selector', async () => {
      mockPage.$$ = vi.fn().mockResolvedValue([]);

      await expect(action.run()).rejects.toThrow(
        'No element found for selector: #username',
      );
    });

    it('should proceed without condition check when condition is undefined', async () => {
      // Default params have no condition - this tests the condition === undefined branch
      action.params = {
        selector: '#username',
        text: 'hello',
        pressEnter: false,
      } as any;

      mockElement.evaluate
        .mockResolvedValueOnce(true) // isUsable check
        .mockResolvedValueOnce('hello'); // readElementValue

      await action.run();

      // Should NOT have logged any condition-related messages
      const logCalls = (action as any).logger.log.mock.calls.map(
        (c: any[]) => c[0],
      );
      expect(logCalls.every((msg: string) => !msg.includes('Skipping'))).toBe(
        true,
      );
      const debugCalls = (action as any).logger.debug.mock.calls.map(
        (c: any[]) => c[0],
      );
      expect(
        debugCalls.every((msg: string) => !msg.includes('Condition met')),
      ).toBe(true);
    });

    it('should not mask text when selector does not include password', async () => {
      action.params = {
        selector: '#username',
        text: 'mytext',
        pressEnter: false,
      } as any;

      mockElement.evaluate
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce('mytext');

      await action.run();

      const debugCalls = (action as any).logger.debug.mock.calls
        .map((c: any[]) => c[0])
        .filter((msg: string) => msg.includes('Text:'));
      expect(debugCalls[0]).toContain('mytext');
    });

    it('should handle readElementValue returning null (falsy) and trigger fallback', async () => {
      mockElement.evaluate
        .mockResolvedValueOnce(true) // isUsable check
        .mockResolvedValueOnce(null) // readElementValue returns null
        .mockResolvedValueOnce(undefined); // fallback evaluate

      await action.run();

      expect((action as any).logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('falling back to direct value set'),
      );
      expect(mockElement.evaluate).toHaveBeenCalledTimes(3);
    });

    it('should select first usable element from multiple matches', async () => {
      const unusableElement = {
        evaluate: vi.fn().mockResolvedValueOnce(false), // not usable
        focus: vi.fn(),
        click: vi.fn(),
        type: vi.fn(),
      };
      const usableElement = {
        evaluate: vi
          .fn()
          .mockResolvedValueOnce(true) // usable
          .mockResolvedValueOnce('hello'), // readElementValue
        focus: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
        type: vi.fn().mockResolvedValue(undefined),
      };

      mockPage.$$ = vi.fn().mockResolvedValue([unusableElement, usableElement]);

      await action.run();

      expect(usableElement.focus).toHaveBeenCalled();
      expect(unusableElement.focus).not.toHaveBeenCalled();
    });

    it('should fall back to first element when no usable element found', async () => {
      const unusableElement = {
        evaluate: vi
          .fn()
          .mockResolvedValueOnce(false) // isUsable returns false
          .mockResolvedValueOnce('hello'), // readElementValue
        focus: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
        type: vi.fn().mockResolvedValue(undefined),
      };

      mockPage.$$ = vi.fn().mockResolvedValue([unusableElement]);

      await action.run();

      // Should still try to type on the first element as fallback
      expect(unusableElement.focus).toHaveBeenCalled();
      expect(unusableElement.type).toHaveBeenCalledWith('hello');
    });
  });
});
