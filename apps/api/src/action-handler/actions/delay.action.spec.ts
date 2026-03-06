import { vi } from 'vitest';

// Mock the decorator to avoid side effects
vi.mock('../../_decorators/action.decorator', () => ({
  Action: () => (constructor: any) => constructor,
}));

import { Delay } from './delay.actions';

describe('Delay Action', () => {
  function createDelayAction(params: any) {
    const action = Object.create(Delay.prototype);
    action.params = params;
    action.logger = {
      log: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };
    return action as InstanceType<typeof Delay>;
  }

  it('should delay for specified time', async () => {
    const action = createDelayAction({ time: 10 });
    const start = Date.now();
    await action.run();
    expect(Date.now() - start).toBeGreaterThanOrEqual(5);
  });

  it('should skip delay when condition is not met', async () => {
    const action = createDelayAction({ time: 1000, condition: 'false' });
    const start = Date.now();
    await action.run();
    // Should return immediately without waiting
    expect(Date.now() - start).toBeLessThan(100);
  });

  it('should delay when condition is met', async () => {
    const action = createDelayAction({ time: 10, condition: 'true' });
    await action.run();
    expect(action.logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Condition met'),
    );
  });

  it('should throw for invalid time', async () => {
    const action = createDelayAction({ time: NaN });
    await expect(action.run()).rejects.toThrow('Invalid time value');
  });
});
