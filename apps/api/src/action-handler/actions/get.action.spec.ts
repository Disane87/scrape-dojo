import { vi } from 'vitest';
import { GetElementAction } from './get.action';
import { createActionInstance } from 'src/_test/test-utils';

describe('GetElementAction', () => {
  let action: GetElementAction;

  beforeEach(() => {
    action = createActionInstance(GetElementAction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(GetElementAction).toBeDefined();
  });

  describe('run', () => {
    it('should get element from page using selector', async () => {
      const mockElement = { id: 'found' };
      action.params = { selector: '#test', element: '' } as any;
      (action as any).page.waitForSelector.mockResolvedValue(mockElement);
      (action as any).page.$.mockResolvedValue(mockElement);

      const result = await action.run();

      expect((action as any).page.waitForSelector).toHaveBeenCalledWith(
        '#test',
      );
      expect((action as any).page.$).toHaveBeenCalledWith('#test');
      expect(result).toBe(mockElement);
    });

    it('should return null when waitForSelector fails', async () => {
      action.params = { selector: '#missing', element: '' } as any;
      (action as any).page.waitForSelector.mockRejectedValue(
        new Error('Timeout'),
      );

      const result = await action.run();

      expect(result).toBeNull();
      expect((action as any).logger.error).toHaveBeenCalledWith(
        'Selector #missing not found',
      );
    });

    it('should return null when element not found after waiting', async () => {
      action.params = { selector: '#missing', element: '' } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);
      (action as any).page.$.mockResolvedValue(null);

      const result = await action.run();

      expect(result).toBeNull();
      expect((action as any).logger.error).toHaveBeenCalledWith(
        'Element with selector #missing not found',
      );
    });

    it('should use element handle from data when element param is provided', async () => {
      const mockParent = {
        waitForSelector: vi.fn().mockResolvedValue(true),
        $: vi.fn().mockResolvedValue({ id: 'child' }),
      };
      action.params = { selector: '.child', element: 'parentEl' } as any;
      (action as any).data = { parentEl: mockParent };

      const result = await action.run();

      expect(mockParent.waitForSelector).toHaveBeenCalledWith('.child');
      expect(mockParent.$).toHaveBeenCalledWith('.child');
      expect(result).toEqual({ id: 'child' });
    });

    it('should log success message when element found', async () => {
      action.params = { selector: '.btn', element: '' } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);
      (action as any).page.$.mockResolvedValue({ id: 'btn' });

      await action.run();

      expect((action as any).logger.log).toHaveBeenCalledWith(
        'Element found for selector: .btn',
      );
    });
  });
});
