import { vi } from 'vitest';
import { GetAllElementsAction } from './getAll.action';
import { createActionInstance } from 'src/_test/test-utils';

describe('GetAllElementsAction', () => {
  let action: GetAllElementsAction;

  beforeEach(() => {
    action = createActionInstance(GetAllElementsAction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(GetAllElementsAction).toBeDefined();
  });

  describe('run', () => {
    it('should return all matching elements from page', async () => {
      const mockElements = [{ id: '1' }, { id: '2' }, { id: '3' }];
      action.params = { selector: '.item', element: '' } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);
      (action as any).page.$$.mockResolvedValue(mockElements);

      const result = await action.run();

      expect(result).toEqual(mockElements);
      expect(result).toHaveLength(3);
      expect((action as any).logger.log).toHaveBeenCalledWith(
        'Found 3 elements for selector: .item',
      );
    });

    it('should return empty array when waitForSelector fails', async () => {
      action.params = { selector: '.missing', element: '' } as any;
      (action as any).page.waitForSelector.mockRejectedValue(
        new Error('Timeout'),
      );

      const result = await action.run();

      expect(result).toEqual([]);
      expect((action as any).logger.error).toHaveBeenCalledWith(
        'Selector .missing not found',
      );
    });

    it('should use element handle from data when element param is provided', async () => {
      const mockParent = {
        waitForSelector: vi.fn().mockResolvedValue(true),
        $$: vi.fn().mockResolvedValue([{ id: 'a' }]),
      };
      action.params = { selector: '.child', element: 'parentEl' } as any;
      (action as any).data = { parentEl: mockParent };

      const result = await action.run();

      expect(mockParent.waitForSelector).toHaveBeenCalledWith('.child');
      expect(result).toHaveLength(1);
    });
  });
});
