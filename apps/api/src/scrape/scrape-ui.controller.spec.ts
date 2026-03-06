import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ScrapeUIController } from './scrape-ui.controller';
import { ScrapeService } from './scrape.service';
import { ScrapeEventsService } from './scrape-events.service';
import { SchedulerService } from './scheduler.service';
import { DatabaseService } from '../database/database.service';
import { AuthorResolverService } from './author-resolver.service';
import { of } from 'rxjs';

describe('ScrapeUIController', () => {
  let controller: ScrapeUIController;
  let mockScrapeService: any;
  let mockScrapeEventsService: any;
  let mockSchedulerService: any;
  let mockDatabaseService: any;
  let mockAuthorResolverService: any;

  const createMockResponse = () => {
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      req: { params: {} },
    };
    return res;
  };

  beforeEach(async () => {
    mockScrapeService = {
      getScrapeDefinitions: vi.fn().mockReturnValue([]),
      reloadScrapeDefinitions: vi.fn().mockResolvedValue(undefined),
      scrape: vi.fn().mockResolvedValue({ success: true }),
    };

    mockScrapeEventsService = {
      getEvents: vi.fn().mockReturnValue(of({ type: 'test' })),
      getConnectionStatus: vi.fn().mockReturnValue({ connected: true }),
      pingConnections: vi.fn().mockReturnValue({ pinged: true }),
      getStoredLogs: vi.fn().mockReturnValue([]),
      getWorkflowEvents: vi.fn().mockReturnValue([]),
      clearStoredLogs: vi.fn(),
      clearWorkflowEvents: vi.fn(),
      executeOtpAction: vi.fn().mockResolvedValue(true),
      submitOtp: vi.fn(),
      clearWorkflowEventsForRun: vi.fn(),
      clearWorkflowEventsForScrape: vi.fn(),
    };

    mockSchedulerService = {
      scheduleJob: vi.fn().mockResolvedValue(undefined),
      removeJob: vi.fn(),
      getStatus: vi.fn().mockReturnValue({ jobs: [] }),
    };

    mockDatabaseService = {
      getLastRunForEachScrape: vi.fn().mockResolvedValue(new Map()),
      getRunsByScrapeId: vi.fn().mockResolvedValue([]),
      getRecentRuns: vi.fn().mockResolvedValue([]),
      getRun: vi.fn().mockResolvedValue(null),
      toRunHistoryDTO: vi
        .fn()
        .mockImplementation((run) => ({ ...run, steps: [] })),
      toScrapeDataDTO: vi.fn().mockImplementation((d) => d),
      toScheduleDTO: vi.fn().mockReturnValue(null),
      getJobData: vi.fn().mockResolvedValue([]),
      getRunDataByRunId: vi.fn().mockResolvedValue([]),
      getAllScrapeData: vi.fn().mockResolvedValue({ jobLevel: [], runs: {} }),
      getSchedule: vi.fn().mockResolvedValue(null),
      getAllSchedules: vi.fn().mockResolvedValue([]),
      updateScheduleConfig: vi.fn().mockResolvedValue({
        scheduleEnabled: false,
        cronExpression: null,
        timezone: 'Europe/Berlin',
      }),
      deleteRun: vi.fn().mockResolvedValue(undefined),
      deleteRunsByScrapeId: vi.fn().mockResolvedValue(5),
      clearOldData: vi.fn().mockResolvedValue(undefined),
      dataSource: {
        getRepository: vi.fn().mockReturnValue({
          findOne: vi.fn().mockResolvedValue(null),
        }),
      },
    };

    mockAuthorResolverService = {
      resolveMetadata: vi
        .fn()
        .mockImplementation((meta) => Promise.resolve(meta || {})),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScrapeUIController],
      providers: [
        { provide: ScrapeService, useValue: mockScrapeService },
        { provide: ScrapeEventsService, useValue: mockScrapeEventsService },
        { provide: SchedulerService, useValue: mockSchedulerService },
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: AuthorResolverService, useValue: mockAuthorResolverService },
      ],
    }).compile();

    controller = module.get<ScrapeUIController>(ScrapeUIController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============ GET /scrapes ============

  describe('getScrapes', () => {
    it('should return empty array when no definitions', async () => {
      const result = await controller.getScrapes();
      expect(result).toEqual([]);
    });

    it('should return scrape list items with metadata and lastRun', async () => {
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        {
          id: 'scrape-1',
          steps: [{ name: 's1' }],
          metadata: { title: 'Test' },
        },
      ]);
      const lastRunMap = new Map();
      lastRunMap.set('scrape-1', {
        status: 'completed',
        startTime: new Date(1000),
        endTime: new Date(2000),
      });
      mockDatabaseService.getLastRunForEachScrape.mockResolvedValue(lastRunMap);

      const result = await controller.getScrapes();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('scrape-1');
      expect(result[0].stepsCount).toBe(1);
      expect(result[0].lastRun).toBeDefined();
      expect(result[0].lastRun.status).toBe('completed');
    });

    it('should resolve metadata via authorResolverService', async () => {
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        { id: 's1', steps: [], metadata: { author: 'user' } },
      ]);
      mockAuthorResolverService.resolveMetadata.mockResolvedValue({
        author: { name: 'User', avatar: 'url' },
      });

      const result = await controller.getScrapes();

      expect(mockAuthorResolverService.resolveMetadata).toHaveBeenCalled();
      expect(result[0].metadata.author).toEqual({
        name: 'User',
        avatar: 'url',
      });
    });

    it('should throw on error', async () => {
      mockScrapeService.getScrapeDefinitions.mockImplementation(() => {
        throw new Error('load failed');
      });

      await expect(controller.getScrapes()).rejects.toThrow(
        'Failed to load scrapes: load failed',
      );
    });

    it('should handle scrape with no steps', async () => {
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        { id: 'scrape-no-steps', metadata: {} },
      ]);

      const result = await controller.getScrapes();

      expect(result[0].stepsCount).toBe(0);
    });

    it('should handle lastRun with null startTime', async () => {
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        { id: 'scrape-1', steps: [], metadata: {} },
      ]);
      const lastRunMap = new Map();
      lastRunMap.set('scrape-1', {
        status: 'running',
        startTime: null,
        endTime: null,
      });
      mockDatabaseService.getLastRunForEachScrape.mockResolvedValue(lastRunMap);

      const result = await controller.getScrapes();

      expect(result[0].lastRun).toBeDefined();
      expect(result[0].lastRun.status).toBe('running');
      expect(result[0].lastRun.endTime).toBeUndefined();
    });

    it('should handle failed run status mapping', async () => {
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        { id: 'scrape-1', steps: [], metadata: {} },
      ]);
      const lastRunMap = new Map();
      lastRunMap.set('scrape-1', {
        status: 'failed',
        startTime: new Date(1000),
        endTime: new Date(2000),
      });
      mockDatabaseService.getLastRunForEachScrape.mockResolvedValue(lastRunMap);

      const result = await controller.getScrapes();

      expect(result[0].lastRun.status).toBe('failed');
    });

    it('should handle unknown run status mapping to completed', async () => {
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        { id: 'scrape-1', steps: [], metadata: {} },
      ]);
      const lastRunMap = new Map();
      lastRunMap.set('scrape-1', {
        status: 'unknown-status',
        startTime: new Date(1000),
      });
      mockDatabaseService.getLastRunForEachScrape.mockResolvedValue(lastRunMap);

      const result = await controller.getScrapes();

      expect(result[0].lastRun.status).toBe('completed');
    });

    it('should resolve variable options for select variables', async () => {
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        {
          id: 'scrape-1',
          steps: [],
          metadata: {
            variables: [{ name: 'v1', type: 'text' }],
          },
        },
      ]);
      mockAuthorResolverService.resolveMetadata.mockResolvedValue({
        variables: [{ name: 'v1', type: 'text' }],
      });

      const result = await controller.getScrapes();

      expect(result[0].metadata.variables).toBeDefined();
    });

    it('should handle metadata without variables', async () => {
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        { id: 'scrape-1', steps: [], metadata: { title: 'Test' } },
      ]);
      mockAuthorResolverService.resolveMetadata.mockResolvedValue({
        title: 'Test',
      });

      const result = await controller.getScrapes();

      expect(result[0].metadata).toEqual({ title: 'Test' });
    });
  });

  // ============ POST /scrapes/reload ============

  describe('reloadScrapes', () => {
    it('should call reloadScrapeDefinitions and return success', async () => {
      const result = await controller.reloadScrapes();

      expect(mockScrapeService.reloadScrapeDefinitions).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  // ============ GET /scrapes/:id ============

  describe('getScrapeById', () => {
    it('should return a scrape by id', async () => {
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        { id: 'scrape-1', steps: [], metadata: {} },
      ]);

      const result = await controller.getScrapeById('scrape-1');

      expect(result.id).toBe('scrape-1');
    });

    it('should throw if scrape not found', async () => {
      mockScrapeService.getScrapeDefinitions.mockReturnValue([]);

      await expect(controller.getScrapeById('non-existent')).rejects.toThrow(
        'Failed to load scrape',
      );
    });

    it('should resolve variable options when scrape has select variables', async () => {
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        {
          id: 'scrape-1',
          steps: [],
          metadata: {
            variables: [{ name: 'v1', type: 'text' }],
          },
        },
      ]);

      const result = await controller.getScrapeById('scrape-1');

      expect(result.id).toBe('scrape-1');
    });

    it('should handle scrape without metadata variables', async () => {
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        { id: 'scrape-1', steps: [], metadata: {} },
      ]);

      const result = await controller.getScrapeById('scrape-1');

      expect(result.metadata).toEqual({});
    });

    it('should handle scrape with null metadata', async () => {
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        { id: 'scrape-1', steps: [] },
      ]);

      const result = await controller.getScrapeById('scrape-1');

      expect(result.id).toBe('scrape-1');
    });
  });

  // ============ POST /run/:scrapeId ============

  describe('runScrape', () => {
    it('should run a scrape and return OK', async () => {
      const res = createMockResponse();
      res.req.params.scrapeId = 'scrape-1';

      await controller.runScrape(
        { runId: 'run-1', variables: { key: 'val' } },
        res,
      );

      expect(mockScrapeService.scrape).toHaveBeenCalledWith(
        'scrape-1',
        'run-1',
        { key: 'val' },
      );
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should return 500 on scrape failure', async () => {
      mockScrapeService.scrape.mockRejectedValue(new Error('exec failed'));
      const res = createMockResponse();
      res.req.params.scrapeId = 'scrape-1';

      await controller.runScrape({}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Scrape execution failed' }),
      );
    });
  });

  // ============ SSE /events ============

  describe('events', () => {
    it('should return an observable that emits stringified events', async () => {
      mockScrapeEventsService.getEvents.mockReturnValue(
        of({ type: 'test-event' }),
      );

      const obs = controller.events();
      const result = await new Promise<any>((resolve) => {
        obs.subscribe((event) => resolve(event));
      });
      expect(result.data).toBe(JSON.stringify({ type: 'test-event' }));
    });
  });

  // ============ GET /events/status ============

  describe('getEventsStatus', () => {
    it('should return connection status', () => {
      mockScrapeEventsService.getConnectionStatus.mockReturnValue({
        connected: true,
      });

      const result = controller.getEventsStatus();

      expect(result).toEqual({ connected: true });
    });
  });

  // ============ POST /events/ping ============

  describe('pingEvents', () => {
    it('should call pingConnections', () => {
      controller.pingEvents();

      expect(mockScrapeEventsService.pingConnections).toHaveBeenCalled();
    });
  });

  // ============ GET /logs ============

  describe('getLogs', () => {
    it('should combine and sort logs and workflow events', () => {
      mockScrapeEventsService.getStoredLogs.mockReturnValue([
        { timestamp: 200, message: 'log2' },
        { timestamp: 100, message: 'log1' },
      ]);
      mockScrapeEventsService.getWorkflowEvents.mockReturnValue([
        { timestamp: 150, message: 'event1' },
      ]);

      const result = controller.getLogs();

      expect(result).toHaveLength(3);
      expect(result[0].timestamp).toBe(100);
      expect(result[1].timestamp).toBe(150);
      expect(result[2].timestamp).toBe(200);
    });

    it('should limit to 500 events', () => {
      const manyLogs = Array.from({ length: 600 }, (_, i) => ({
        timestamp: i,
      }));
      mockScrapeEventsService.getStoredLogs.mockReturnValue(manyLogs);
      mockScrapeEventsService.getWorkflowEvents.mockReturnValue([]);

      const result = controller.getLogs();

      expect(result).toHaveLength(500);
    });
  });

  // ============ POST /logs/clear ============

  describe('clearLogs', () => {
    it('should clear stored logs and workflow events', () => {
      const res = createMockResponse();

      controller.clearLogs(res);

      expect(mockScrapeEventsService.clearStoredLogs).toHaveBeenCalled();
      expect(mockScrapeEventsService.clearWorkflowEvents).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });

  // ============ POST /otp-action/:requestId ============

  describe('executeOtpAction', () => {
    it('should return OK on success', async () => {
      const res = createMockResponse();

      await controller.executeOtpAction('req-1', { selector: '#btn' }, res);

      expect(mockScrapeEventsService.executeOtpAction).toHaveBeenCalledWith(
        'req-1',
        '#btn',
      );
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should return BAD_REQUEST when action fails', async () => {
      mockScrapeEventsService.executeOtpAction.mockResolvedValue(false);
      const res = createMockResponse();

      await controller.executeOtpAction('req-1', { selector: '#btn' }, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('should return 500 on exception', async () => {
      mockScrapeEventsService.executeOtpAction.mockRejectedValue(
        new Error('otp error'),
      );
      const res = createMockResponse();

      await controller.executeOtpAction('req-1', { selector: '#btn' }, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  // ============ POST /otp/:requestId ============

  describe('submitOtp', () => {
    it('should submit OTP and return OK', () => {
      const res = createMockResponse();

      controller.submitOtp('req-1', { code: '123456' }, res);

      expect(mockScrapeEventsService.submitOtp).toHaveBeenCalledWith(
        'req-1',
        '123456',
      );
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should return BAD_REQUEST on error', () => {
      mockScrapeEventsService.submitOtp.mockImplementation(() => {
        throw new Error('invalid');
      });
      const res = createMockResponse();

      controller.submitOtp('req-1', { code: 'bad' }, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  // ============ GET /runs ============

  describe('getRuns', () => {
    it('should get recent runs when no scrapeId', async () => {
      mockDatabaseService.getRecentRuns.mockResolvedValue([]);

      const result = await controller.getRuns(undefined, 50);

      expect(mockDatabaseService.getRecentRuns).toHaveBeenCalledWith(50);
      expect(result).toEqual([]);
    });

    it('should filter by scrapeId when provided', async () => {
      mockDatabaseService.getRunsByScrapeId.mockResolvedValue([]);

      await controller.getRuns('scrape-1', 10);

      expect(mockDatabaseService.getRunsByScrapeId).toHaveBeenCalledWith(
        'scrape-1',
        10,
      );
    });

    it('should enrich runs with workflow structure', async () => {
      const run = { id: 'run-1', scrapeId: 'scrape-1' };
      mockDatabaseService.getRecentRuns.mockResolvedValue([run]);
      mockDatabaseService.toRunHistoryDTO.mockReturnValue({
        ...run,
        steps: [],
      });
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        { id: 'scrape-1', steps: [{ name: 's1', actions: [] }] },
      ]);

      const result = await controller.getRuns();

      expect(result).toHaveLength(1);
    });

    it('should filter out null runs', async () => {
      mockDatabaseService.getRecentRuns.mockResolvedValue([
        null,
        { id: 'run-1', scrapeId: 's1' },
      ]);
      mockDatabaseService.toRunHistoryDTO.mockImplementation((r) =>
        r ? { ...r, steps: [] } : null,
      );

      const result = await controller.getRuns();

      expect(result).toHaveLength(1);
    });

    it('should handle enrichment error gracefully', async () => {
      const run = { id: 'run-1', scrapeId: 'scrape-1' };
      mockDatabaseService.getRecentRuns.mockResolvedValue([run]);
      mockDatabaseService.toRunHistoryDTO.mockReturnValue({
        ...run,
        steps: [],
      });
      mockScrapeService.getScrapeDefinitions.mockImplementation(() => {
        throw new Error('definition missing');
      });

      const result = await controller.getRuns();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('run-1');
    });

    it('should handle run without scrapeId', async () => {
      const run = { id: 'run-1', scrapeId: null };
      mockDatabaseService.getRecentRuns.mockResolvedValue([run]);
      mockDatabaseService.toRunHistoryDTO.mockReturnValue({
        ...run,
        steps: [],
      });

      const result = await controller.getRuns();

      expect(result).toHaveLength(1);
    });

    it('should handle run with scrapeId but no matching definition', async () => {
      const run = { id: 'run-1', scrapeId: 'scrape-1' };
      mockDatabaseService.getRecentRuns.mockResolvedValue([run]);
      mockDatabaseService.toRunHistoryDTO.mockReturnValue({
        ...run,
        steps: [],
      });
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        { id: 'other-scrape', steps: [] },
      ]);

      const result = await controller.getRuns();

      expect(result).toHaveLength(1);
    });

    it('should enrich run with loop actions containing nestedActions', async () => {
      const run = { id: 'run-1', scrapeId: 'scrape-1' };
      mockDatabaseService.getRecentRuns.mockResolvedValue([run]);
      mockDatabaseService.toRunHistoryDTO.mockReturnValue({
        ...run,
        steps: [
          {
            name: 'step-1',
            actions: [
              {
                name: 'loop-action',
                actionType: 'loop',
                loopIterations: [
                  { childActions: [{ name: 'inner', status: 'completed' }] },
                ],
              },
            ],
          },
        ],
      });
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        {
          id: 'scrape-1',
          steps: [
            {
              name: 'step-1',
              actions: [
                {
                  name: 'loop-action',
                  action: 'loop',
                  params: {
                    actions: [{ name: 'inner', action: 'click' }],
                  },
                },
              ],
            },
          ],
        },
      ]);

      const result = await controller.getRuns();

      expect(result).toHaveLength(1);
      const loopAction = result[0].steps[0].actions[0];
      expect(loopAction.nestedActions).toBeDefined();
      expect(loopAction.nestedActions).toHaveLength(1);
    });
  });

  // ============ GET /runs/:runId ============

  describe('getRunById', () => {
    it('should return 404 if run not found', async () => {
      const res = createMockResponse();
      mockDatabaseService.getRun.mockResolvedValue(null);

      await controller.getRunById('non-existent', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('should return run DTO on success', async () => {
      const res = createMockResponse();
      const run = { id: 'run-1', scrapeId: 'scrape-1' };
      mockDatabaseService.getRun.mockResolvedValue(run);
      mockDatabaseService.toRunHistoryDTO.mockReturnValue({
        ...run,
        steps: [],
      });

      await controller.getRunById('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should enrich run with workflow structure when scrapeId exists', async () => {
      const res = createMockResponse();
      const run = { id: 'run-1', scrapeId: 'scrape-1' };
      mockDatabaseService.getRun.mockResolvedValue(run);
      mockDatabaseService.toRunHistoryDTO.mockReturnValue({
        ...run,
        steps: [{ name: 's1', actions: [] }],
      });
      mockScrapeService.getScrapeDefinitions.mockReturnValue([
        { id: 'scrape-1', steps: [{ name: 's1', actions: [] }] },
      ]);

      await controller.getRunById('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should handle enrichment error gracefully for getRunById', async () => {
      const res = createMockResponse();
      const run = { id: 'run-1', scrapeId: 'scrape-1' };
      mockDatabaseService.getRun.mockResolvedValue(run);
      mockDatabaseService.toRunHistoryDTO.mockReturnValue({
        ...run,
        steps: [],
      });
      mockScrapeService.getScrapeDefinitions.mockImplementation(() => {
        throw new Error('no definition');
      });

      await controller.getRunById('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should handle run without scrapeId in getRunById', async () => {
      const res = createMockResponse();
      const run = { id: 'run-1', scrapeId: null };
      mockDatabaseService.getRun.mockResolvedValue(run);
      mockDatabaseService.toRunHistoryDTO.mockReturnValue({
        ...run,
        steps: [],
      });

      await controller.getRunById('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });

  // ============ GET /runs/:runId/debug ============

  describe('getRunDebugData', () => {
    it('should return 404 if run not found', async () => {
      const res = createMockResponse();
      mockDatabaseService.getRun.mockResolvedValue(null);

      await controller.getRunDebugData('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('should return empty object if no debug data entry', async () => {
      const res = createMockResponse();
      mockDatabaseService.getRun.mockResolvedValue({
        id: 'run-1',
        scrapeId: 's1',
      });

      await controller.getRunDebugData('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({});
    });

    it('should return parsed debug data', async () => {
      const res = createMockResponse();
      mockDatabaseService.getRun.mockResolvedValue({
        id: 'run-1',
        scrapeId: 's1',
      });
      mockDatabaseService.dataSource.getRepository.mockReturnValue({
        findOne: vi.fn().mockResolvedValue({ value: '{"key":"val"}' }),
      });

      await controller.getRunDebugData('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({ key: 'val' });
    });

    it('should return 500 on error', async () => {
      const res = createMockResponse();
      mockDatabaseService.getRun.mockRejectedValue(new Error('db error'));

      await controller.getRunDebugData('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  // ============ GET /runs/:runId/artifacts ============

  describe('getRunArtifacts', () => {
    it('should return 404 if run not found', async () => {
      const res = createMockResponse();
      mockDatabaseService.getRun.mockResolvedValue(null);

      await controller.getRunArtifacts('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });

    it('should return empty array if no debug data', async () => {
      const res = createMockResponse();
      mockDatabaseService.getRun.mockResolvedValue({
        id: 'run-1',
        scrapeId: 's1',
      });

      await controller.getRunArtifacts('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should extract artifacts from debug data', async () => {
      const res = createMockResponse();
      mockDatabaseService.getRun.mockResolvedValue({
        id: 'run-1',
        scrapeId: 's1',
      });
      const debugData = {
        action1: { type: 'json', data: { foo: 'bar' } },
      };
      mockDatabaseService.dataSource.getRepository.mockReturnValue({
        findOne: vi
          .fn()
          .mockResolvedValue({ value: JSON.stringify(debugData) }),
      });

      await controller.getRunArtifacts('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'json', data: { foo: 'bar' } }),
        ]),
      );
    });

    it('should return 500 on artifacts error', async () => {
      const res = createMockResponse();
      mockDatabaseService.getRun.mockRejectedValue(new Error('db error'));

      await controller.getRunArtifacts('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should handle artifacts with array data and deduplication', async () => {
      const res = createMockResponse();
      mockDatabaseService.getRun.mockResolvedValue({
        id: 'run-1',
        scrapeId: 's1',
      });
      const debugData = {
        action1: { type: 'json', data: { foo: 'bar' } },
        action2: { type: 'json', data: { foo: 'bar' } }, // duplicate
        nested: [{ type: 'text', data: 'hello' }],
      };
      mockDatabaseService.dataSource.getRepository.mockReturnValue({
        findOne: vi
          .fn()
          .mockResolvedValue({ value: JSON.stringify(debugData) }),
      });

      await controller.getRunArtifacts('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      // Should deduplicate the two identical json artifacts
      const artifacts = res.json.mock.calls[0][0];
      expect(artifacts.length).toBe(2); // json + text (deduplicated)
    });

    it('should handle artifacts with loop structures', async () => {
      const res = createMockResponse();
      mockDatabaseService.getRun.mockResolvedValue({
        id: 'run-1',
        scrapeId: 's1',
      });
      const debugData = {
        loopItems: {
          iteration_0: { type: 'table', data: [{ a: 1 }] },
          iteration_1: { type: 'table', data: [{ a: 2 }] },
        },
        simpleAction: { type: 'text', data: 'simple' },
      };
      mockDatabaseService.dataSource.getRepository.mockReturnValue({
        findOne: vi
          .fn()
          .mockResolvedValue({ value: JSON.stringify(debugData) }),
      });

      await controller.getRunArtifacts('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });

  // ============ DELETE /runs/:runId ============

  describe('deleteRun', () => {
    it('should delete a run and clear in-memory events', async () => {
      const res = createMockResponse();

      await controller.deleteRun('run-1', res);

      expect(mockDatabaseService.deleteRun).toHaveBeenCalledWith('run-1');
      expect(
        mockScrapeEventsService.clearWorkflowEventsForRun,
      ).toHaveBeenCalledWith('run-1');
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should return 500 on error', async () => {
      mockDatabaseService.deleteRun.mockRejectedValue(new Error('delete fail'));
      const res = createMockResponse();

      await controller.deleteRun('run-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  // ============ DELETE /scrapes/:scrapeId/runs ============

  describe('deleteRunsByScrapeId', () => {
    it('should delete runs for a scrape', async () => {
      mockDatabaseService.deleteRunsByScrapeId.mockResolvedValue(3);
      const res = createMockResponse();

      await controller.deleteRunsByScrapeId('scrape-1', res);

      expect(mockDatabaseService.deleteRunsByScrapeId).toHaveBeenCalledWith(
        'scrape-1',
      );
      expect(
        mockScrapeEventsService.clearWorkflowEventsForScrape,
      ).toHaveBeenCalledWith('scrape-1');
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({ success: true, deleted: 3 });
    });

    it('should return 500 on deleteRunsByScrapeId error', async () => {
      mockDatabaseService.deleteRunsByScrapeId.mockRejectedValue(
        new Error('delete fail'),
      );
      const res = createMockResponse();

      await controller.deleteRunsByScrapeId('scrape-1', res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  // ============ POST /runs/cleanup ============

  describe('cleanupRuns', () => {
    it('should call clearOldData with provided days', async () => {
      const res = createMockResponse();

      await controller.cleanupRuns({ olderThanDays: 7 }, res);

      expect(mockDatabaseService.clearOldData).toHaveBeenCalledWith(7);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should default to 30 days', async () => {
      const res = createMockResponse();

      await controller.cleanupRuns({}, res);

      expect(mockDatabaseService.clearOldData).toHaveBeenCalledWith(30);
    });

    it('should return 500 on error', async () => {
      mockDatabaseService.clearOldData.mockRejectedValue(new Error('fail'));
      const res = createMockResponse();

      await controller.cleanupRuns({}, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  // ============ GET /scrapes/:scrapeId/data ============

  describe('getScrapeData', () => {
    it('should return mapped scrape data DTOs', async () => {
      mockDatabaseService.getJobData.mockResolvedValue([
        { key: 'k', value: 'v' },
      ]);
      mockDatabaseService.toScrapeDataDTO.mockReturnValue({
        key: 'k',
        value: 'v',
      });

      const result = await controller.getScrapeData('scrape-1');

      expect(result).toEqual([{ key: 'k', value: 'v' }]);
    });
  });

  // ============ GET /runs/:runId/data ============

  describe('getRunData', () => {
    it('should return mapped run data DTOs', async () => {
      mockDatabaseService.getRunDataByRunId.mockResolvedValue([
        { key: 'a', value: 'b' },
      ]);
      mockDatabaseService.toScrapeDataDTO.mockReturnValue({
        key: 'a',
        value: 'b',
      });

      const result = await controller.getRunData('run-1');

      expect(result).toEqual([{ key: 'a', value: 'b' }]);
    });
  });

  // ============ GET /scrapes/:scrapeId/data/all ============

  describe('getAllScrapeData', () => {
    it('should return job-level and runs data', async () => {
      mockDatabaseService.getAllScrapeData.mockResolvedValue({
        jobLevel: [{ key: 'j', value: '1' }],
        runs: { 'run-1': [{ key: 'r', value: '2' }] },
      });
      mockDatabaseService.toScrapeDataDTO.mockImplementation((d) => d);

      const result = await controller.getAllScrapeData('scrape-1');

      expect(result.jobLevel).toEqual([{ key: 'j', value: '1' }]);
      expect(result.runs['run-1']).toEqual([{ key: 'r', value: '2' }]);
    });
  });

  // ============ GET /scrapes/:scrapeId/schedule ============

  describe('getSchedule', () => {
    it('should return default schedule when none exists', async () => {
      mockDatabaseService.toScheduleDTO.mockReturnValue(null);

      const result = await controller.getSchedule('scrape-1');

      expect(result.scrapeId).toBe('scrape-1');
      expect(result.manualEnabled).toBe(true);
      expect(result.scheduleEnabled).toBe(false);
    });

    it('should return existing schedule DTO', async () => {
      const scheduleDto = { scrapeId: 'scrape-1', scheduleEnabled: true };
      mockDatabaseService.toScheduleDTO.mockReturnValue(scheduleDto);

      const result = await controller.getSchedule('scrape-1');

      expect(result).toEqual(scheduleDto);
    });
  });

  // ============ GET /schedules ============

  describe('getAllSchedules', () => {
    it('should return all schedule DTOs', async () => {
      mockDatabaseService.getAllSchedules.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      mockDatabaseService.toScheduleDTO.mockImplementation((s) => ({
        ...s,
        mapped: true,
      }));

      const result = await controller.getAllSchedules();

      expect(result).toHaveLength(2);
    });
  });

  // ============ PUT /scrapes/:scrapeId/schedule ============

  describe('updateSchedule', () => {
    it('should schedule a job when enabled with cron', async () => {
      mockDatabaseService.updateScheduleConfig.mockResolvedValue({
        scheduleEnabled: true,
        cronExpression: '0 * * * *',
        timezone: 'UTC',
      });
      mockDatabaseService.toScheduleDTO.mockReturnValue({ updated: true });

      await controller.updateSchedule('scrape-1', {
        scheduleEnabled: true,
        cronExpression: '0 * * * *',
      });

      expect(mockSchedulerService.scheduleJob).toHaveBeenCalledWith(
        'scrape-1',
        '0 * * * *',
        'UTC',
      );
    });

    it('should remove job when schedule is disabled', async () => {
      mockDatabaseService.updateScheduleConfig.mockResolvedValue({
        scheduleEnabled: false,
        cronExpression: null,
      });
      mockDatabaseService.toScheduleDTO.mockReturnValue({ updated: true });

      await controller.updateSchedule('scrape-1', { scheduleEnabled: false });

      expect(mockSchedulerService.removeJob).toHaveBeenCalledWith('scrape-1');
    });

    it('should remove job when scheduleEnabled is true but cronExpression is null', async () => {
      mockDatabaseService.updateScheduleConfig.mockResolvedValue({
        scheduleEnabled: true,
        cronExpression: null,
      });
      mockDatabaseService.toScheduleDTO.mockReturnValue({ updated: true });

      await controller.updateSchedule('scrape-1', { scheduleEnabled: true });

      expect(mockSchedulerService.removeJob).toHaveBeenCalledWith('scrape-1');
    });

    it('should not touch scheduler when schedule fields not in body', async () => {
      mockDatabaseService.updateScheduleConfig.mockResolvedValue({
        scheduleEnabled: true,
        cronExpression: '0 * * * *',
      });
      mockDatabaseService.toScheduleDTO.mockReturnValue({ updated: true });

      await controller.updateSchedule('scrape-1', { manualEnabled: false });

      expect(mockSchedulerService.scheduleJob).not.toHaveBeenCalled();
      expect(mockSchedulerService.removeJob).not.toHaveBeenCalled();
    });
  });

  // ============ GET /scheduler/status ============

  describe('getSchedulerStatus', () => {
    it('should return scheduler status', () => {
      mockSchedulerService.getStatus.mockReturnValue({ active: 2 });

      const result = controller.getSchedulerStatus();

      expect(result).toEqual({ active: 2 });
    });
  });
});
