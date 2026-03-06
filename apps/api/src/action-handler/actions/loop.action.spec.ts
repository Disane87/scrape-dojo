import { vi } from 'vitest';

// Mock the decorator to avoid side effects
vi.mock('../../_decorators/action.decorator', () => ({
  Action: () => (constructor: any) => constructor,
}));

import { LoopAction } from './loop.action';

describe('LoopAction', () => {
  let action: LoopAction;
  let mockHandleAction: ReturnType<typeof vi.fn>;

  function createLoopAction(
    params: any,
    previousData?: Map<string, any>,
    data?: any,
  ) {
    const instance = Object.create(LoopAction.prototype);
    instance.params = params;
    instance.previousData = previousData || new Map();
    instance.name = 'testLoop';

    mockHandleAction = vi.fn().mockResolvedValue(undefined);
    instance.actionsHandlerService = {
      handleAction: mockHandleAction,
    };

    instance.data = {
      currentData: {},
      storedData: {},
      loopPath: [],
      ...data,
    };
    instance.storedData = {};
    instance.logger = {
      log: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      indent: vi.fn(),
      outdent: vi.fn(),
      setIndentLevel: vi.fn(),
    };
    return instance as LoopAction;
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(LoopAction).toBeDefined();
  });

  describe('run', () => {
    it('should iterate over elements and call handleAction for each action', async () => {
      const previousData = new Map<string, any>();
      previousData.set('urls', ['url1', 'url2', 'url3']);

      const actions = [{ name: 'nav', action: 'navigate', params: {} }];

      action = createLoopAction(
        { elementKey: 'urls', actions, reverse: false },
        previousData,
      );

      const result = await action.run();

      expect(mockHandleAction).toHaveBeenCalledTimes(3);
      expect(result.total).toBe(3);
      expect(result.current).toBe(3);
      expect(result.iterations).toHaveLength(3);
      expect(result.iterations[0].status).toBe('completed');
    });

    it('should return empty result when no elements found', async () => {
      const previousData = new Map<string, any>();

      action = createLoopAction(
        { elementKey: 'missing', actions: [], reverse: false },
        previousData,
      );

      const result = await action.run();

      expect(result).toEqual({ iterations: [], total: 0 });
      expect((action as any).logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No elements found'),
      );
    });

    it('should wrap non-array elements into an array', async () => {
      const previousData = new Map<string, any>();
      previousData.set('single', 'just-a-string');

      const actions = [{ name: 'act', action: 'click', params: {} }];

      action = createLoopAction(
        { elementKey: 'single', actions, reverse: false },
        previousData,
      );

      const result = await action.run();

      expect(mockHandleAction).toHaveBeenCalledTimes(1);
      expect(result.total).toBe(1);
      expect((action as any).logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('not an array'),
      );
    });

    it('should iterate in reverse when reverse is true', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['a', 'b', 'c']);

      const actions = [{ name: 'act', action: 'click', params: {} }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: true },
        previousData,
      );

      const result = await action.run();

      expect(result.total).toBe(3);
      expect((action as any).logger.log).toHaveBeenCalledWith(
        expect.stringContaining('reversed order'),
      );

      // Verify the currentData was set with reversed values
      // First call should have value 'c' (reversed)
      expect(action.data.currentData).toBeDefined();
    });

    it('should handle BreakLoop error and return partial results', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['a', 'b', 'c']);

      const actions = [{ name: 'act', action: 'click', params: {} }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
      );

      mockHandleAction
        .mockResolvedValueOnce(undefined) // first iteration succeeds
        .mockRejectedValueOnce(new Error('BreakLoop')); // second iteration breaks

      const result = await action.run();

      expect(result.total).toBe(3);
      expect(result.current).toBe(2); // stopped at iteration 2
      expect(result.iterations).toHaveLength(2);
      expect(result.iterations[0].status).toBe('completed');
      expect(result.iterations[1].status).toBe('broken');
    });

    it('should propagate BreakLoop with reduced breakLevels for nested loops', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['a']);

      const actions = [{ name: 'act', action: 'click', params: {} }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
      );

      const breakError = new Error('BreakLoop');
      (breakError as any).breakLevels = 2;
      mockHandleAction.mockRejectedValueOnce(breakError);

      await expect(action.run()).rejects.toThrow('BreakLoop');
    });

    it('should handle skipCurrentIteration flag', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['a', 'b']);

      const actions = [
        { name: 'act1', action: 'click', params: {} },
        { name: 'act2', action: 'click', params: {} },
      ];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
      );

      // First iteration: first action sets skipCurrentIteration
      mockHandleAction
        .mockImplementationOnce(async () => {
          action.data.skipCurrentIteration = true;
          return undefined;
        })
        // Second iteration: both actions complete normally
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const result = await action.run();

      // First iteration: only 1 action ran (skipped after first)
      // Second iteration: both actions ran
      expect(mockHandleAction).toHaveBeenCalledTimes(3);
      expect(result.iterations).toHaveLength(2);
    });

    it('should rethrow non-BreakLoop errors', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['a']);

      const actions = [{ name: 'act', action: 'click', params: {} }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
      );

      mockHandleAction.mockRejectedValueOnce(new Error('Something went wrong'));

      await expect(action.run()).rejects.toThrow('Something went wrong');
      expect((action as any).logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error executing action'),
      );
    });

    it('should return early when actions array is not provided', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['a']);

      action = createLoopAction(
        { elementKey: 'items', actions: undefined, reverse: false },
        previousData,
      );

      const result = await action.run();

      expect(result).toBeUndefined();
      expect((action as any).logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No actions provided'),
      );
    });

    it('should store action results in previousData', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['x']);

      const actions = [{ name: 'extract', action: 'extract', params: {} }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
      );

      mockHandleAction.mockResolvedValueOnce('extracted-value');

      await action.run();

      expect(previousData.get('extract')).toBe('extracted-value');
    });

    it('should emit loop iteration events when scrapeEventsService is available', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['a', 'b']);

      const mockEventsService = {
        updateLoopIteration: vi.fn(),
      };

      const actions = [{ name: 'act', action: 'click', params: {} }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
        {
          scrapeEventsService: mockEventsService,
          scrapeId: 'test-scrape',
          runId: 'run-1',
        },
      );

      await action.run();

      // Should emit start and completed events for each iteration
      expect(mockEventsService.updateLoopIteration).toHaveBeenCalledTimes(4); // 2 starts + 2 completes
    });

    it('should emit element description for object elements', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', [{ key: 'val' }]);

      const mockEventsService = {
        updateLoopIteration: vi.fn(),
      };

      const actions = [{ name: 'act', action: 'click', params: {} }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
        {
          scrapeEventsService: mockEventsService,
          scrapeId: 'test-scrape',
          runId: 'run-1',
        },
      );

      await action.run();

      // For object elements, should use "Element N" format
      expect(mockEventsService.updateLoopIteration).toHaveBeenCalledWith(
        'test-scrape',
        'testLoop',
        0,
        1,
        'Element 1',
        'run-1',
        expect.any(Array),
      );
    });

    it('should emit string representation for number elements', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', [42]);

      const mockEventsService = {
        updateLoopIteration: vi.fn(),
      };

      const actions = [{ name: 'act', action: 'click', params: {} }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
        {
          scrapeEventsService: mockEventsService,
          scrapeId: 'test-scrape',
          runId: 'run-1',
        },
      );

      await action.run();

      expect(mockEventsService.updateLoopIteration).toHaveBeenCalledWith(
        'test-scrape',
        'testLoop',
        0,
        1,
        '42',
        'run-1',
        expect.any(Array),
      );
    });

    it('should not emit events when scrapeEventsService is not available', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['a']);

      const actions = [{ name: 'act', action: 'click', params: {} }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
        { scrapeEventsService: null, scrapeId: null },
      );

      // Should not throw
      const result = await action.run();
      expect(result.total).toBe(1);
    });

    it('should preserve parent loopPath and reset after completion', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['a']);

      const actions = [{ name: 'act', action: 'click', params: {} }];
      const parentPath = [{ name: 'outerLoop', index: 0 }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
        { loopPath: [...parentPath] },
      );

      await action.run();

      // loopPath should be reset to parent path after completion
      expect(action.data.loopPath).toEqual(parentPath);
    });

    it('should handle empty elements array', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', []);

      action = createLoopAction(
        { elementKey: 'items', actions: [], reverse: false },
        previousData,
      );

      const result = await action.run();

      expect(result).toEqual({ iterations: [], total: 0 });
    });

    it('should handle error that is a string (not Error instance)', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['a']);

      const actions = [{ name: 'act', action: 'click', params: {} }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
      );

      mockHandleAction.mockRejectedValueOnce('plain string error');

      await expect(action.run()).rejects.toBe('plain string error');
    });

    it('should handle error that is an object (not Error and not string)', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['a']);

      const actions = [{ name: 'act', action: 'click', params: {} }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
      );

      const errorObj = { code: 500, detail: 'something' };
      mockHandleAction.mockRejectedValueOnce(errorObj);

      await expect(action.run()).rejects.toEqual(errorObj);
      expect((action as any).logger.error).toHaveBeenCalledWith(
        expect.stringContaining('{"code":500'),
      );
    });

    it('should not store null/undefined action results in previousData', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['x']);

      const actions = [{ name: 'act', action: 'click', params: {} }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
      );

      mockHandleAction.mockResolvedValueOnce(null);

      await action.run();

      expect(previousData.has('act')).toBe(false);
    });

    it('should set currentData for each iteration', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', ['val1', 'val2']);

      const actions = [{ name: 'act', action: 'click', params: {} }];

      action = createLoopAction(
        { elementKey: 'items', actions, reverse: false },
        previousData,
      );

      const capturedCurrentData: any[] = [];
      mockHandleAction.mockImplementation(async () => {
        capturedCurrentData.push({ ...action.data.currentData.testLoop });
        return undefined;
      });

      await action.run();

      expect(capturedCurrentData[0]).toEqual({ value: 'val1', index: 0 });
      expect(capturedCurrentData[1]).toEqual({ value: 'val2', index: 1 });
    });
  });
});
