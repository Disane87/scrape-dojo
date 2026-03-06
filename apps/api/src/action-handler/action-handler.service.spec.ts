import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ActionHandlerService } from './action-handler.service';
import { PuppeteerService } from '../puppeteer/puppeteer.service';
import { VariablesService } from '../variables/variables.service';
import { ActionFactory } from './factories/action.factory';
import { VariableResolutionStrategy } from './strategies/variable-resolution.strategy';
import { ScrapeLogger } from '../_logger/scrape-logger.service';
import { Logger } from '@nestjs/common';

describe('ActionHandlerService', () => {
  let service: ActionHandlerService;

  const mockPuppeteerService = {
    getPage: vi.fn(),
    getValidPage: vi.fn(),
    closePage: vi.fn(),
    launchBrowser: vi.fn(),
    abort: vi.fn(),
  };

  const mockVariablesService = {
    getVariableValue: vi.fn(),
    getAllVariables: vi.fn(),
    getAsMap: vi.fn().mockResolvedValue({}),
  };

  const mockActionFactory = {
    create: vi.fn(),
  };

  const mockVariableStrategy = {
    resolve: vi.fn().mockResolvedValue({}),
  };

  const mockLogger = {
    setContext: vi.fn(),
    setEventContext: vi.fn(),
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionHandlerService,
        { provide: PuppeteerService, useValue: mockPuppeteerService },
        { provide: VariablesService, useValue: mockVariablesService },
        { provide: ActionFactory, useValue: mockActionFactory },
        { provide: VariableResolutionStrategy, useValue: mockVariableStrategy },
        { provide: ScrapeLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ActionHandlerService>(ActionHandlerService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should log registered actions', () => {
      const loggerSpy = vi.spyOn(Logger.prototype, 'debug');
      service.onModuleInit();
      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe('getAction', () => {
    it('should return action if it exists', () => {
      const action = service.getAction('navigate');
      expect(action).toBeDefined();
    });

    it('should return undefined if action does not exist', () => {
      const action = service.getAction('nonexistent');
      expect(action).toBeUndefined();
    });
  });

  describe('handleAction', () => {
    it('should throw if action not found', async () => {
      const scrapeAction = { action: 'nonexistent', name: 'test' } as any;
      const previousData = new Map();

      await expect(
        service.handleAction(scrapeAction, previousData),
      ).rejects.toThrow(/not found/);
    });

    it('should execute action via factory', async () => {
      const scrapeAction = { action: 'navigate', name: 'test' } as any;
      const previousData = new Map();
      const mockPage = { url: vi.fn().mockReturnValue('http://test.com') };
      mockPuppeteerService.getValidPage.mockResolvedValue(mockPage);
      const mockInstance = { run: vi.fn().mockResolvedValue('result') };
      mockActionFactory.create.mockReturnValue(mockInstance);

      const result = await service.handleAction(scrapeAction, previousData);

      expect(mockActionFactory.create).toHaveBeenCalled();
      expect(mockInstance.run).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should use explicit runVariables over data.runVariables', async () => {
      const scrapeAction = { action: 'navigate', name: 'test' } as any;
      const previousData = new Map();
      const mockPage = { url: vi.fn().mockReturnValue('http://test.com') };
      mockPuppeteerService.getValidPage.mockResolvedValue(mockPage);
      const mockInstance = { run: vi.fn().mockResolvedValue('ok') };
      mockActionFactory.create.mockReturnValue(mockInstance);

      const data = {
        scrapeEventsService: {},
        scrapeId: 'test',
        runId: 'run-1',
        runVariables: { fromData: 'yes' },
      } as any;
      const runVariables = { fromArgs: 'yes' };

      await service.handleAction(
        scrapeAction,
        previousData,
        data,
        {},
        runVariables,
      );

      expect(mockVariableStrategy.resolve).toHaveBeenCalledWith(
        'test',
        runVariables,
      );
    });

    it('should use data.runVariables when no explicit runVariables', async () => {
      const scrapeAction = { action: 'navigate', name: 'test' } as any;
      const previousData = new Map();
      const mockPage = { url: vi.fn().mockReturnValue('http://test.com') };
      mockPuppeteerService.getValidPage.mockResolvedValue(mockPage);
      const mockInstance = { run: vi.fn().mockResolvedValue('ok') };
      mockActionFactory.create.mockReturnValue(mockInstance);

      const data = {
        scrapeEventsService: {},
        scrapeId: 'test',
        runId: 'run-1',
        runVariables: { fromData: 'yes' },
      } as any;

      await service.handleAction(scrapeAction, previousData, data, {});

      expect(mockVariableStrategy.resolve).toHaveBeenCalledWith('test', {
        fromData: 'yes',
      });
    });

    it('should log run-time variables when they exist', async () => {
      const scrapeAction = { action: 'navigate', name: 'test' } as any;
      const previousData = new Map();
      const mockPage = { url: vi.fn().mockReturnValue('http://test.com') };
      mockPuppeteerService.getValidPage.mockResolvedValue(mockPage);
      const mockInstance = { run: vi.fn().mockResolvedValue('ok') };
      mockActionFactory.create.mockReturnValue(mockInstance);

      const runVariables = { key1: 'val1', key2: 'val2' };
      await service.handleAction(
        scrapeAction,
        previousData,
        undefined,
        {},
        runVariables,
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('2 run-time variables'),
      );
    });

    it('should not log run-time variables when empty', async () => {
      const scrapeAction = { action: 'navigate', name: 'test' } as any;
      const previousData = new Map();
      const mockPage = { url: vi.fn().mockReturnValue('http://test.com') };
      mockPuppeteerService.getValidPage.mockResolvedValue(mockPage);
      const mockInstance = { run: vi.fn().mockResolvedValue('ok') };
      mockActionFactory.create.mockReturnValue(mockInstance);

      await service.handleAction(scrapeAction, previousData, undefined, {}, {});

      const logCalls = mockLogger.log.mock.calls.map((c: any) => c[0]);
      expect(
        logCalls.some((m: string) => m.includes('run-time variables')),
      ).toBe(false);
    });

    it('should handle action with no name', async () => {
      const scrapeAction = { action: 'navigate' } as any;
      const previousData = new Map();
      const mockPage = { url: vi.fn().mockReturnValue('http://test.com') };
      mockPuppeteerService.getValidPage.mockResolvedValue(mockPage);
      const mockInstance = { run: vi.fn().mockResolvedValue('ok') };
      mockActionFactory.create.mockReturnValue(mockInstance);

      const result = await service.handleAction(scrapeAction, previousData);
      expect(result).toBe('ok');
    });
  });
});
