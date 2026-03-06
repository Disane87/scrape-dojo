import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionRepository } from './action.repository';
import { RunAction } from '../entities';

describe('ActionRepository', () => {
  let repository: ActionRepository;

  const mockAction: Partial<RunAction> = {
    id: 1,
    stepId: 10,
    actionIndex: 0,
    actionName: 'Navigate to page',
    actionType: 'navigate',
    status: 'running',
    startTime: new Date(),
    endTime: null,
    result: null,
    error: null,
    loopData: null,
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
        ActionRepository,
        {
          provide: getRepositoryToken(RunAction),
          useValue: mockTypeOrmRepo,
        },
      ],
    }).compile();

    repository = module.get<ActionRepository>(ActionRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create an action with running status', async () => {
      mockTypeOrmRepo.create.mockReturnValue(mockAction);
      mockTypeOrmRepo.save.mockResolvedValue(mockAction);

      const result = await repository.create(
        10,
        'Navigate to page',
        'navigate',
        0,
      );

      expect(result).toEqual(mockAction);
      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 10,
          actionIndex: 0,
          actionName: 'Navigate to page',
          actionType: 'navigate',
          status: 'running',
          endTime: null,
          result: null,
          error: null,
        }),
      );
      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(mockAction);
    });
  });

  describe('updateStatus', () => {
    it('should update status and set endTime for completed actions', async () => {
      mockTypeOrmRepo.update.mockResolvedValue({ affected: 1 });

      await repository.updateStatus(1, 'completed');

      expect(mockTypeOrmRepo.update).toHaveBeenCalledWith(1, {
        status: 'completed',
        endTime: expect.any(Date),
        error: null,
        result: null,
      });
    });

    it('should not set endTime when status is running', async () => {
      mockTypeOrmRepo.update.mockResolvedValue({ affected: 1 });

      await repository.updateStatus(1, 'running');

      expect(mockTypeOrmRepo.update).toHaveBeenCalledWith(1, {
        status: 'running',
        endTime: undefined,
        error: null,
        result: null,
      });
    });

    it('should set error message', async () => {
      mockTypeOrmRepo.update.mockResolvedValue({ affected: 1 });

      await repository.updateStatus(1, 'error', 'Element not found');

      expect(mockTypeOrmRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'error',
          error: 'Element not found',
        }),
      );
    });

    it('should serialize result to JSON', async () => {
      mockTypeOrmRepo.update.mockResolvedValue({ affected: 1 });

      await repository.updateStatus(1, 'completed', undefined, {
        data: 'extracted',
      });

      expect(mockTypeOrmRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          result: JSON.stringify({ data: 'extracted' }),
        }),
      );
    });

    it('should serialize loopData to JSON when provided', async () => {
      mockTypeOrmRepo.update.mockResolvedValue({ affected: 1 });

      const loopData = [{ iteration: 0, result: 'ok' }];
      await repository.updateStatus(
        1,
        'completed',
        undefined,
        undefined,
        loopData,
      );

      expect(mockTypeOrmRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          loopData: JSON.stringify(loopData),
        }),
      );
    });

    it('should not include loopData when not provided', async () => {
      mockTypeOrmRepo.update.mockResolvedValue({ affected: 1 });

      await repository.updateStatus(1, 'completed');

      const updateArg = mockTypeOrmRepo.update.mock.calls[0][1];
      expect(updateArg).not.toHaveProperty('loopData');
    });
  });

  describe('findById', () => {
    it('should find an action by id', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(mockAction);

      const result = await repository.findById(1);

      expect(result).toEqual(mockAction);
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return null when action is not found', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByStepId', () => {
    it('should return actions ordered by actionIndex ASC', async () => {
      const actions = [mockAction, { ...mockAction, id: 2, actionIndex: 1 }];
      mockTypeOrmRepo.find.mockResolvedValue(actions);

      const result = await repository.findByStepId(10);

      expect(result).toEqual(actions);
      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        where: { stepId: 10 },
        order: { actionIndex: 'ASC' },
      });
    });

    it('should return empty array when no actions found', async () => {
      mockTypeOrmRepo.find.mockResolvedValue([]);

      const result = await repository.findByStepId(999);

      expect(result).toEqual([]);
    });
  });

  describe('deleteByStepId', () => {
    it('should delete actions by stepId and return affected count', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 5 });

      const result = await repository.deleteByStepId(10);

      expect(result).toBe(5);
      expect(mockTypeOrmRepo.delete).toHaveBeenCalledWith({ stepId: 10 });
    });

    it('should return 0 when no actions deleted', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 0 });

      const result = await repository.deleteByStepId(999);

      expect(result).toBe(0);
    });

    it('should return 0 when affected is undefined', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({});

      const result = await repository.deleteByStepId(999);

      expect(result).toBe(0);
    });
  });
});
