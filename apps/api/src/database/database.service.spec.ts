import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatabaseService } from './database.service';
import { RunLog, ScrapeSchedule, SecretEntity } from './entities';
import {
  RunRepository,
  StepRepository,
  ActionRepository,
  ScrapeDataRepository,
} from './repositories';

describe('DatabaseService', () => {
  let service: DatabaseService;

  const mockRunRepo = {
    create: vi.fn(),
    updateStatus: vi.fn(),
    findById: vi.fn(),
    findRecent: vi.fn(),
    findByScrapeId: vi.fn(),
    findLastRunForEachScrape: vi.fn(),
    deleteOlderThan: vi.fn(),
  };

  const mockStepRepo = {
    create: vi.fn(),
    updateStatus: vi.fn(),
    findByRunId: vi.fn(),
  };

  const mockActionRepo = {
    create: vi.fn(),
    updateStatus: vi.fn(),
    findByStepId: vi.fn(),
  };

  const mockDataRepo = {
    upsertJobData: vi.fn(),
    saveRunData: vi.fn(),
    getJobData: vi.fn(),
    getRunData: vi.fn(),
    getValue: vi.fn(),
  };

  const mockLogRepository = {
    create: vi.fn().mockReturnValue({}),
    save: vi.fn(),
    find: vi.fn(),
  };

  const mockScheduleRepository = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn().mockReturnValue({}),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockSecretRepository = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn().mockReturnValue({}),
    save: vi.fn(),
    delete: vi.fn(),
  };

  const mockScrapeDataRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn().mockReturnValue({}),
    save: vi.fn(),
    delete: vi.fn(),
  };

  const mockDataSource = {
    query: vi.fn(),
    createQueryBuilder: vi.fn(),
    getRepository: vi.fn().mockReturnValue(mockScrapeDataRepo),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: RunRepository, useValue: mockRunRepo },
        { provide: StepRepository, useValue: mockStepRepo },
        { provide: ActionRepository, useValue: mockActionRepo },
        { provide: ScrapeDataRepository, useValue: mockDataRepo },
        { provide: getRepositoryToken(RunLog), useValue: mockLogRepository },
        {
          provide: getRepositoryToken(ScrapeSchedule),
          useValue: mockScheduleRepository,
        },
        {
          provide: getRepositoryToken(SecretEntity),
          useValue: mockSecretRepository,
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize without error', async () => {
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  // ==================== Run Management ====================
  describe('Run Management', () => {
    it('should create a run', async () => {
      mockRunRepo.create.mockResolvedValue({ id: 'run-1' });
      const result = await service.createRun('run-1', 'scrape-1', 'manual');
      expect(mockRunRepo.create).toHaveBeenCalledWith(
        'run-1',
        'scrape-1',
        'manual',
      );
      expect(result).toEqual({ id: 'run-1' });
    });

    it('should update run status', async () => {
      await service.updateRunStatus('run-1', 'completed');
      expect(mockRunRepo.updateStatus).toHaveBeenCalledWith(
        'run-1',
        'completed',
        undefined,
      );
    });

    it('should update run status with error', async () => {
      await service.updateRunStatus('run-1', 'error', 'Something failed');
      expect(mockRunRepo.updateStatus).toHaveBeenCalledWith(
        'run-1',
        'error',
        'Something failed',
      );
    });

    it('should get a run by ID', async () => {
      mockRunRepo.findById.mockResolvedValue({ id: 'run-1' });
      const result = await service.getRun('run-1');
      expect(result).toEqual({ id: 'run-1' });
    });

    it('should get recent runs', async () => {
      mockRunRepo.findRecent.mockResolvedValue([{ id: 'run-1' }]);
      const result = await service.getRecentRuns(10);
      expect(mockRunRepo.findRecent).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
    });

    it('should get runs by scrape ID', async () => {
      mockRunRepo.findByScrapeId.mockResolvedValue([{ id: 'run-1' }]);
      await service.getRunsByScrapeId('scrape-1', 25);
      expect(mockRunRepo.findByScrapeId).toHaveBeenCalledWith('scrape-1', 25);
    });

    it('should get last run for each scrape', async () => {
      mockRunRepo.findLastRunForEachScrape.mockResolvedValue([]);
      await service.getLastRunForEachScrape();
      expect(mockRunRepo.findLastRunForEachScrape).toHaveBeenCalled();
    });

    it('should delete old runs', async () => {
      await service.deleteOldRuns(30);
      expect(mockRunRepo.deleteOlderThan).toHaveBeenCalledWith(30);
    });
  });

  // ==================== Step Management ====================
  describe('Step Management', () => {
    it('should create a step', async () => {
      mockStepRepo.create.mockResolvedValue({ id: 1 });
      await service.createStep('run-1', 'step-1', 0);
      expect(mockStepRepo.create).toHaveBeenCalledWith('run-1', 'step-1', 0);
    });

    it('should update step status', async () => {
      await service.updateStepStatus(1, 'completed');
      expect(mockStepRepo.updateStatus).toHaveBeenCalledWith(1, 'completed');
    });

    it('should get steps by run ID', async () => {
      mockStepRepo.findByRunId.mockResolvedValue([]);
      await service.getStepsByRunId('run-1');
      expect(mockStepRepo.findByRunId).toHaveBeenCalledWith('run-1');
    });
  });

  // ==================== Action Management ====================
  describe('Action Management', () => {
    it('should create an action', async () => {
      mockActionRepo.create.mockResolvedValue({ id: 1 });
      await service.createAction(1, 'action-1', 'navigate', 0);
      expect(mockActionRepo.create).toHaveBeenCalledWith(
        1,
        'action-1',
        'navigate',
        0,
      );
    });

    it('should update action status', async () => {
      await service.updateActionStatus(1, 'completed', undefined, 'result');
      expect(mockActionRepo.updateStatus).toHaveBeenCalledWith(
        1,
        'completed',
        undefined,
        'result',
        undefined,
      );
    });

    it('should get actions by step ID', async () => {
      mockActionRepo.findByStepId.mockResolvedValue([]);
      await service.getActionsByStepId(1);
      expect(mockActionRepo.findByStepId).toHaveBeenCalledWith(1);
    });
  });

  // ==================== Data Management ====================
  describe('Data Management', () => {
    it('should upsert job data', async () => {
      await service.upsertJobData('scrape-1', 'key', 'value');
      expect(mockDataRepo.upsertJobData).toHaveBeenCalledWith(
        'scrape-1',
        'key',
        'value',
      );
    });

    it('should save run data', async () => {
      await service.saveRunData('scrape-1', 'run-1', 'key', 'value');
      expect(mockDataRepo.saveRunData).toHaveBeenCalledWith(
        'scrape-1',
        'run-1',
        'key',
        'value',
      );
    });

    it('should get job data', async () => {
      await service.getJobData('scrape-1');
      expect(mockDataRepo.getJobData).toHaveBeenCalledWith('scrape-1');
    });

    it('should get run data', async () => {
      await service.getRunData('scrape-1', 'run-1');
      expect(mockDataRepo.getRunData).toHaveBeenCalledWith('scrape-1', 'run-1');
    });

    it('should get scrape data value', async () => {
      await service.getScrapeDataValue('scrape-1', 'key', 'run-1');
      expect(mockDataRepo.getValue).toHaveBeenCalledWith(
        'scrape-1',
        'key',
        'run-1',
      );
    });
  });

  // ==================== History ====================
  describe('getRunHistory', () => {
    it('should return run history mapped to DTOs', async () => {
      const mockRuns = [
        {
          id: 'run-1',
          scrapeId: 'scrape-1',
          status: 'completed',
          trigger: 'manual',
          startTime: new Date(1000),
          endTime: new Date(2000),
          error: null,
          steps: [],
        },
      ];
      mockRunRepo.findRecent.mockResolvedValue(mockRuns);

      const result = await service.getRunHistory(50);
      expect(result).toHaveLength(1);
      expect(result[0].startTime).toBe(1000);
      expect(result[0].endTime).toBe(2000);
    });

    it('should filter by scrapeId when provided', async () => {
      mockRunRepo.findByScrapeId.mockResolvedValue([]);
      await service.getRunHistory(50, 'scrape-1');
      expect(mockRunRepo.findByScrapeId).toHaveBeenCalledWith('scrape-1', 50);
    });
  });

  // ==================== Logging ====================
  describe('Logging', () => {
    it('should save a log entry', async () => {
      await service.saveLog('run-1', 'log', 'test message', 'TestContext');
      expect(mockLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: 'run-1',
          level: 'log',
          message: 'test message',
          context: 'TestContext',
        }),
      );
      expect(mockLogRepository.save).toHaveBeenCalled();
    });

    it('should use System as default context', async () => {
      await service.saveLog('run-1', 'error', 'error message');
      expect(mockLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'System',
        }),
      );
    });

    it('should get logs by run ID', async () => {
      mockLogRepository.find.mockResolvedValue([]);
      await service.getLogsByRunId('run-1');
      expect(mockLogRepository.find).toHaveBeenCalledWith({
        where: { runId: 'run-1' },
        order: { timestamp: 'ASC' },
      });
    });
  });

  // ==================== Schedules ====================
  describe('Schedules', () => {
    it('should upsert schedule - create new', async () => {
      mockScheduleRepository.findOne.mockResolvedValue(null);
      await service.upsertSchedule('scrape-1', '0 * * * *', true);
      expect(mockScheduleRepository.create).toHaveBeenCalled();
      expect(mockScheduleRepository.save).toHaveBeenCalled();
    });

    it('should upsert schedule - update existing', async () => {
      mockScheduleRepository.findOne.mockResolvedValue({
        scrapeId: 'scrape-1',
      });
      await service.upsertSchedule('scrape-1', '0 * * * *', true);
      expect(mockScheduleRepository.update).toHaveBeenCalled();
    });

    it('should get schedule by scrapeId', async () => {
      await service.getSchedule('scrape-1');
      expect(mockScheduleRepository.findOne).toHaveBeenCalledWith({
        where: { scrapeId: 'scrape-1' },
      });
    });

    it('should get all enabled schedules', async () => {
      mockScheduleRepository.find.mockResolvedValue([]);
      await service.getAllSchedules();
      expect(mockScheduleRepository.find).toHaveBeenCalledWith({
        where: { scheduleEnabled: true },
      });
    });

    it('should delete schedule', async () => {
      await service.deleteSchedule('scrape-1');
      expect(mockScheduleRepository.delete).toHaveBeenCalledWith({
        scrapeId: 'scrape-1',
      });
    });

    it('should update schedule last run', async () => {
      await service.updateScheduleLastRun('scrape-1');
      expect(mockScheduleRepository.update).toHaveBeenCalled();
    });

    it('should get or create schedule - create new', async () => {
      mockScheduleRepository.findOne.mockResolvedValue(null);
      mockScheduleRepository.save.mockResolvedValue({
        scrapeId: 'scrape-1',
        manualEnabled: true,
      });
      const result = await service.getOrCreateSchedule('scrape-1');
      expect(mockScheduleRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should get or create schedule - existing', async () => {
      const existing = {
        scrapeId: 'scrape-1',
        scheduleEnabled: true,
        cronExpression: '0 * * * *',
      };
      mockScheduleRepository.findOne.mockResolvedValue(existing);
      const result = await service.getOrCreateSchedule('scrape-1');
      expect(result).toEqual(existing);
    });

    it('should get enabled schedules', async () => {
      mockScheduleRepository.find.mockResolvedValue([]);
      await service.getEnabledSchedules();
      expect(mockScheduleRepository.find).toHaveBeenCalledWith({
        where: { scheduleEnabled: true },
      });
    });

    it('should update schedule config', async () => {
      const schedule = {
        scrapeId: 'scrape-1',
        manualEnabled: true,
        scheduleEnabled: false,
        cronExpression: null,
        timezone: 'UTC',
      };
      mockScheduleRepository.findOne.mockResolvedValue(schedule);
      mockScheduleRepository.save.mockResolvedValue({
        ...schedule,
        scheduleEnabled: true,
        cronExpression: '0 * * * *',
      });

      await service.updateScheduleConfig('scrape-1', {
        scheduleEnabled: true,
        cronExpression: '0 * * * *',
      });
      expect(mockScheduleRepository.save).toHaveBeenCalled();
    });

    it('should update last scheduled run', async () => {
      await service.updateLastScheduledRun('scrape-1');
      expect(mockScheduleRepository.update).toHaveBeenCalled();
    });

    it('should update next scheduled run', async () => {
      const nextRun = new Date();
      await service.updateNextScheduledRun('scrape-1', nextRun);
      expect(mockScheduleRepository.update).toHaveBeenCalledWith(
        { scrapeId: 'scrape-1' },
        { nextScheduledRun: nextRun },
      );
    });
  });

  // ==================== Secrets ====================
  describe('Secrets', () => {
    it('should create a secret', async () => {
      mockSecretRepository.save.mockResolvedValue({
        id: 'sec-1',
        name: 'test',
      });
      await service.createSecret('sec-1', 'test', 'encrypted', 'desc');
      expect(mockSecretRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'sec-1',
          name: 'test',
          encryptedValue: 'encrypted',
          description: 'desc',
        }),
      );
    });

    it('should get all secrets', async () => {
      mockSecretRepository.find.mockResolvedValue([]);
      await service.getAllSecrets();
      expect(mockSecretRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });

    it('should get secret by ID', async () => {
      mockSecretRepository.findOne.mockResolvedValue({ id: 'sec-1' });
      const result = await service.getSecretById('sec-1');
      expect(result).toEqual({ id: 'sec-1' });
    });

    it('should get secret by name', async () => {
      mockSecretRepository.findOne.mockResolvedValue({ name: 'test' });
      await service.getSecretByName('test');
      expect(mockSecretRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'test' },
      });
    });

    it('should update secret', async () => {
      const existing = {
        id: 'sec-1',
        name: 'test',
        encryptedValue: 'old',
        description: 'old desc',
        updatedAt: 0,
      };
      mockSecretRepository.findOne.mockResolvedValue(existing);
      mockSecretRepository.save.mockResolvedValue({
        ...existing,
        name: 'new-name',
      });

      await service.updateSecret('sec-1', { name: 'new-name' });
      expect(mockSecretRepository.save).toHaveBeenCalled();
    });

    it('should return null when updating non-existent secret', async () => {
      mockSecretRepository.findOne.mockResolvedValue(null);
      const result = await service.updateSecret('nonexistent', {
        name: 'test',
      });
      expect(result).toBeNull();
    });

    it('should delete secret', async () => {
      mockSecretRepository.delete.mockResolvedValue({ affected: 1 });
      const result = await service.deleteSecret('sec-1');
      expect(result).toBe(true);
    });

    it('should return false when deleting non-existent secret', async () => {
      mockSecretRepository.delete.mockResolvedValue({ affected: 0 });
      const result = await service.deleteSecret('nonexistent');
      expect(result).toBe(false);
    });
  });

  // ==================== ScrapeData Management ====================
  describe('ScrapeData Management', () => {
    it('should store new data', async () => {
      mockScrapeDataRepo.findOne.mockResolvedValue(null);
      mockScrapeDataRepo.save.mockResolvedValue({ id: 1 });

      await service.storeData('scrape-1', 'key', 'value');
      expect(mockScrapeDataRepo.create).toHaveBeenCalled();
      expect(mockScrapeDataRepo.save).toHaveBeenCalled();
    });

    it('should update existing data', async () => {
      const existing = {
        id: 1,
        scrapeId: 'scrape-1',
        key: 'key',
        value: 'old',
      };
      mockScrapeDataRepo.findOne.mockResolvedValue(existing);
      mockScrapeDataRepo.save.mockResolvedValue({ ...existing, value: 'new' });

      await service.storeData('scrape-1', 'key', 'new');
      expect(existing.value).toBe('new');
    });

    it('should get job data by key', async () => {
      mockScrapeDataRepo.find.mockResolvedValue([]);
      await service.getJobDataByKey('scrape-1', 'key');
      expect(mockScrapeDataRepo.find).toHaveBeenCalled();
    });

    it('should get job data value', async () => {
      mockScrapeDataRepo.findOne.mockResolvedValue({ value: 'test' });
      const result = await service.getJobDataValue('scrape-1', 'key');
      expect(result).toBe('test');
    });

    it('should return null for missing job data value', async () => {
      mockScrapeDataRepo.findOne.mockResolvedValue(null);
      const result = await service.getJobDataValue('scrape-1', 'missing');
      expect(result).toBeNull();
    });

    it('should get run data by run ID', async () => {
      mockScrapeDataRepo.find.mockResolvedValue([]);
      await service.getRunDataByRunId('run-1');
      expect(mockScrapeDataRepo.find).toHaveBeenCalled();
    });

    it('should get all scrape data', async () => {
      mockScrapeDataRepo.find.mockResolvedValue([
        { scrapeId: 'scrape-1', runId: null, key: 'k1', value: 'v1' },
        { scrapeId: 'scrape-1', runId: 'run-1', key: 'k2', value: 'v2' },
      ]);

      const result = await service.getAllScrapeData('scrape-1');
      expect(result.jobLevel).toHaveLength(1);
      expect(Object.keys(result.runs)).toHaveLength(1);
    });

    it('should delete run data', async () => {
      mockScrapeDataRepo.delete.mockResolvedValue({ affected: 3 });
      const result = await service.deleteRunData('run-1');
      expect(result).toBe(3);
    });
  });

  // ==================== DTO Conversions ====================
  describe('toScrapeDataDTO', () => {
    it('should convert ScrapeData to DTO', () => {
      const data = {
        id: 1,
        scrapeId: 'scrape-1',
        runId: 'run-1',
        key: 'key',
        value: 'value',
        createdAt: new Date(1000),
        updatedAt: new Date(2000),
      } as any;

      const dto = service.toScrapeDataDTO(data);
      expect(dto.id).toBe(1);
      expect(dto.createdAt).toBe(1000);
      expect(dto.updatedAt).toBe(2000);
    });
  });

  describe('toScheduleDTO', () => {
    it('should return null for null schedule', () => {
      expect(service.toScheduleDTO(null)).toBeNull();
    });

    it('should convert schedule to DTO', () => {
      const schedule = {
        scrapeId: 'scrape-1',
        manualEnabled: true,
        scheduleEnabled: false,
        cronExpression: '0 * * * *',
        timezone: 'UTC',
        lastScheduledRun: new Date(1000),
        nextScheduledRun: null,
      } as any;

      const dto = service.toScheduleDTO(schedule);
      expect(dto.scrapeId).toBe('scrape-1');
      expect(dto.lastScheduledRun).toBe(1000);
      expect(dto.nextScheduledRun).toBeNull();
    });
  });

  describe('toRunHistoryDTO', () => {
    it('should throw for null run', () => {
      expect(() => service.toRunHistoryDTO(null)).toThrow(
        'Cannot convert null run to DTO',
      );
    });

    it('should convert run to DTO with status mapping', () => {
      const run = {
        id: 'run-1',
        scrapeId: 'scrape-1',
        status: 'completed',
        trigger: 'manual',
        startTime: new Date(1000),
        endTime: new Date(2000),
        error: null,
        steps: [
          {
            stepName: 'Step 1',
            status: 'completed',
            startTime: new Date(1000),
            endTime: new Date(2000),
            actions: [
              {
                actionName: 'Navigate',
                actionType: 'navigate',
                status: 'error',
                startTime: new Date(1000),
                endTime: new Date(2000),
                result: null,
                error: 'failed',
                loopData: null,
              },
            ],
          },
        ],
      };

      const dto = service.toRunHistoryDTO(run);
      expect(dto.status).toBe('success');
      expect(dto.steps[0].status).toBe('success');
      expect(dto.steps[0].actions[0].status).toBe('failed');
    });

    it('should parse loop data in actions', () => {
      const run = {
        id: 'run-1',
        scrapeId: 'scrape-1',
        status: 'running',
        trigger: 'manual',
        startTime: new Date(),
        steps: [
          {
            stepName: 'Step 1',
            status: 'running',
            actions: [
              {
                actionName: 'Loop',
                actionType: 'loop',
                status: 'running',
                loopData: JSON.stringify({
                  iterations: [{ childActions: [{ status: 'completed' }] }],
                  total: 5,
                  current: 2,
                }),
              },
            ],
          },
        ],
      };

      const dto = service.toRunHistoryDTO(run);
      expect(dto.steps[0].actions[0].loopIterations).toHaveLength(1);
      expect(dto.steps[0].actions[0].loopTotal).toBe(5);
    });
  });

  // ==================== Additional Methods ====================
  describe('clearOldData', () => {
    it('should clear old data', async () => {
      await service.clearOldData(30);
      expect(mockRunRepo.deleteOlderThan).toHaveBeenCalledWith(30);
    });
  });

  describe('deleteRun', () => {
    it('should delete a run', async () => {
      const mockRepo = { delete: vi.fn() };
      mockDataSource.getRepository.mockReturnValue(mockRepo);
      await service.deleteRun('run-1');
      expect(mockRepo.delete).toHaveBeenCalledWith('run-1');
    });
  });

  describe('deleteRunsByScrapeId', () => {
    it('should delete runs by scrape ID', async () => {
      const mockRepo = { delete: vi.fn().mockResolvedValue({ affected: 5 }) };
      mockDataSource.getRepository.mockReturnValue(mockRepo);
      const result = await service.deleteRunsByScrapeId('scrape-1');
      expect(result).toBe(5);
    });

    it('should return 0 when affected is null/undefined', async () => {
      const mockRepo = {
        delete: vi.fn().mockResolvedValue({ affected: null }),
      };
      mockDataSource.getRepository.mockReturnValue(mockRepo);
      const result = await service.deleteRunsByScrapeId('scrape-1');
      expect(result).toBe(0);
    });
  });

  describe('getRunHistory - default parameters', () => {
    it('should use default limit when not provided', async () => {
      mockRunRepo.findRecent.mockResolvedValue([]);
      await service.getRunHistory();
      expect(mockRunRepo.findRecent).toHaveBeenCalledWith(50);
    });

    it('should handle run with no endTime', async () => {
      const mockRuns = [
        {
          id: 'run-1',
          scrapeId: 'scrape-1',
          status: 'running',
          trigger: 'manual',
          startTime: new Date(1000),
          endTime: undefined,
          error: null,
          steps: [],
        },
      ];
      mockRunRepo.findRecent.mockResolvedValue(mockRuns);
      const result = await service.getRunHistory();
      expect(result[0].endTime).toBeUndefined();
    });
  });

  describe('toScrapeDataDTO - null date branches', () => {
    it('should use Date.now() fallback when createdAt is null', () => {
      const data = {
        id: 1,
        scrapeId: 'scrape-1',
        runId: null,
        key: 'key',
        value: 'value',
        createdAt: null,
        updatedAt: null,
      } as any;

      const before = Date.now();
      const dto = service.toScrapeDataDTO(data);
      const after = Date.now();
      expect(dto.createdAt).toBeGreaterThanOrEqual(before);
      expect(dto.createdAt).toBeLessThanOrEqual(after);
      expect(dto.updatedAt).toBeGreaterThanOrEqual(before);
      expect(dto.updatedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('toScheduleDTO - additional branches', () => {
    it('should handle schedule with no lastScheduledRun', () => {
      const schedule = {
        scrapeId: 'scrape-1',
        manualEnabled: true,
        scheduleEnabled: true,
        cronExpression: '0 * * * *',
        timezone: 'UTC',
        lastScheduledRun: null,
        nextScheduledRun: new Date(5000),
      } as any;

      const dto = service.toScheduleDTO(schedule);
      expect(dto.lastScheduledRun).toBeNull();
      expect(dto.nextScheduledRun).toBe(5000);
    });
  });

  describe('toRunHistoryDTO - additional branches', () => {
    it('should handle run with no scrapeId', () => {
      const run = {
        id: 'run-1',
        scrapeId: undefined,
        status: 'running',
        trigger: 'manual',
        startTime: new Date(),
        steps: [],
      };
      const dto = service.toRunHistoryDTO(run);
      expect(dto.scrapeId).toBeNull();
    });

    it('should handle run with no startTime', () => {
      const before = Date.now();
      const run = {
        id: 'run-1',
        scrapeId: 'scrape-1',
        status: 'completed',
        trigger: 'manual',
        startTime: null,
        steps: [],
      };
      const dto = service.toRunHistoryDTO(run);
      expect(dto.startTime).toBeGreaterThanOrEqual(before);
    });

    it('should map unknown status as-is', () => {
      const run = {
        id: 'run-1',
        scrapeId: 'scrape-1',
        status: 'running',
        trigger: 'manual',
        startTime: new Date(),
        steps: [],
      };
      const dto = service.toRunHistoryDTO(run);
      expect(dto.status).toBe('running');
    });

    it('should handle double-stringified loopData', () => {
      const loopData = {
        iterations: [{ childActions: [{ status: 'completed' }] }],
        total: 3,
        current: 1,
      };
      const run = {
        id: 'run-1',
        scrapeId: 'scrape-1',
        status: 'completed',
        trigger: 'manual',
        startTime: new Date(),
        steps: [
          {
            stepName: 'Step 1',
            status: 'completed',
            actions: [
              {
                actionName: 'Loop',
                actionType: 'loop',
                status: 'completed',
                loopData: JSON.stringify(JSON.stringify(loopData)),
              },
            ],
          },
        ],
      };
      const dto = service.toRunHistoryDTO(run);
      expect(dto.steps[0].actions[0].loopIterations).toHaveLength(1);
    });

    it('should warn when loop action has no loopData', () => {
      const run = {
        id: 'run-1',
        scrapeId: 'scrape-1',
        status: 'completed',
        trigger: 'manual',
        startTime: new Date(),
        steps: [
          {
            stepName: 'Step 1',
            status: 'completed',
            actions: [
              {
                actionName: 'LoopAction',
                actionType: 'loop',
                status: 'completed',
                loopData: null,
                result: null,
              },
            ],
          },
        ],
      };
      const dto = service.toRunHistoryDTO(run);
      expect(dto.steps[0].actions[0].loopIterations).toBeUndefined();
    });

    it('should handle invalid loopData JSON gracefully', () => {
      const run = {
        id: 'run-1',
        scrapeId: 'scrape-1',
        status: 'completed',
        trigger: 'manual',
        startTime: new Date(),
        steps: [
          {
            stepName: 'Step 1',
            status: 'completed',
            actions: [
              {
                actionName: 'Loop',
                actionType: 'loop',
                status: 'completed',
                loopData: 'not-valid-json{',
              },
            ],
          },
        ],
      };
      // Should not throw
      const dto = service.toRunHistoryDTO(run);
      expect(dto.steps[0].actions[0].loopIterations).toBeUndefined();
    });

    it('should handle action with result that needs parsing', () => {
      const run = {
        id: 'run-1',
        scrapeId: 'scrape-1',
        status: 'completed',
        trigger: 'manual',
        startTime: new Date(),
        steps: [
          {
            stepName: 'Step 1',
            status: 'completed',
            actions: [
              {
                actionName: 'Extract',
                actionType: 'extract',
                status: 'completed',
                result: JSON.stringify({ data: 'value' }),
                loopData: null,
              },
            ],
          },
        ],
      };
      const dto = service.toRunHistoryDTO(run);
      expect(dto.steps[0].actions[0].result).toEqual({ data: 'value' });
    });

    it('should handle null childActions in mapChildActionsStatus', () => {
      const loopData = {
        iterations: [{ childActions: null }],
        total: 1,
        current: 0,
      };
      const run = {
        id: 'run-1',
        scrapeId: 'scrape-1',
        status: 'completed',
        trigger: 'manual',
        startTime: new Date(),
        steps: [
          {
            stepName: 'Step 1',
            status: 'completed',
            actions: [
              {
                actionName: 'Loop',
                actionType: 'loop',
                status: 'completed',
                loopData: JSON.stringify(loopData),
              },
            ],
          },
        ],
      };
      const dto = service.toRunHistoryDTO(run);
      expect(dto.steps[0].actions[0].loopIterations[0].childActions).toBeNull();
    });

    it('should handle nested loop iterations with childActions', () => {
      const loopData = {
        iterations: [
          {
            childActions: [
              {
                status: 'completed',
                loopIterations: [{ childActions: [{ status: 'error' }] }],
                childActions: [{ status: 'completed', childActions: null }],
              },
            ],
          },
        ],
        total: 1,
        current: 0,
      };
      const run = {
        id: 'run-1',
        scrapeId: 'scrape-1',
        status: 'completed',
        trigger: 'manual',
        startTime: new Date(),
        steps: [
          {
            stepName: 'Step 1',
            status: 'completed',
            actions: [
              {
                actionName: 'Loop',
                actionType: 'loop',
                status: 'completed',
                loopData: JSON.stringify(loopData),
              },
            ],
          },
        ],
      };
      const dto = service.toRunHistoryDTO(run);
      expect(dto.steps[0].actions[0].loopIterations).toBeDefined();
    });

    it('should handle null steps array', () => {
      const run = {
        id: 'run-1',
        scrapeId: 'scrape-1',
        status: 'completed',
        trigger: 'manual',
        startTime: new Date(),
        steps: null,
      };
      const dto = service.toRunHistoryDTO(run);
      expect(dto.steps).toEqual([]);
    });

    it('should handle null actions array in step', () => {
      const run = {
        id: 'run-1',
        scrapeId: 'scrape-1',
        status: 'completed',
        trigger: 'manual',
        startTime: new Date(),
        steps: [
          {
            stepName: 'Step 1',
            status: 'completed',
            actions: null,
          },
        ],
      };
      const dto = service.toRunHistoryDTO(run);
      expect(dto.steps[0].actions).toEqual([]);
    });
  });

  describe('storeData - with runId', () => {
    it('should store data with a runId', async () => {
      const repoMock = {
        findOne: vi.fn().mockResolvedValue(null),
        find: vi.fn(),
        create: vi.fn().mockReturnValue({}),
        save: vi.fn().mockResolvedValue({ id: 1 }),
        delete: vi.fn(),
      };
      mockDataSource.getRepository.mockReturnValue(repoMock);

      await service.storeData('scrape-1', 'key', 'value', 'run-123');
      expect(repoMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ runId: 'run-123' }),
      );
    });
  });

  describe('deleteRunData - zero affected', () => {
    it('should return 0 when no rows affected', async () => {
      const repoMock = {
        findOne: vi.fn(),
        find: vi.fn(),
        create: vi.fn(),
        save: vi.fn(),
        delete: vi.fn().mockResolvedValue({ affected: 0 }),
      };
      mockDataSource.getRepository.mockReturnValue(repoMock);
      const result = await service.deleteRunData('run-1');
      expect(result).toBe(0);
    });

    it('should return 0 when affected is null', async () => {
      const repoMock = {
        findOne: vi.fn(),
        find: vi.fn(),
        create: vi.fn(),
        save: vi.fn(),
        delete: vi.fn().mockResolvedValue({ affected: null }),
      };
      mockDataSource.getRepository.mockReturnValue(repoMock);
      const result = await service.deleteRunData('run-1');
      expect(result).toBe(0);
    });
  });

  describe('updateScheduleConfig - all fields', () => {
    it('should update manualEnabled and timezone', async () => {
      const schedule = {
        scrapeId: 'scrape-1',
        manualEnabled: true,
        scheduleEnabled: false,
        cronExpression: null,
        timezone: 'UTC',
      };
      mockScheduleRepository.findOne.mockResolvedValue(schedule);
      mockScheduleRepository.save.mockResolvedValue({
        ...schedule,
        manualEnabled: false,
        timezone: 'Europe/Berlin',
      });

      await service.updateScheduleConfig('scrape-1', {
        manualEnabled: false,
        timezone: 'Europe/Berlin',
      });
      expect(schedule.manualEnabled).toBe(false);
      expect(schedule.timezone).toBe('Europe/Berlin');
    });
  });

  describe('updateSecret - all fields', () => {
    it('should update encryptedValue and description', async () => {
      const existing = {
        id: 'sec-1',
        name: 'test',
        encryptedValue: 'old',
        description: 'old desc',
        updatedAt: 0,
      };
      mockSecretRepository.findOne.mockResolvedValue(existing);
      mockSecretRepository.save.mockResolvedValue({
        ...existing,
        encryptedValue: 'new-enc',
        description: 'new desc',
      });

      await service.updateSecret('sec-1', {
        encryptedValue: 'new-enc',
        description: 'new desc',
      });
      expect(existing.encryptedValue).toBe('new-enc');
      expect(existing.description).toBe('new desc');
    });
  });

  describe('getJobDataByKey - without key', () => {
    it('should query without key filter when key is not provided', async () => {
      const repoMock = {
        findOne: vi.fn(),
        find: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
      };
      mockDataSource.getRepository.mockReturnValue(repoMock);
      await service.getJobDataByKey('scrape-1');
      expect(repoMock.find).toHaveBeenCalled();
    });
  });
});
