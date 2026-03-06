import { vi } from 'vitest';
import { BreakAction } from './break.action';
import { createActionInstance } from 'src/_test/test-utils';

describe('BreakAction', () => {
  let action: BreakAction;

  beforeEach(() => {
    action = createActionInstance(BreakAction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(BreakAction).toBeDefined();
  });

  describe('run', () => {
    it('should throw BreakLoop when condition evaluates to true', async () => {
      action.params = { condition: '$boolean(true)' } as any;
      (action as any).previousData = new Map();

      await expect(action.run()).rejects.toThrow('BreakLoop');
      expect((action as any).logger.warn).toHaveBeenCalled();
    });

    it('should not throw when condition evaluates to false', async () => {
      action.params = { condition: '$boolean(false)' } as any;
      (action as any).previousData = new Map();

      await expect(action.run()).resolves.not.toThrow();
    });

    it('should evaluate condition against previousData', async () => {
      action.params = { condition: 'previousData.myKey = "hello"' } as any;
      (action as any).previousData = new Map([['myKey', 'hello']]);

      await expect(action.run()).rejects.toThrow('BreakLoop');
    });

    it('should evaluate condition against storedData', async () => {
      action.params = { condition: 'storedData.counter > 5' } as any;
      (action as any).previousData = new Map();
      (action as any).storedData = { counter: 10 };

      await expect(action.run()).rejects.toThrow('BreakLoop');
    });

    it('should throw original error when JSONata expression is invalid', async () => {
      action.params = { condition: '%%%invalid%%%' } as any;
      (action as any).previousData = new Map();

      await expect(action.run()).rejects.toThrow();
      expect((action as any).logger.error).toHaveBeenCalled();
    });
  });
});
