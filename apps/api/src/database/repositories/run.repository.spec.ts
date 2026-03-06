import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RunRepository } from './run.repository';
import { Run } from '../entities';

describe('RunRepository', () => {
  let repository: RunRepository;

  const mockRun: Partial<Run> = {
    id: 'run-123',
    scrapeId: 'scrape-1',
    status: 'running',
    trigger: 'manual',
    startTime: new Date(),
    endTime: null,
    error: null,
    steps: [],
  };

  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    getRawMany: vi.fn(),
    delete: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  };

  const mockTypeOrmRepo = {
    create: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    count: vi.fn(),
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunRepository,
        {
          provide: getRepositoryToken(Run),
          useValue: mockTypeOrmRepo,
        },
      ],
    }).compile();

    repository = module.get<RunRepository>(RunRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a run with default trigger "manual"', async () => {
      mockTypeOrmRepo.create.mockReturnValue(mockRun);
      mockTypeOrmRepo.save.mockResolvedValue(mockRun);

      const result = await repository.create('run-123', 'scrape-1');

      expect(result).toEqual(mockRun);
      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'run-123',
          scrapeId: 'scrape-1',
          status: 'running',
          trigger: 'manual',
        }),
      );
      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(mockRun);
    });

    it('should create a run with a specified trigger', async () => {
      mockTypeOrmRepo.create.mockReturnValue(mockRun);
      mockTypeOrmRepo.save.mockResolvedValue(mockRun);

      await repository.create('run-123', 'scrape-1', 'scheduled');

      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ trigger: 'scheduled' }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status and set endTime for non-running status', async () => {
      mockTypeOrmRepo.update.mockResolvedValue({ affected: 1 });

      await repository.updateStatus('run-123', 'completed');

      expect(mockTypeOrmRepo.update).toHaveBeenCalledWith('run-123', {
        status: 'completed',
        endTime: expect.any(Date),
        error: null,
      });
    });

    it('should not set endTime when status is running', async () => {
      mockTypeOrmRepo.update.mockResolvedValue({ affected: 1 });

      await repository.updateStatus('run-123', 'running');

      expect(mockTypeOrmRepo.update).toHaveBeenCalledWith('run-123', {
        status: 'running',
        endTime: undefined,
        error: null,
      });
    });

    it('should set error message when provided', async () => {
      mockTypeOrmRepo.update.mockResolvedValue({ affected: 1 });

      await repository.updateStatus('run-123', 'error', 'Something failed');

      expect(mockTypeOrmRepo.update).toHaveBeenCalledWith('run-123', {
        status: 'error',
        endTime: expect.any(Date),
        error: 'Something failed',
      });
    });
  });

  describe('findById', () => {
    it('should find a run by id with steps and actions relations', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(mockRun);

      const result = await repository.findById('run-123');

      expect(result).toEqual(mockRun);
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'run-123' },
        relations: ['steps', 'steps.actions'],
      });
    });

    it('should return null when run not found', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findRecent', () => {
    it('should return recent runs with default limit of 50', async () => {
      mockTypeOrmRepo.find.mockResolvedValue([mockRun]);

      const result = await repository.findRecent();

      expect(result).toEqual([mockRun]);
      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        relations: ['steps', 'steps.actions'],
        order: { startTime: 'DESC' },
        take: 50,
      });
    });

    it('should accept a custom limit', async () => {
      mockTypeOrmRepo.find.mockResolvedValue([]);

      await repository.findRecent(10);

      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  describe('findByScrapeId', () => {
    it('should find runs by scrapeId', async () => {
      mockTypeOrmRepo.find.mockResolvedValue([mockRun]);

      const result = await repository.findByScrapeId('scrape-1');

      expect(result).toEqual([mockRun]);
      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        where: { scrapeId: 'scrape-1' },
        relations: ['steps', 'steps.actions'],
        order: { startTime: 'DESC' },
        take: 50,
      });
    });
  });

  describe('findLastRunForEachScrape', () => {
    it('should return a map of last run info per scrape', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { scrapeId: 'scrape-1' },
        { scrapeId: 'scrape-2' },
      ]);

      const run1 = {
        ...mockRun,
        scrapeId: 'scrape-1',
        status: 'completed' as const,
        startTime: new Date(),
        endTime: new Date(),
      };
      const run2 = {
        ...mockRun,
        scrapeId: 'scrape-2',
        status: 'error' as const,
        startTime: new Date(),
        endTime: null,
      };

      mockTypeOrmRepo.findOne
        .mockResolvedValueOnce(run1)
        .mockResolvedValueOnce(run2);

      const result = await repository.findLastRunForEachScrape();

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('scrape-1')).toEqual({
        status: 'completed',
        startTime: run1.startTime,
        endTime: run1.endTime,
      });
      expect(result.get('scrape-2')).toEqual({
        status: 'error',
        startTime: run2.startTime,
        endTime: run2.endTime,
      });
    });

    it('should return empty map when no scrapes exist', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await repository.findLastRunForEachScrape();

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete runs older than specified days', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 5 });

      const result = await repository.deleteOlderThan(30);

      expect(result).toBe(5);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'startTime < :cutoffDate',
        expect.objectContaining({ cutoffDate: expect.any(Date) }),
      );
    });

    it('should return 0 when no runs are deleted', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      const result = await repository.deleteOlderThan(30);

      expect(result).toBe(0);
    });
  });

  describe('countByScrapeId', () => {
    it('should return count of runs for a scrapeId', async () => {
      mockTypeOrmRepo.count.mockResolvedValue(42);

      const result = await repository.countByScrapeId('scrape-1');

      expect(result).toBe(42);
      expect(mockTypeOrmRepo.count).toHaveBeenCalledWith({
        where: { scrapeId: 'scrape-1' },
      });
    });
  });
});
