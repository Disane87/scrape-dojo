import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VariablesService } from './variables.service';
import { VariableEntity } from '../database/entities/variable.entity';
import { SecretsService } from '../secrets/secrets.service';
import { DatabaseService } from '../database/database.service';

describe('VariablesService', () => {
  let service: VariablesService;
  let variableRepository: any /*Repository<VariableEntity>*/;
  let secretsService: any /*SecretsService*/;

  const mockRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    createQueryBuilder: vi.fn(() => ({
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(null),
    })),
  };

  const mockSecretsService = {
    getSecret: vi.fn(),
    createSecret: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariablesService,
        {
          provide: getRepositoryToken(VariableEntity),
          useValue: mockRepository,
        },
        {          provide: DatabaseService,
          useValue: {},
        },
        {          provide: SecretsService,
          useValue: mockSecretsService,
        },
      ],
    }).compile();

    service = module.get<VariablesService>(VariablesService);
    variableRepository = module.get(getRepositoryToken(VariableEntity));
    secretsService = module.get(SecretsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getByName', () => {
    it('should return variable value', async () => {
      const mockVariable = {
        id: '1',
        scope: 'workflow',
        workflowId: 'test',
        name: 'testVar',
        value: 'testValue',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      variableRepository.findOne.mockResolvedValue(mockVariable as any);

      const result = await service.getByName('testVar', 'test');

      expect(result?.value).toBe('testValue');
      expect(variableRepository.findOne).toHaveBeenCalled();
    });

    it('should return secret value if secretRef exists', async () => {
      const mockVariable = {
        id: '1',
        scope: 'workflow',
        workflowId: 'test',
        name: 'testVar',
        secretRef: 'secret-ref',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      variableRepository.findOne.mockResolvedValue(mockVariable as any);
      mockSecretsService.getSecret.mockResolvedValue({ value: 'secret-value' } as any);

      const result = await service.getByName('testVar', 'test');

      expect(result).toBeDefined();
    });

    it('should return undefined if variable not found', async () => {
      variableRepository.findOne.mockResolvedValue(null);

      const result = await service.getByName('nonExistent', 'test');

      expect(result).toBeUndefined();
    });
  });

  describe('create/update variable', () => {
    it('should create new variable', async () => {
      const mockVariable = {
        id: '1',
        scope: 'workflow',
        workflowId: 'test',
        name: 'newVar',
        value: 'newValue',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      variableRepository.create.mockReturnValue(mockVariable as any);
      variableRepository.save.mockResolvedValue(mockVariable as any);

      const result = await service.create({
        name: 'newVar',
        value: 'newValue',
        scope: 'workflow',
        workflowId: 'test',
      });

      expect(variableRepository.create).toHaveBeenCalled();
      expect(variableRepository.save).toHaveBeenCalled();
    });

    it('should update existing variable', async () => {
      const existingVariable = {
        id: '1',
        scope: 'workflow',
        workflowId: 'test',
        name: 'existingVar',
        value: 'oldValue',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      variableRepository.findOne.mockResolvedValue(existingVariable as any);
      variableRepository.save.mockResolvedValue({ ...existingVariable, value: 'newValue' } as any);

      const result = await service.update('1', { value: 'newValue' });

      expect(variableRepository.save).toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should return all variables', async () => {
      const mockVariables = [
        { id: '1', scope: 'workflow', workflowId: 'test', name: 'var1', value: 'value1', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', scope: 'workflow', workflowId: 'test', name: 'var2', value: 'value2', createdAt: new Date(), updatedAt: new Date() },
      ];

      const queryBuilder: any = {
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockVariables),
      };
      variableRepository.createQueryBuilder = vi.fn().mockReturnValue(queryBuilder);

      const result = await service.getAll('workflow', 'test');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('var1');
    });
  });

  describe('delete', () => {
    it('should delete variable', async () => {
      variableRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.delete('1');

      expect(variableRepository.delete).toHaveBeenCalledWith('1');
    });
  });
});
