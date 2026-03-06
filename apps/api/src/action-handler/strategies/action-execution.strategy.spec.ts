import { vi } from 'vitest';
import { ActionExecutionStrategy } from './action-execution.strategy';

describe('ActionExecutionStrategy', () => {
  let strategy: ActionExecutionStrategy;
  let mockActionFactory: any;

  beforeEach(() => {
    mockActionFactory = {
      create: vi.fn(),
    };
    strategy = new ActionExecutionStrategy(mockActionFactory);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('execute', () => {
    it('should create action and run it', async () => {
      const mockResult = { data: 'result' };
      const mockInstance = { run: vi.fn().mockResolvedValue(mockResult) };
      mockActionFactory.create.mockReturnValue(mockInstance);

      const registeredAction = { name: 'click', actionClass: class {} };
      const page = {};
      const previousData = new Map();
      const scrapeAction = { name: 'test', action: 'click', params: {} };
      const actionHandlerService = {};

      const result = await strategy.execute(
        registeredAction as any,
        page as any,
        previousData as any,
        scrapeAction as any,
        actionHandlerService,
      );

      expect(mockActionFactory.create).toHaveBeenCalledWith(
        registeredAction,
        expect.objectContaining({
          page,
          previousData,
          scrapeAction,
        }),
        actionHandlerService,
      );
      expect(mockInstance.run).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it('should pass optional parameters to context', async () => {
      const mockInstance = { run: vi.fn().mockResolvedValue(null) };
      mockActionFactory.create.mockReturnValue(mockInstance);

      const data = { currentData: {} };
      const storedData = { key: 'val' };
      const variables = { VAR1: 'value1' };

      await strategy.execute(
        { name: 'test', actionClass: class {} } as any,
        {} as any,
        new Map() as any,
        { name: 'test', action: 'test', params: {} } as any,
        {},
        data as any,
        storedData,
        variables,
      );

      expect(mockActionFactory.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data, storedData, variables }),
        expect.anything(),
      );
    });
  });

  describe('canExecute', () => {
    it('should return true for valid registered action', () => {
      expect(
        strategy.canExecute({ name: 'test', actionClass: class {} } as any),
      ).toBe(true);
    });

    it('should return false for null', () => {
      expect(strategy.canExecute(null as any)).toBe(false);
    });

    it('should return false when actionClass is missing', () => {
      expect(
        strategy.canExecute({ name: 'test', actionClass: null } as any),
      ).toBe(false);
    });
  });
});
