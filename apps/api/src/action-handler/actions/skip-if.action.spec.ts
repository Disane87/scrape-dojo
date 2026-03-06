import { vi } from 'vitest';
import { SkipIfAction } from './skip-if.action';
import { createActionInstance } from 'src/_test/test-utils';

describe('SkipIfAction', () => {
  let action: SkipIfAction;

  beforeEach(() => {
    action = createActionInstance(SkipIfAction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(SkipIfAction).toBeDefined();
  });

  describe('run', () => {
    it('should skip when condition is truthy and skipIfTrue (default)', async () => {
      action.params = { condition: 'myFlag' } as any;
      (action as any).previousData = new Map([['myFlag', true]]);

      const result = await action.run();
      expect(result).toBe(true);
      expect((action as any).data.skipCurrentIteration).toBe(true);
    });

    it('should not skip when condition is falsy and skipIfTrue (default)', async () => {
      action.params = { condition: 'myFlag' } as any;
      (action as any).previousData = new Map([['myFlag', false]]);

      const result = await action.run();
      expect(result).toBe(false);
    });

    it('should skip when condition is falsy and skipIfFalse is true', async () => {
      action.params = { condition: 'myFlag', skipIfFalse: true } as any;
      (action as any).previousData = new Map([['myFlag', false]]);

      const result = await action.run();
      expect(result).toBe(true);
      expect((action as any).data.skipCurrentIteration).toBe(true);
    });

    it('should throw BreakLoop with breakLevels when breakLoop is true', async () => {
      action.params = {
        condition: 'myFlag',
        breakLoop: true,
        breakLevels: 2,
      } as any;
      (action as any).previousData = new Map([['myFlag', true]]);

      try {
        await action.run();
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e.message).toBe('BreakLoop');
        expect(e.breakLevels).toBe(2);
      }
    });

    it('should use default breakLevels of 1', async () => {
      action.params = { condition: 'myFlag', breakLoop: true } as any;
      (action as any).previousData = new Map([['myFlag', true]]);

      try {
        await action.run();
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e.message).toBe('BreakLoop');
        expect(e.breakLevels).toBe(1);
      }
    });

    it('should use custom message when provided', async () => {
      action.params = {
        condition: 'myFlag',
        message: 'Custom skip message',
      } as any;
      (action as any).previousData = new Map([['myFlag', true]]);

      await action.run();
      expect((action as any).logger.log).toHaveBeenCalledWith(
        'Custom skip message',
      );
    });

    it('should fall back to getValueFromPath when not in previousData', async () => {
      action.params = { condition: 'currentData.someValue' } as any;
      (action as any).previousData = new Map();
      (action as any).data = {
        currentData: { someValue: true },
        skipCurrentIteration: false,
      };

      const result = await action.run();
      expect(result).toBe(true);
    });

    it('should log debug when not skipping', async () => {
      action.params = { condition: 'missing' } as any;
      (action as any).previousData = new Map();

      await action.run();
      expect((action as any).logger.debug).toHaveBeenCalled();
    });
  });
});
