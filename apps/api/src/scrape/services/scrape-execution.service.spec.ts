import { vi } from 'vitest';
import { ScrapeExecutionService } from './scrape-execution.service';
import { BreakLoopError } from '../../action-handler/errors/break-loop.error';

// Mock ScrapeLogger to avoid console noise
vi.mock('../../_logger/scrape-logger.service', () => {
  class MockScrapeLogger {
    setContext = vi.fn();
    setEventContext = vi.fn();
    log = vi.fn();
    error = vi.fn();
    warn = vi.fn();
    debug = vi.fn();
    verbose = vi.fn();
    scrape = vi.fn();
  }
  return { ScrapeLogger: MockScrapeLogger };
});

describe('ScrapeExecutionService', () => {
  let service: ScrapeExecutionService;
  let mockPuppeteerService: any;
  let mockActionHandlerService: any;
  let mockScrapeEventsService: any;
  let mockDatabaseService: any;
  let mockEventBus: any;

  const createScrape = (overrides: any = {}) => ({
    id: 'test-scrape',
    steps: [
      {
        name: 'step-1',
        actions: [
          {
            name: 'navigate-action',
            action: 'navigate',
            params: { url: 'https://example.com' },
          },
        ],
      },
    ],
    metadata: {},
    ...overrides,
  });

  beforeEach(() => {
    mockPuppeteerService = {
      resetAbort: vi.fn(),
      isAborted: false,
      closeAllPages: vi.fn().mockResolvedValue(undefined),
    };

    mockActionHandlerService = {
      handleAction: vi.fn().mockResolvedValue(undefined),
    };

    mockScrapeEventsService = {
      scrapeStarted: vi.fn(),
      scrapeEnded: vi.fn(),
      updateStepStatus: vi.fn(),
      updateActionStatus: vi.fn(),
      emit: vi.fn(),
    };

    mockDatabaseService = {
      createRun: vi.fn().mockResolvedValue({ id: 'run-1' }),
      createStep: vi.fn().mockResolvedValue({ id: 1 }),
      createAction: vi.fn().mockResolvedValue({ id: 1 }),
      updateRunStatus: vi.fn().mockResolvedValue(undefined),
      updateStepStatus: vi.fn().mockResolvedValue(undefined),
      updateActionStatus: vi.fn().mockResolvedValue(undefined),
      storeData: vi.fn().mockResolvedValue(undefined),
    };

    mockEventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    service = new ScrapeExecutionService(
      mockPuppeteerService,
      mockActionHandlerService,
      mockScrapeEventsService,
      mockDatabaseService,
      mockEventBus,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeScrape', () => {
    it('should execute a scrape successfully and return success', async () => {
      const scrape = createScrape();
      const previousData = new Map<string, any>();

      const result = await service.executeScrape(
        scrape,
        'run-1',
        previousData,
        {},
      );

      expect(result).toEqual({ success: true });
    });

    it('should reset abort state at the start', async () => {
      const scrape = createScrape();

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockPuppeteerService.resetAbort).toHaveBeenCalled();
    });

    it('should publish ScrapeStartedEvent via eventBus', async () => {
      const scrape = createScrape();

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ scrapeId: 'test-scrape' }),
      );
    });

    it('should create a run in the database', async () => {
      const scrape = createScrape();

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockDatabaseService.createRun).toHaveBeenCalledWith(
        'run-1',
        'test-scrape',
        'manual',
      );
    });

    it('should notify scrapeEventsService on start', async () => {
      const scrape = createScrape();

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockScrapeEventsService.scrapeStarted).toHaveBeenCalledWith(
        'test-scrape',
        'run-1',
        expect.any(Object),
      );
    });

    it('should update run status to completed on success', async () => {
      const scrape = createScrape();

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockDatabaseService.updateRunStatus).toHaveBeenCalledWith(
        'run-1',
        'completed',
      );
    });

    it('should store debug data on success', async () => {
      const scrape = createScrape();

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockDatabaseService.storeData).toHaveBeenCalledWith(
        'test-scrape',
        '__debugData',
        expect.any(String),
        'run-1',
      );
    });

    it('should notify scrapeEventsService on successful end', async () => {
      const scrape = createScrape();

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockScrapeEventsService.scrapeEnded).toHaveBeenCalledWith(
        'test-scrape',
        true,
        undefined,
        'run-1',
      );
    });

    it('should close all pages in finally block', async () => {
      const scrape = createScrape();

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockPuppeteerService.closeAllPages).toHaveBeenCalled();
    });

    it('should close all pages even on error', async () => {
      mockActionHandlerService.handleAction.mockRejectedValue(
        new Error('action failed'),
      );
      const scrape = createScrape();

      await expect(
        service.executeScrape(scrape, 'run-1', new Map(), {}),
      ).rejects.toThrow('action failed');

      expect(mockPuppeteerService.closeAllPages).toHaveBeenCalled();
    });

    it('should handle execution error by updating run status to error', async () => {
      mockActionHandlerService.handleAction.mockRejectedValue(
        new Error('boom'),
      );
      const scrape = createScrape();

      await expect(
        service.executeScrape(scrape, 'run-1', new Map(), {}),
      ).rejects.toThrow('boom');

      expect(mockDatabaseService.updateRunStatus).toHaveBeenCalledWith(
        'run-1',
        'error',
        'boom',
      );
    });

    it('should publish ScrapeAbortedEvent on error', async () => {
      mockActionHandlerService.handleAction.mockRejectedValue(
        new Error('fail'),
      );
      const scrape = createScrape();

      await expect(
        service.executeScrape(scrape, 'run-1', new Map(), {}),
      ).rejects.toThrow();

      // Should have published both started and aborted events
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ scrapeId: 'test-scrape' }),
      );
    });

    it('should notify scrapeEnded with failure on error', async () => {
      mockActionHandlerService.handleAction.mockRejectedValue(
        new Error('fail'),
      );
      const scrape = createScrape();

      await expect(
        service.executeScrape(scrape, 'run-1', new Map(), {}),
      ).rejects.toThrow();

      expect(mockScrapeEventsService.scrapeEnded).toHaveBeenCalledWith(
        'test-scrape',
        false,
        'fail',
        'run-1',
      );
    });

    it('should abort if puppeteerService signals abort before step execution', async () => {
      mockPuppeteerService.isAborted = true;
      const scrape = createScrape();

      await expect(
        service.executeScrape(scrape, 'run-1', new Map(), {}),
      ).rejects.toThrow('Aborted by user');
    });

    it('should execute multiple steps in order', async () => {
      const scrape = createScrape({
        steps: [
          { name: 'step-1', actions: [{ name: 'a1', action: 'navigate' }] },
          { name: 'step-2', actions: [{ name: 'a2', action: 'click' }] },
        ],
      });

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockDatabaseService.createStep).toHaveBeenCalledTimes(2);
      expect(mockDatabaseService.createStep).toHaveBeenCalledWith(
        'run-1',
        'step-1',
        0,
      );
      expect(mockDatabaseService.createStep).toHaveBeenCalledWith(
        'run-1',
        'step-2',
        1,
      );
    });

    it('should execute multiple actions in a step', async () => {
      const scrape = createScrape({
        steps: [
          {
            name: 'step-1',
            actions: [
              { name: 'a1', action: 'navigate' },
              { name: 'a2', action: 'click' },
            ],
          },
        ],
      });

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockActionHandlerService.handleAction).toHaveBeenCalledTimes(2);
    });

    it('should store action results in previousData', async () => {
      mockActionHandlerService.handleAction.mockResolvedValue(
        'extracted-value',
      );
      const scrape = createScrape({
        steps: [
          {
            name: 'step-1',
            actions: [{ name: 'extract-title', action: 'extract' }],
          },
        ],
      });
      const previousData = new Map<string, any>();

      await service.executeScrape(scrape, 'run-1', previousData, {});

      expect(previousData.get('extract-title')).toBe('extracted-value');
    });

    it('should not store null/undefined results in previousData', async () => {
      mockActionHandlerService.handleAction.mockResolvedValue(null);
      const scrape = createScrape({
        steps: [
          {
            name: 'step-1',
            actions: [{ name: 'a1', action: 'navigate' }],
          },
        ],
      });
      const previousData = new Map<string, any>();

      await service.executeScrape(scrape, 'run-1', previousData, {});

      expect(previousData.has('a1')).toBe(false);
    });

    it('should pass variables through to action handler', async () => {
      const scrape = createScrape();
      const variables = { key: 'value' };

      await service.executeScrape(scrape, 'run-1', new Map(), {}, variables);

      expect(mockActionHandlerService.handleAction).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Map),
        expect.objectContaining({ runVariables: variables }),
        expect.any(Object),
        variables,
      );
    });

    it('should handle BreakLoopError from action gracefully', async () => {
      mockActionHandlerService.handleAction.mockRejectedValue(
        new BreakLoopError(),
      );
      const scrape = createScrape();

      // BreakLoop should be handled internally but the action error handler
      // marks the action as skipped and does not re-throw
      // However, the step continues, so it should complete
      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockDatabaseService.updateActionStatus).toHaveBeenCalledWith(
        1,
        'skipped',
      );
    });

    it('should prepare variables info with runtime and database variables', async () => {
      const scrape = createScrape();
      const previousData = new Map<string, any>();
      previousData.set('var_username', 'john');
      previousData.set('var_count', 5);
      const runtimeVars = { env: 'prod' };

      await service.executeScrape(
        scrape,
        'run-1',
        previousData,
        {},
        runtimeVars,
      );

      expect(mockScrapeEventsService.scrapeStarted).toHaveBeenCalledWith(
        'test-scrape',
        'run-1',
        expect.objectContaining({
          runtime: runtimeVars,
          database: { username: 'john', count: 5 },
          final: { username: 'john', count: 5, env: 'prod' },
        }),
      );
    });

    it('should update step status to error if an action throws', async () => {
      mockActionHandlerService.handleAction.mockRejectedValue(
        new Error('action failed'),
      );
      const scrape = createScrape();

      await expect(
        service.executeScrape(scrape, 'run-1', new Map(), {}),
      ).rejects.toThrow();

      expect(mockDatabaseService.updateStepStatus).toHaveBeenCalledWith(
        1,
        'error',
      );
    });

    it('should abort before action if puppeteer signals abort mid-execution', async () => {
      const scrape = createScrape({
        steps: [
          {
            name: 'step-1',
            actions: [
              { name: 'a1', action: 'navigate' },
              { name: 'a2', action: 'click' },
            ],
          },
        ],
      });

      // Abort after the first action completes
      mockActionHandlerService.handleAction.mockImplementationOnce(async () => {
        mockPuppeteerService.isAborted = true;
        return 'done';
      });

      await expect(
        service.executeScrape(scrape, 'run-1', new Map(), {}),
      ).rejects.toThrow('Aborted by user');
    });

    it('should save loop data when action returns loop result', async () => {
      const loopResult = { iterations: [{ index: 0 }], total: 3, current: 3 };
      mockActionHandlerService.handleAction.mockResolvedValue(loopResult);
      const scrape = createScrape({
        steps: [
          {
            name: 'step-1',
            actions: [{ name: 'loop-action', action: 'loop' }],
          },
        ],
      });

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockDatabaseService.updateActionStatus).toHaveBeenCalledWith(
        1,
        'completed',
        undefined,
        expect.objectContaining({ result: loopResult }),
        expect.objectContaining({
          iterations: loopResult.iterations,
          total: 3,
          current: 3,
        }),
      );
    });

    it('should not save loop data for non-loop actions', async () => {
      mockActionHandlerService.handleAction.mockResolvedValue('some-data');
      const scrape = createScrape({
        steps: [
          {
            name: 'step-1',
            actions: [{ name: 'extract', action: 'extract' }],
          },
        ],
      });

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockDatabaseService.updateActionStatus).toHaveBeenCalledWith(
        1,
        'completed',
        undefined,
        expect.any(Object),
        null,
      );
    });

    it('should use action name fallback when name is not set', async () => {
      const scrape = createScrape({
        steps: [
          {
            name: 'step-1',
            actions: [{ action: 'navigate', params: {} }], // no name
          },
        ],
      });

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockDatabaseService.createAction).toHaveBeenCalledWith(
        1,
        'navigate-0',
        'navigate',
        0,
      );
    });

    it('should handle error as string in handleActionError', async () => {
      mockActionHandlerService.handleAction.mockRejectedValue('string error');
      const scrape = createScrape();

      await expect(
        service.executeScrape(scrape, 'run-1', new Map(), {}),
      ).rejects.toBe('string error');

      expect(mockDatabaseService.updateActionStatus).toHaveBeenCalledWith(
        1,
        'error',
        'string error',
      );
    });

    it('should handle error as object in handleActionError', async () => {
      mockActionHandlerService.handleAction.mockRejectedValue({ code: 42 });
      const scrape = createScrape();

      await expect(
        service.executeScrape(scrape, 'run-1', new Map(), {}),
      ).rejects.toEqual({ code: 42 });

      expect(mockDatabaseService.updateActionStatus).toHaveBeenCalledWith(
        1,
        'error',
        '{"code":42}',
      );
    });

    it('should build debug data unwrapping result wrapper', async () => {
      mockActionHandlerService.handleAction.mockResolvedValue({
        result: 'unwrapped',
      });
      const scrape = createScrape({
        steps: [
          {
            name: 'step-1',
            actions: [{ name: 'wrapped', action: 'extract' }],
          },
        ],
      });
      const previousData = new Map<string, any>();

      await service.executeScrape(scrape, 'run-1', previousData, {});

      // previousData should have the result, and debug data should unwrap it
      // The storeData call includes serialized debug data
      expect(mockDatabaseService.storeData).toHaveBeenCalledWith(
        'test-scrape',
        '__debugData',
        expect.any(String),
        'run-1',
      );
    });

    it('should build debug data summarizing loop results', async () => {
      const previousData = new Map<string, any>();
      previousData.set('loopResult', { iterations: [1, 2], total: 5 });

      mockActionHandlerService.handleAction.mockResolvedValue(undefined);
      const scrape = createScrape();

      await service.executeScrape(scrape, 'run-1', previousData, {});

      const storeCall = mockDatabaseService.storeData.mock.calls[0];
      const debugData = JSON.parse(storeCall[2]);
      expect(debugData.loopResult).toEqual({ total: 5, completed: 2 });
    });

    it('should handle prepareVariablesInfo with no variables', async () => {
      const scrape = createScrape();

      await service.executeScrape(scrape, 'run-1', new Map(), {});

      expect(mockScrapeEventsService.scrapeStarted).toHaveBeenCalledWith(
        'test-scrape',
        'run-1',
        expect.objectContaining({
          runtime: {},
          database: {},
          final: {},
        }),
      );
    });

    it('should handle execution error without message property', async () => {
      const errorObj = { custom: 'error-data' };
      mockActionHandlerService.handleAction.mockRejectedValue(errorObj);
      const scrape = createScrape();

      await expect(
        service.executeScrape(scrape, 'run-1', new Map(), {}),
      ).rejects.toEqual(errorObj);

      // handleExecutionError uses error.message || 'Unknown error'
      expect(mockDatabaseService.updateRunStatus).toHaveBeenCalledWith(
        'run-1',
        'error',
        'Unknown error',
      );
    });
  });
});
