import { vi } from 'vitest';

// Mock the decorator to avoid side effects
vi.mock('../../_decorators/action.decorator', () => ({
  Action: () => (constructor: any) => constructor,
}));

import { TransformAction } from './transform.action';

describe('TransformAction', () => {
  let action: TransformAction;

  function createAction(
    params: any,
    previousData?: Map<string, any>,
    data?: any,
    variables?: Record<string, string>,
  ) {
    const instance = Object.create(TransformAction.prototype);
    instance.params = params;
    instance.previousData = previousData || new Map();
    instance.data = data || {};
    instance.variables = variables || {};
    instance.logger = {
      log: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    return instance as TransformAction;
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(TransformAction).toBeDefined();
  });

  describe('run', () => {
    it('should throw when expression is missing', async () => {
      action = createAction({ expression: '' });

      await expect(action.run()).rejects.toThrow(
        'Missing required parameter: expression',
      );
    });

    it('should transform data using previousDataKey as root', async () => {
      const previousData = new Map<string, any>();
      previousData.set('items', [1, 2, 3]);

      action = createAction(
        { expression: '$sum($)', previousDataKey: 'items' },
        previousData,
      );

      const result = await action.run();

      expect(result).toBe(6);
    });

    it('should transform data using previousDataKeys to build an object', async () => {
      const previousData = new Map<string, any>();
      previousData.set('firstName', 'John');
      previousData.set('lastName', 'Doe');

      action = createAction(
        {
          expression: 'firstName & " " & lastName',
          previousDataKeys: ['firstName', 'lastName'],
        },
        previousData,
      );

      const result = await action.run();

      expect(result).toBe('John Doe');
    });

    it('should transform data using params.data as root', async () => {
      action = createAction({
        expression: 'greeting & " " & name',
        data: { greeting: 'Hello', name: 'World' },
      });

      const result = await action.run();

      expect(result).toBe('Hello World');
    });

    it('should use all previousData as root when no key specified', async () => {
      const previousData = new Map<string, any>();
      previousData.set('x', 10);
      previousData.set('y', 20);

      action = createAction({ expression: 'x + y' }, previousData);

      const result = await action.run();

      expect(result).toBe(30);
    });

    it('should add currentData to context when available', async () => {
      const previousData = new Map<string, any>();
      previousData.set('base', 100);

      action = createAction(
        { expression: 'base + currentData.offset' },
        previousData,
        { currentData: { offset: 5 } },
      );

      const result = await action.run();

      expect(result).toBe(105);
    });

    it('should throw and log on jsonata expression error', async () => {
      action = createAction({
        expression: '$invalidFunction!!!',
      });

      await expect(action.run()).rejects.toThrow();
      expect((action as any).logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during data transformation'),
      );
    });

    it('should bind variables as jsonata bindings', async () => {
      const previousData = new Map<string, any>();
      previousData.set('price', 100);

      action = createAction(
        { expression: 'price * $taxRate' },
        previousData,
        {},
        { taxRate: 1.2 as any },
      );

      const result = await action.run();

      expect(result).toBe(120);
    });

    it('should handle previousData accessible via previousData path', async () => {
      const previousData = new Map<string, any>();
      previousData.set('count', 42);

      action = createAction({ expression: 'previousData.count' }, previousData);

      const result = await action.run();

      expect(result).toBe(42);
    });
  });
});
