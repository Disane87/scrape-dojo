import { vi } from 'vitest';
import { ClickAction } from './click.action';

describe('ClickAction', () => {
  let action: ClickAction;
  let mockPage: any /*Partial<Page>*/;
  let mockElementHandle: any;

  beforeEach(() => {
    // Mock Page
    mockPage = {
      waitForSelector: vi.fn(),
    };

    // Mock ElementHandle
    mockElementHandle = {
      waitForSelector: vi.fn(),
      click: vi.fn(),
    };

    // Create minimal action instance
    action = Object.create(ClickAction.prototype);
    (action as any).page = mockPage;
    (action as any).params = {};
    (action as any).data = {};
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
    expect(ClickAction).toBeDefined();
  });

  describe('run', () => {
    it('should click on element using page selector when no element handle provided', async () => {
      const mockSelectorElement = {
        click: vi.fn().mockResolvedValue(undefined),
      };

      mockPage.waitForSelector = vi
        .fn()
        .mockResolvedValue(mockSelectorElement as any);
      action.params = { selector: '#button', element: '' };

      const result = await action.run();

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('#button', {
        timeout: 30000,
      });
      expect(mockSelectorElement.click).toHaveBeenCalled();
      expect((action as any).logger.log).toHaveBeenCalledWith(
        '🖱️ Clicking: #button',
      );
      expect((action as any).logger.debug).toHaveBeenCalledWith(
        '✅ Click completed',
      );
      expect(result).toBe(true);
    });

    it('should click on element handle directly when provided without selector', async () => {
      action.params = { selector: '', element: 'myElement' };
      (action as any).data = { myElement: mockElementHandle };

      mockElementHandle.click = vi.fn().mockResolvedValue(undefined);

      const result = await action.run();

      expect(mockElementHandle.click).toHaveBeenCalled();
      expect((action as any).logger.log).toHaveBeenCalledWith(
        '🖱️ Clicking: myElement',
      );
      expect((action as any).logger.debug).toHaveBeenCalledWith(
        '✅ Click completed',
      );
      expect(result).toBe(true);
    });

    it('should click on element using element handle with selector', async () => {
      const mockSelectorElement = {
        click: vi.fn().mockResolvedValue(undefined),
      };

      action.params = { selector: '.nested', element: 'parentElement' };
      (action as any).data = { parentElement: mockElementHandle };

      mockElementHandle.waitForSelector = vi
        .fn()
        .mockResolvedValue(mockSelectorElement as any);

      const result = await action.run();

      expect(mockElementHandle.waitForSelector).toHaveBeenCalledWith(
        '.nested',
        { timeout: 30000 },
      );
      expect(mockSelectorElement.click).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should use custom timeout when provided', async () => {
      const mockSelectorElement = {
        click: vi.fn().mockResolvedValue(undefined),
      };

      mockPage.waitForSelector = vi
        .fn()
        .mockResolvedValue(mockSelectorElement as any);
      action.params = { selector: '#test', element: '', timeout: 5000 };

      await action.run();

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('#test', {
        timeout: 5000,
      });
    });

    it('should return false and warn when optional element not found on page', async () => {
      mockPage.waitForSelector = vi.fn().mockResolvedValue(null);
      action.params = { selector: '#missing', element: '', optional: true };

      const result = await action.run();

      expect((action as any).logger.warn).toHaveBeenCalledWith(
        '⚠️ Optional element not found: #missing',
      );
      expect(result).toBe(false);
    });

    it('should return false and warn when optional element not found on element handle', async () => {
      action.params = {
        selector: '.missing',
        element: 'parent',
        optional: true,
      };
      (action as any).data = { parent: mockElementHandle };

      mockElementHandle.waitForSelector = vi.fn().mockResolvedValue(null);

      const result = await action.run();

      expect((action as any).logger.warn).toHaveBeenCalledWith(
        '⚠️ Optional element not found: .missing',
      );
      expect(result).toBe(false);
    });

    it('should throw error when required element not found on page', async () => {
      mockPage.waitForSelector = vi.fn().mockResolvedValue(null);
      action.params = { selector: '#missing', element: '' };

      await expect(action.run()).rejects.toThrow('Element not found: #missing');
    });

    it('should throw error when required element not found on element handle', async () => {
      action.params = { selector: '.missing', element: 'parent' };
      (action as any).data = { parent: mockElementHandle };

      mockElementHandle.waitForSelector = vi.fn().mockResolvedValue(null);

      await expect(action.run()).rejects.toThrow('Element not found: .missing');
    });

    it('should return false and warn when optional click fails with error', async () => {
      mockPage.waitForSelector = vi
        .fn()
        .mockRejectedValue(new Error('Timeout'));
      action.params = { selector: '#test', element: '', optional: true };

      const result = await action.run();

      expect((action as any).logger.warn).toHaveBeenCalledWith(
        '⚠️ Optional click failed: #test',
      );
      expect(result).toBe(false);
    });

    it('should throw error when required click fails', async () => {
      const error = new Error('Click failed');
      mockPage.waitForSelector = vi.fn().mockRejectedValue(error);
      action.params = { selector: '#test', element: '' };

      await expect(action.run()).rejects.toThrow('Click failed');
    });

    it('should use element as target name when selector not provided', async () => {
      action.params = { selector: '', element: 'myButton' };
      (action as any).data = { myButton: mockElementHandle };

      mockElementHandle.click = vi.fn().mockResolvedValue(undefined);

      await action.run();

      expect((action as any).logger.log).toHaveBeenCalledWith(
        '🖱️ Clicking: myButton',
      );
    });

    it('should use "element" as default target name when neither selector nor element provided', async () => {
      action.params = { selector: '', element: '' };
      mockPage.waitForSelector = vi.fn().mockResolvedValue({
        click: vi.fn().mockResolvedValue(undefined),
      } as any);

      await action.run();

      expect((action as any).logger.log).toHaveBeenCalledWith(
        '🖱️ Clicking: element',
      );
    });

    it('should show optional flag in log message when optional is true', async () => {
      const mockSelectorElement = {
        click: vi.fn().mockResolvedValue(undefined),
      };

      mockPage.waitForSelector = vi
        .fn()
        .mockResolvedValue(mockSelectorElement as any);
      action.params = { selector: '#test', element: '', optional: true };

      await action.run();

      expect((action as any).logger.log).toHaveBeenCalledWith(
        '🖱️ Clicking: #test (optional)',
      );
    });
  });
});
