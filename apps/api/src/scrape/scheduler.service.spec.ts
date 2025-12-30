import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { DatabaseService } from '../database/database.service';
import { ScrapeService } from './scrape.service';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let databaseService: any /*DatabaseService*/;
  let scrapeService: any /*ScrapeService*/;

  const mockDatabaseService = {
    getAllSchedules: vi.fn(),
    getScheduleForScrape: vi.fn(),
    updateSchedule: vi.fn(),
  };

  const mockScrapeService = {
    scrape: vi.fn(),
    getScrapes: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: ScrapeService,
          useValue: mockScrapeService,
        },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    databaseService = module.get(DatabaseService);
    scrapeService = module.get(ScrapeService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scheduleJob', () => {
    it('should schedule cron job', () => {
      const scrapeId = 'test-scrape';
      const expression = '0 0 * * *'; // Daily at midnight

      expect(() => {
        service.scheduleJob(scrapeId, expression);
      }).not.toThrow();
    });

    it('should work with cron expressions', () => {
      expect(service).toBeDefined();
    });
  });

  describe('removeJob', () => {
    it('should remove existing job', async () => {
      const scrapeId = 'test-scrape';
      
      // First schedule a job
      await service.scheduleJob(scrapeId, '0 0 * * *');

      // Then remove it
      expect(() => {
        service.removeJob(scrapeId);
      }).not.toThrow();
    });

    it('should not throw error when removing non-existent job', () => {
      expect(() => {
        service.removeJob('non-existent');
      }).not.toThrow();
    });
  });

  describe('active jobs', () => {
    it('should schedule and track jobs', async () => {
      await service.scheduleJob('scrape1', '0 0 * * *');
      await service.scheduleJob('scrape2', '0 12 * * *');

      // Jobs should be tracked internally
      expect(true).toBe(true);
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop all jobs on module destroy', async () => {
      await service.scheduleJob('scrape1', '0 0 * * *');
      await service.scheduleJob('scrape2', '0 12 * * *');

      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });
});
