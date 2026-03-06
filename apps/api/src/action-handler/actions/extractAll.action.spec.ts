import { vi } from 'vitest';
import { ExtractAllAction } from './extractAll.action';
import { createActionInstance } from 'src/_test/test-utils';

describe('ExtractAllAction', () => {
  let action: ExtractAllAction;

  beforeEach(() => {
    action = createActionInstance(ExtractAllAction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(ExtractAllAction).toBeDefined();
  });

  describe('run', () => {
    it('should extract textContent from multiple elements', async () => {
      const mockElements = [
        {
          getProperty: vi.fn().mockResolvedValue({
            jsonValue: vi.fn().mockResolvedValue('Text 1'),
          }),
        },
        {
          getProperty: vi.fn().mockResolvedValue({
            jsonValue: vi.fn().mockResolvedValue('Text 2'),
          }),
        },
      ];
      action.params = { selector: '.item', element: '', property: '' } as any;
      (action as any).page.evaluate.mockResolvedValue('<div>content</div>');
      (action as any).page.$$.mockResolvedValue(mockElements);

      const result = await action.run();

      expect(result).toEqual(['Text 1', 'Text 2']);
    });

    it('should default property to textContent when not provided', async () => {
      const mockPropHandle = { jsonValue: vi.fn().mockResolvedValue('Hello') };
      const mockElement = {
        getProperty: vi.fn().mockResolvedValue(mockPropHandle),
      };
      action.params = { selector: '.item', element: '', property: '' } as any;
      (action as any).page.evaluate.mockResolvedValue('');
      (action as any).page.$$.mockResolvedValue([mockElement]);

      await action.run();

      expect(mockElement.getProperty).toHaveBeenCalledWith('textContent');
    });

    it('should use getAttribute for data-* attributes', async () => {
      action.params = {
        selector: '.item',
        element: '',
        property: 'data-id',
      } as any;
      (action as any).page.evaluate.mockResolvedValue('');
      const mockEl = { dummy: true };
      (action as any).page.$$.mockResolvedValue([mockEl]);
      // The second evaluate call returns the attribute value
      (action as any).page.evaluate
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('attr-value');

      const result = await action.run();

      expect(result).toEqual(['attr-value']);
    });

    it('should return null when no elements found', async () => {
      action.params = {
        selector: '.missing',
        element: '',
        property: 'textContent',
      } as any;
      (action as any).page.evaluate.mockResolvedValue('');
      (action as any).page.$$.mockResolvedValue([]);

      const result = await action.run();

      expect(result).toBeNull();
      expect((action as any).logger.warn).toHaveBeenCalled();
    });

    it('should filter out empty values', async () => {
      const mockElements = [
        {
          getProperty: vi.fn().mockResolvedValue({
            jsonValue: vi.fn().mockResolvedValue('Value'),
          }),
        },
        {
          getProperty: vi
            .fn()
            .mockResolvedValue({ jsonValue: vi.fn().mockResolvedValue('   ') }),
        },
        {
          getProperty: vi
            .fn()
            .mockResolvedValue({ jsonValue: vi.fn().mockResolvedValue(null) }),
        },
      ];
      action.params = {
        selector: '.item',
        element: '',
        property: 'textContent',
      } as any;
      (action as any).page.evaluate.mockResolvedValue('');
      (action as any).page.$$.mockResolvedValue(mockElements);

      const result = await action.run();

      expect(result).toEqual(['Value']);
    });

    it('should return null on error', async () => {
      action.params = {
        selector: '.item',
        element: '',
        property: 'textContent',
      } as any;
      (action as any).page.evaluate.mockResolvedValue('');
      (action as any).page.$$.mockRejectedValue(new Error('DOM error'));

      const result = await action.run();

      expect(result).toBeNull();
      expect((action as any).logger.error).toHaveBeenCalled();
    });
  });
});
