import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StepRepository } from './step.repository';
import { RunStep } from '../entities';

describe('StepRepository', () => {
  let repository: StepRepository;

  const mockStep: Partial<RunStep> = {
    id: 1,
    runId: 'run-123',
    stepIndex: 0,
    stepName: 'Login Step',
    status: 'running',
    startTime: new Date(),
    endTime: null,
    actions: [],
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
        StepRepository,
        {
          provide: getRepositoryToken(RunStep),
          useValue: mockTypeOrmRepo,
        },
      ],
    }).compile();

    repository = module.get<StepRepository>(StepRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a step with running status', async () => {
      mockTypeOrmRepo.create.mockReturnValue(mockStep);
      mockTypeOrmRepo.save.mockResolvedValue(mockStep);

      const result = await repository.create('run-123', 'Login Step', 0);

      expect(result).toEqual(mockStep);
      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: 'run-123',
          stepIndex: 0,
          stepName: 'Login Step',
          status: 'running',
          endTime: null,
        }),
      );
      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(mockStep);
    });
  });

  describe('updateStatus', () => {
    it('should update status and set endTime for non-running status', async () => {
      mockTypeOrmRepo.update.mockResolvedValue({ affected: 1 });

      await repository.updateStatus(1, 'completed');

      expect(mockTypeOrmRepo.update).toHaveBeenCalledWith(1, {
        status: 'completed',
        endTime: expect.any(Date),
      });
    });

    it('should not set endTime when status is running', async () => {
      mockTypeOrmRepo.update.mockResolvedValue({ affected: 1 });

      await repository.updateStatus(1, 'running');

      expect(mockTypeOrmRepo.update).toHaveBeenCalledWith(1, {
        status: 'running',
        endTime: undefined,
      });
    });

    it('should set endTime for error status', async () => {
      mockTypeOrmRepo.update.mockResolvedValue({ affected: 1 });

      await repository.updateStatus(1, 'error');

      expect(mockTypeOrmRepo.update).toHaveBeenCalledWith(1, {
        status: 'error',
        endTime: expect.any(Date),
      });
    });
  });

  describe('findById', () => {
    it('should find a step by id with actions relation', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(mockStep);

      const result = await repository.findById(1);

      expect(result).toEqual(mockStep);
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['actions'],
      });
    });

    it('should return null when step is not found', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByRunId', () => {
    it('should return steps ordered by stepIndex ASC with actions', async () => {
      const steps = [
        mockStep,
        { ...mockStep, id: 2, stepIndex: 1, stepName: 'Extract Step' },
      ];
      mockTypeOrmRepo.find.mockResolvedValue(steps);

      const result = await repository.findByRunId('run-123');

      expect(result).toEqual(steps);
      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        where: { runId: 'run-123' },
        order: { stepIndex: 'ASC' },
        relations: ['actions'],
      });
    });

    it('should return empty array when no steps found', async () => {
      mockTypeOrmRepo.find.mockResolvedValue([]);

      const result = await repository.findByRunId('run-999');

      expect(result).toEqual([]);
    });
  });

  describe('deleteByRunId', () => {
    it('should delete steps by runId and return affected count', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 3 });

      const result = await repository.deleteByRunId('run-123');

      expect(result).toBe(3);
      expect(mockTypeOrmRepo.delete).toHaveBeenCalledWith({ runId: 'run-123' });
    });

    it('should return 0 when no steps are deleted', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 0 });

      const result = await repository.deleteByRunId('run-999');

      expect(result).toBe(0);
    });

    it('should return 0 when affected is undefined', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({});

      const result = await repository.deleteByRunId('run-999');

      expect(result).toBe(0);
    });
  });
});
