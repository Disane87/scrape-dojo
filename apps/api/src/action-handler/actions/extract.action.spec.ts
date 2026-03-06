import { vi } from 'vitest';

// Mock the decorator to avoid side effects
vi.mock('../../_decorators/action.decorator', () => ({
  Action: () => (constructor: any) => constructor,
}));

import { ExtractAction } from './extract.action';

describe('ExtractAction', () => {
  let action: ExtractAction;
  let mockPage: any;

  beforeEach(() => {
    mockPage = {
      $: vi.fn(),
      evaluate: vi.fn(),
    };

    action = Object.create(ExtractAction.prototype);
    (action as any).page = mockPage;
    (action as any).params = {
      selector: '.title',
      element: '',
      property: '',
    };
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
    expect(ExtractAction).toBeDefined();
  });

  describe('run', () => {
    it('should extract textContent by default', async () => {
      const mockProperty = {
        jsonValue: vi.fn().mockResolvedValue('Hello World'),
      };
      const mockElement = {
        getProperty: vi.fn().mockResolvedValue(mockProperty),
      };
      mockPage.$.mockResolvedValue(mockElement);

      const result = await action.run();

      expect(mockPage.$).toHaveBeenCalledWith('.title');
      expect(mockElement.getProperty).toHaveBeenCalledWith('textContent');
      expect(result).toBe('Hello World');
    });

    it('should extract a custom property', async () => {
      action.params = {
        selector: 'a.link',
        element: '',
        property: 'href',
      } as any;

      const mockProperty = {
        jsonValue: vi.fn().mockResolvedValue('https://example.com'),
      };
      const mockElement = {
        getProperty: vi.fn().mockResolvedValue(mockProperty),
      };
      mockPage.$.mockResolvedValue(mockElement);

      const result = await action.run();

      expect(mockElement.getProperty).toHaveBeenCalledWith('href');
      expect(result).toBe('https://example.com');
    });

    it('should return null when element is not found', async () => {
      mockPage.$.mockResolvedValue(null);

      const result = await action.run();

      expect(result).toBeNull();
      expect((action as any).logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Element not found: .title'),
      );
    });

    it('should return null on error', async () => {
      mockPage.$.mockRejectedValue(new Error('Selector timeout'));

      const result = await action.run();

      expect(result).toBeNull();
      expect((action as any).logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Extract error: Selector timeout'),
      );
    });

    it('should trim the extracted text', async () => {
      const mockProperty = {
        jsonValue: vi.fn().mockResolvedValue('  padded text  '),
      };
      const mockElement = {
        getProperty: vi.fn().mockResolvedValue(mockProperty),
      };
      mockPage.$.mockResolvedValue(mockElement);

      const result = await action.run();

      expect(result).toBe('padded text');
    });

    it('should use element handle from data when element param is provided', async () => {
      const mockElementHandle = {
        $: vi.fn(),
      };
      (action as any).data = { container: mockElementHandle };
      action.params = {
        selector: '.child',
        element: 'container',
        property: 'textContent',
      } as any;

      const mockProperty = {
        jsonValue: vi.fn().mockResolvedValue('child text'),
      };
      const mockChild = {
        getProperty: vi.fn().mockResolvedValue(mockProperty),
      };
      mockElementHandle.$.mockResolvedValue(mockChild);

      const result = await action.run();

      expect(mockElementHandle.$).toHaveBeenCalledWith('.child');
      expect(result).toBe('child text');
    });

    it('should use fallback when property jsonValue is falsy', async () => {
      const mockProperty = { jsonValue: vi.fn().mockResolvedValue(null) };
      const mockElement = {
        getProperty: vi.fn().mockResolvedValue(mockProperty),
      };
      mockPage.$.mockResolvedValue(mockElement);
      mockPage.evaluate.mockResolvedValue('fallback value');

      const result = await action.run();

      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(result).toBe('fallback value');
    });

    it('should truncate long text in log preview', async () => {
      const longText = 'A'.repeat(100);
      const mockProperty = { jsonValue: vi.fn().mockResolvedValue(longText) };
      const mockElement = {
        getProperty: vi.fn().mockResolvedValue(mockProperty),
      };
      mockPage.$.mockResolvedValue(mockElement);

      await action.run();

      expect((action as any).logger.log).toHaveBeenCalledWith(
        expect.stringContaining('...'),
      );
    });
  });
});
