import { vi } from 'vitest';
import { KeyboardPressAction } from './keyboard-press.action';
import { createActionInstance } from 'src/_test/test-utils';

describe('KeyboardPressAction', () => {
  let action: KeyboardPressAction;

  beforeEach(() => {
    action = createActionInstance(KeyboardPressAction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(KeyboardPressAction).toBeDefined();
  });

  describe('run', () => {
    it('should press the specified key', async () => {
      action.params = { key: 'Enter' } as any;
      (action as any).page.keyboard.press.mockResolvedValue(undefined);

      await action.run();

      expect((action as any).page.keyboard.press).toHaveBeenCalledWith('Enter');
      expect((action as any).logger.log).toHaveBeenCalledWith(
        'Key "Enter" pressed',
      );
    });

    it('should press Escape key', async () => {
      action.params = { key: 'Escape' } as any;
      (action as any).page.keyboard.press.mockResolvedValue(undefined);

      await action.run();

      expect((action as any).page.keyboard.press).toHaveBeenCalledWith(
        'Escape',
      );
    });

    it('should throw error when no key provided', async () => {
      action.params = { key: '' } as any;

      await expect(action.run()).rejects.toThrow(
        'No key provided for KeyboardPressAction',
      );
    });

    it('should throw error when key is undefined', async () => {
      action.params = {} as any;

      await expect(action.run()).rejects.toThrow(
        'No key provided for KeyboardPressAction',
      );
    });
  });
});
