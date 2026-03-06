import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrapeDataRepository } from './scrape-data.repository';
import { ScrapeData } from '../entities';

describe('ScrapeDataRepository', () => {
  let repository: ScrapeDataRepository;

  const now = new Date();
  const mockScrapeData: Partial<ScrapeData> = {
    id: 1,
    scrapeId: 'amazon',
    runId: null,
    key: 'lastOrderId',
    value: 'ORD-12345',
    createdAt: now,
    updatedAt: now,
  };

  const mockTypeOrmRepo = {
    create: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScrapeDataRepository,
        {
          provide: getRepositoryToken(ScrapeData),
          useValue: mockTypeOrmRepo,
        },
      ],
    }).compile();

    repository = module.get<ScrapeDataRepository>(ScrapeDataRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('upsertJobData', () => {
    it('should update existing job data when record exists', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue({ ...mockScrapeData, id: 1 });
      mockTypeOrmRepo.update.mockResolvedValue({ affected: 1 });

      await repository.upsertJobData('amazon', 'lastOrderId', 'ORD-99999');

      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { scrapeId: 'amazon', key: 'lastOrderId', runId: null },
      });
      expect(mockTypeOrmRepo.update).toHaveBeenCalledWith(1, {
        value: 'ORD-99999',
        updatedAt: expect.any(Date),
      });
      expect(mockTypeOrmRepo.create).not.toHaveBeenCalled();
    });

    it('should create new job data when no record exists', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);
      mockTypeOrmRepo.create.mockReturnValue(mockScrapeData);
      mockTypeOrmRepo.save.mockResolvedValue(mockScrapeData);

      await repository.upsertJobData('amazon', 'lastOrderId', 'ORD-12345');

      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith({
        scrapeId: 'amazon',
        runId: null,
        key: 'lastOrderId',
        value: 'ORD-12345',
      });
      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(mockScrapeData);
      expect(mockTypeOrmRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('saveRunData', () => {
    it('should create run-specific data', async () => {
      const runData = { ...mockScrapeData, runId: 'run-123' };
      mockTypeOrmRepo.create.mockReturnValue(runData);
      mockTypeOrmRepo.save.mockResolvedValue(runData);

      await repository.saveRunData(
        'amazon',
        'run-123',
        'extractedPrice',
        '$19.99',
      );

      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith({
        scrapeId: 'amazon',
        runId: 'run-123',
        key: 'extractedPrice',
        value: '$19.99',
      });
      expect(mockTypeOrmRepo.save).toHaveBeenCalled();
    });
  });

  describe('getJobData', () => {
    it('should return all job-level data for a scrape ordered by key', async () => {
      const data = [mockScrapeData];
      mockTypeOrmRepo.find.mockResolvedValue(data);

      const result = await repository.getJobData('amazon');

      expect(result).toEqual(data);
      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        where: { scrapeId: 'amazon', runId: null },
        order: { key: 'ASC' },
      });
    });
  });

  describe('getRunData', () => {
    it('should return all run-specific data', async () => {
      const runData = [{ ...mockScrapeData, runId: 'run-123' }];
      mockTypeOrmRepo.find.mockResolvedValue(runData);

      const result = await repository.getRunData('amazon', 'run-123');

      expect(result).toEqual(runData);
      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        where: { scrapeId: 'amazon', runId: 'run-123' },
        order: { key: 'ASC' },
      });
    });
  });

  describe('getValue', () => {
    it('should return value when data exists (job-level)', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue({
        ...mockScrapeData,
        value: 'ORD-12345',
      });

      const result = await repository.getValue('amazon', 'lastOrderId');

      expect(result).toBe('ORD-12345');
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { scrapeId: 'amazon', key: 'lastOrderId', runId: null },
      });
    });

    it('should return value when data exists (run-level)', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue({
        ...mockScrapeData,
        value: 'run-value',
      });

      const result = await repository.getValue(
        'amazon',
        'extractedPrice',
        'run-123',
      );

      expect(result).toBe('run-value');
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { scrapeId: 'amazon', key: 'extractedPrice', runId: 'run-123' },
      });
    });

    it('should return null when data does not exist', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.getValue('amazon', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteJobData', () => {
    it('should delete all job data for a scrape when no key specified', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 3 });

      const result = await repository.deleteJobData('amazon');

      expect(result).toBe(3);
      expect(mockTypeOrmRepo.delete).toHaveBeenCalledWith({
        scrapeId: 'amazon',
        runId: null,
      });
    });

    it('should delete specific job data key', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 1 });

      const result = await repository.deleteJobData('amazon', 'lastOrderId');

      expect(result).toBe(1);
      expect(mockTypeOrmRepo.delete).toHaveBeenCalledWith({
        scrapeId: 'amazon',
        runId: null,
        key: 'lastOrderId',
      });
    });

    it('should return 0 when nothing deleted', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 0 });

      const result = await repository.deleteJobData('nonexistent');

      expect(result).toBe(0);
    });
  });

  describe('deleteRunData', () => {
    it('should delete all data for a run', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 5 });

      const result = await repository.deleteRunData('run-123');

      expect(result).toBe(5);
      expect(mockTypeOrmRepo.delete).toHaveBeenCalledWith({ runId: 'run-123' });
    });

    it('should return 0 when no data deleted', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 0 });

      const result = await repository.deleteRunData('run-999');

      expect(result).toBe(0);
    });
  });

  describe('toDTO', () => {
    it('should convert ScrapeData entity to DTO', () => {
      const entity = {
        id: 1,
        scrapeId: 'amazon',
        runId: null,
        key: 'lastOrderId',
        value: 'ORD-12345',
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: new Date('2025-01-15T12:00:00Z'),
      } as ScrapeData;

      const dto = repository.toDTO(entity);

      expect(dto).toEqual({
        id: 1,
        scrapeId: 'amazon',
        runId: null,
        key: 'lastOrderId',
        value: 'ORD-12345',
        createdAt: new Date('2025-01-15T10:00:00Z').getTime(),
        updatedAt: new Date('2025-01-15T12:00:00Z').getTime(),
      });
    });

    it('should include runId when present', () => {
      const entity = {
        id: 2,
        scrapeId: 'amazon',
        runId: 'run-123',
        key: 'price',
        value: '$9.99',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ScrapeData;

      const dto = repository.toDTO(entity);

      expect(dto.runId).toBe('run-123');
    });
  });
});
