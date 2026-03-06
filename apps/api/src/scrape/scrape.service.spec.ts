import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ScrapeService } from './scrape.service';
import { PuppeteerService } from '../puppeteer/puppeteer.service';
import { ScrapeEventsService } from './scrape-events.service';
import { VariablesService } from '../variables/variables.service';
import { ScrapeConfigService } from './services/scrape-config.service';
import { ScrapeVariablesSyncService } from './services/scrape-variables-sync.service';
import { ScrapeSecretsResolverService } from './services/scrape-secrets-resolver.service';
import { ScrapeExecutionService } from './services/scrape-execution.service';
import { ScrapeDataService } from './services/scrape-data.service';
import { ScrapeValidationService } from './services/scrape-validation.service';
import * as fs from 'fs';

vi.mock('fs');

describe('ScrapeService', () => {
  let service: ScrapeService;

  const mockPuppeteerService = {
    abort: vi.fn(),
    closeBrowser: vi.fn().mockResolvedValue(undefined),
  };

  const mockScrapeEventsService = {
    emit: vi.fn(),
  };

  const mockVariablesService = {
    getAsMap: vi.fn().mockResolvedValue({}),
  };

  const mockConfigService = {
    loadScrapeDefinitions: vi.fn().mockReturnValue([]),
    ensureSitesDirectory: vi.fn(),
    getSitesPath: vi.fn().mockReturnValue('/tmp/test-sites'),
  };

  const mockVariablesSyncService = {
    syncWorkflowVariables: vi.fn().mockResolvedValue(undefined),
    syncWorkflowSecrets: vi.fn().mockResolvedValue(undefined),
  };

  const mockSecretsResolverService = {
    resolveSecretsForWorkflow: vi.fn().mockResolvedValue(undefined),
  };

  const mockExecutionService = {
    executeScrape: vi.fn().mockResolvedValue({ success: true }),
  };

  const mockDataService = {
    getStoredDataFromDB: vi
      .fn()
      .mockResolvedValue({ storedData: {}, isFirstRun: true }),
    convertScrapeResultsToJson: vi.fn().mockReturnValue({}),
  };

  const mockValidationService = {
    validateScrape: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);

    // Re-set default mock implementations (clearAllMocks only clears call history, not implementations)
    mockPuppeteerService.closeBrowser.mockResolvedValue(undefined);
    mockVariablesService.getAsMap.mockResolvedValue({});
    mockConfigService.loadScrapeDefinitions.mockReturnValue([]);
    mockVariablesSyncService.syncWorkflowVariables.mockResolvedValue(undefined);
    mockVariablesSyncService.syncWorkflowSecrets.mockResolvedValue(undefined);
    mockSecretsResolverService.resolveSecretsForWorkflow.mockResolvedValue(
      undefined,
    );
    mockExecutionService.executeScrape.mockResolvedValue({ success: true });
    mockDataService.getStoredDataFromDB.mockResolvedValue({
      storedData: {},
      isFirstRun: true,
    });
    mockDataService.convertScrapeResultsToJson.mockReturnValue({});
    mockValidationService.validateScrape.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScrapeService,
        { provide: PuppeteerService, useValue: mockPuppeteerService },
        { provide: ScrapeEventsService, useValue: mockScrapeEventsService },
        { provide: VariablesService, useValue: mockVariablesService },
        { provide: ScrapeConfigService, useValue: mockConfigService },
        {
          provide: ScrapeVariablesSyncService,
          useValue: mockVariablesSyncService,
        },
        {
          provide: ScrapeSecretsResolverService,
          useValue: mockSecretsResolverService,
        },
        { provide: ScrapeExecutionService, useValue: mockExecutionService },
        { provide: ScrapeDataService, useValue: mockDataService },
        { provide: ScrapeValidationService, useValue: mockValidationService },
      ],
    }).compile();

    service = module.get<ScrapeService>(ScrapeService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getScrapeDefinitions', () => {
    it('should return list of scrapes', () => {
      const scrapes = service.getScrapeDefinitions();
      expect(scrapes).toBeDefined();
      expect(Array.isArray(scrapes)).toBe(true);
    });

    it('should return cached definitions on second call', () => {
      mockConfigService.loadScrapeDefinitions.mockReturnValue([{ id: 'test' }]);
      service.getScrapeDefinitions();
      service.getScrapeDefinitions();
      // Should only load once (cached after first call)
      expect(mockConfigService.loadScrapeDefinitions).toHaveBeenCalledTimes(1);
    });

    it('should reload from configService when cache is empty', () => {
      mockConfigService.loadScrapeDefinitions.mockReturnValue([
        { id: 'a' },
        { id: 'b' },
      ]);
      (service as any).scrapeDefinitions = [];

      const result = service.getScrapeDefinitions();

      expect(mockConfigService.loadScrapeDefinitions).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('stopScrape', () => {
    it('should abort and close browser', async () => {
      const result = await service.stopScrape();
      expect(mockPuppeteerService.abort).toHaveBeenCalled();
      expect(mockPuppeteerService.closeBrowser).toHaveBeenCalled();
      expect(result.stopped).toBe(true);
    });

    it('should return expected message', async () => {
      const result = await service.stopScrape();
      expect(result.message).toBe('Scrape stopped and browser closed');
    });
  });

  describe('scrape', () => {
    it('should execute scrape for matching scrapeId', async () => {
      const scrapes = [{ id: 'test-scrape', steps: [] }];
      mockConfigService.loadScrapeDefinitions.mockReturnValue(scrapes);

      // Reset cached definitions
      (service as any).scrapeDefinitions = [];

      const result = await service.scrape('test-scrape');
      expect(mockValidationService.validateScrape).toHaveBeenCalled();
      expect(mockExecutionService.executeScrape).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should skip non-matching scrapes', async () => {
      const scrapes = [{ id: 'other-scrape', steps: [] }];
      mockConfigService.loadScrapeDefinitions.mockReturnValue(scrapes);
      (service as any).scrapeDefinitions = [];

      await service.scrape('test-scrape');
      expect(mockExecutionService.executeScrape).not.toHaveBeenCalled();
    });

    it('should return early if execution was aborted', async () => {
      const scrapes = [{ id: 'test', steps: [] }];
      mockConfigService.loadScrapeDefinitions.mockReturnValue(scrapes);
      (service as any).scrapeDefinitions = [];
      mockExecutionService.executeScrape.mockResolvedValue({ aborted: true });

      const result = await service.scrape('test');
      expect(result.aborted).toBe(true);
    });

    it('should run all scrapes when scrapeId is null', async () => {
      const scrapes = [
        { id: 'scrape-1', steps: [] },
        { id: 'scrape-2', steps: [] },
      ];
      mockConfigService.loadScrapeDefinitions.mockReturnValue(scrapes);
      (service as any).scrapeDefinitions = [];

      await service.scrape(null);

      expect(mockExecutionService.executeScrape).toHaveBeenCalledTimes(2);
    });

    it('should use provided runId', async () => {
      const scrapes = [{ id: 'test', steps: [] }];
      mockConfigService.loadScrapeDefinitions.mockReturnValue(scrapes);
      (service as any).scrapeDefinitions = [];

      await service.scrape('test', 'custom-run-id');

      expect(mockExecutionService.executeScrape).toHaveBeenCalledWith(
        expect.anything(),
        'custom-run-id',
        expect.any(Map),
        expect.anything(),
        undefined,
      );
    });

    it('should pass runtime variables to previousData', async () => {
      const scrapes = [{ id: 'test', steps: [] }];
      mockConfigService.loadScrapeDefinitions.mockReturnValue(scrapes);
      (service as any).scrapeDefinitions = [];

      await service.scrape('test', undefined, { myVar: 'myVal' });

      expect(mockExecutionService.executeScrape).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        expect.any(Map),
        expect.anything(),
        { myVar: 'myVal' },
      );
    });

    it('should set firstRun from stored data', async () => {
      const scrapes = [{ id: 'test', steps: [] }];
      mockConfigService.loadScrapeDefinitions.mockReturnValue(scrapes);
      (service as any).scrapeDefinitions = [];
      mockDataService.getStoredDataFromDB.mockResolvedValue({
        storedData: {},
        isFirstRun: false,
      });

      await service.scrape('test');

      // The previousData should have firstRun set
      const callArgs = mockExecutionService.executeScrape.mock.calls[0];
      const previousData = callArgs[2] as Map<string, any>;
      expect(previousData.get('firstRun')).toBe(false);
    });

    it('should propagate errors from executeScrape', async () => {
      const scrapes = [{ id: 'test', steps: [] }];
      mockConfigService.loadScrapeDefinitions.mockReturnValue(scrapes);
      (service as any).scrapeDefinitions = [];
      mockExecutionService.executeScrape.mockRejectedValue(
        new Error('Execution failed'),
      );

      await expect(service.scrape('test')).rejects.toThrow('Execution failed');
    });

    it('should load DB variables and merge with runtime variables (runtime takes priority)', async () => {
      const scrapes = [{ id: 'test', steps: [] }];
      mockConfigService.loadScrapeDefinitions.mockReturnValue(scrapes);
      (service as any).scrapeDefinitions = [];
      mockVariablesService.getAsMap.mockResolvedValue({
        sharedKey: 'db-value',
        dbOnly: 'db-only',
      });

      await service.scrape('test', undefined, { sharedKey: 'runtime-value' });

      const callArgs = mockExecutionService.executeScrape.mock.calls[0];
      const previousData = callArgs[2] as Map<string, any>;
      // Runtime variables take priority
      expect(previousData.get('var_sharedKey')).toBe('runtime-value');
      // DB-only variables are also present
      expect(previousData.get('var_dbOnly')).toBe('db-only');
    });

    it('should call secretsResolverService for each scrape', async () => {
      const scrapes = [{ id: 'test', steps: [] }];
      mockConfigService.loadScrapeDefinitions.mockReturnValue(scrapes);
      (service as any).scrapeDefinitions = [];

      await service.scrape('test');

      expect(
        mockSecretsResolverService.resolveSecretsForWorkflow,
      ).toHaveBeenCalledWith(scrapes[0], expect.any(Map));
    });

    it('should return convertScrapeResultsToJson in result', async () => {
      const scrapes = [{ id: 'test', steps: [] }];
      mockConfigService.loadScrapeDefinitions.mockReturnValue(scrapes);
      (service as any).scrapeDefinitions = [];
      mockDataService.convertScrapeResultsToJson.mockReturnValue({
        items: [1, 2],
      });

      const result = await service.scrape('test');

      expect(result.result).toEqual({ items: [1, 2] });
      expect(result.scrapeId).toBe('test');
    });
  });

  describe('reloadScrapeDefinitions', () => {
    it('should clear cache and reinitialize', async () => {
      await service.reloadScrapeDefinitions();
      expect(mockScrapeEventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'config-reload' }),
      );
    });

    it('should emit config-reload event with system scrapeId', async () => {
      await service.reloadScrapeDefinitions();
      expect(mockScrapeEventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'config-reload',
          scrapeId: '__system__',
          message: expect.stringContaining('reloaded'),
        }),
      );
    });

    it('should clear scrapeDefinitions cache before reinitializing', async () => {
      (service as any).scrapeDefinitions = [{ id: 'old' }];
      mockConfigService.loadScrapeDefinitions.mockReturnValue([{ id: 'new' }]);

      await service.reloadScrapeDefinitions();

      // After reload, getScrapeDefinitions should return fresh data
      expect(mockConfigService.loadScrapeDefinitions).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close watcher if exists', () => {
      const mockClose = vi.fn();
      (service as any).sitesWatcher = { close: mockClose };
      service.onModuleDestroy();
      expect(mockClose).toHaveBeenCalled();
    });

    it('should not throw if no watcher', () => {
      (service as any).sitesWatcher = null;
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });

  describe('onModuleInit', () => {
    it('should call ensureConfigDirectories and setup watchers', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      service.onModuleInit();

      expect(mockConfigService.ensureSitesDirectory).toHaveBeenCalled();
    });
  });

  describe('private initializeScrapeDefinitions', () => {
    it('should skip parallel execution when already initializing', async () => {
      (service as any).initializingScrapeDefinitions = true;

      await (service as any).initializeScrapeDefinitions();

      // Should not call loadScrapeDefinitions since it skips
      expect(
        mockVariablesSyncService.syncWorkflowVariables,
      ).not.toHaveBeenCalled();
    });

    it('should sync variables and secrets after loading definitions', async () => {
      const scrapes = [{ id: 'test' }];
      mockConfigService.loadScrapeDefinitions.mockReturnValue(scrapes);
      (service as any).scrapeDefinitions = [];
      (service as any).initializingScrapeDefinitions = false;

      await (service as any).initializeScrapeDefinitions();

      expect(
        mockVariablesSyncService.syncWorkflowVariables,
      ).toHaveBeenCalledWith(scrapes);
      expect(mockVariablesSyncService.syncWorkflowSecrets).toHaveBeenCalledWith(
        scrapes,
      );
    });

    it('should reset initializingScrapeDefinitions flag even on error', async () => {
      mockConfigService.loadScrapeDefinitions.mockImplementation(() => {
        throw new Error('Load error');
      });
      (service as any).scrapeDefinitions = [];
      (service as any).initializingScrapeDefinitions = false;

      await (service as any).initializeScrapeDefinitions();

      expect((service as any).initializingScrapeDefinitions).toBe(false);
    });
  });

  describe('private notifyConfigChange', () => {
    it('should clear cache and emit event', () => {
      (service as any).scrapeDefinitions = [{ id: 'old' }];

      (service as any).notifyConfigChange();

      expect((service as any).scrapeDefinitions).toEqual([]);
      expect(mockScrapeEventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'config-reload',
          scrapeId: '__system__',
        }),
      );
    });
  });

  describe('private generateRunId', () => {
    it('should return provided runId if given', () => {
      const result = (service as any).generateRunId('my-run-id');
      expect(result).toBe('my-run-id');
    });

    it('should generate a run ID when none provided', () => {
      const result = (service as any).generateRunId();
      expect(result).toMatch(/^run-\d+-[a-z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const id1 = (service as any).generateRunId();
      const id2 = (service as any).generateRunId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('private setupFileWatchers', () => {
    it('should set up watcher when sites path exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const mockWatcher = { close: vi.fn() };
      vi.mocked(fs.watch).mockReturnValue(mockWatcher as any);

      (service as any).setupFileWatchers();

      expect(fs.watch).toHaveBeenCalled();
      expect((service as any).sitesWatcher).toBe(mockWatcher);
    });

    it('should not set up watcher when sites path does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      (service as any).setupFileWatchers();

      expect(fs.watch).not.toHaveBeenCalled();
    });

    it('should handle watch setup errors gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.watch).mockImplementation(() => {
        throw new Error('Watch failed');
      });

      expect(() => (service as any).setupFileWatchers()).not.toThrow();
    });
  });

  describe('private logScrapeStart', () => {
    it('should not throw with variables', () => {
      expect(() =>
        (service as any).logScrapeStart({ id: 'test' }, 'run-1', {
          foo: 'bar',
        }),
      ).not.toThrow();
    });

    it('should not throw without variables', () => {
      expect(() =>
        (service as any).logScrapeStart({ id: 'test' }, 'run-1'),
      ).not.toThrow();
    });

    it('should not throw with empty variables object', () => {
      expect(() =>
        (service as any).logScrapeStart({ id: 'test' }, 'run-1', {}),
      ).not.toThrow();
    });
  });
});
