import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { VariablesService } from './variables.service';
import { VariableEntity } from '../database/entities/variable.entity';
import { SecretsService } from '../secrets/secrets.service';
import { DatabaseService } from '../database/database.service';

describe('VariablesService', () => {
  let service: VariablesService;
  let variableRepository: any;

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
      getMany: vi.fn().mockResolvedValue([]),
    })),
  };

  const mockSecretsService = {
    getSecret: vi.fn(),
    createSecret: vi.fn(),
    getSecretValue: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariablesService,
        {
          provide: getRepositoryToken(VariableEntity),
          useValue: mockRepository,
        },
        { provide: DatabaseService, useValue: {} },
        { provide: SecretsService, useValue: mockSecretsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<VariablesService>(VariablesService);
    variableRepository = module.get(getRepositoryToken(VariableEntity));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should call syncEnvVariables', async () => {
      // onModuleInit calls syncEnvVariables which scans process.env
      // It should not throw
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('syncEnvVariables (via onModuleInit)', () => {
    it('should sync SCRAPE_DOJO_VAR_ env variables as global variables', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, SCRAPE_DOJO_VAR_TEST_NAME: 'test-value' };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        id: 'var_1',
        name: 'testName',
        value: 'test-value',
        scope: 'global',
        createdAt: 0,
        updatedAt: 0,
      });
      mockRepository.save.mockImplementation((v: any) => Promise.resolve(v));

      const queryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.onModuleInit();

      // create should have been called for the env var
      expect(mockRepository.create).toHaveBeenCalled();

      process.env = originalEnv;
    });

    it('should sync SCRAPE_DOJO_SECRET_ env variables as secrets', async () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        SCRAPE_DOJO_SECRET_API_KEY: 'secret-val',
      };

      mockSecretsService.getSecret.mockResolvedValue(null);
      mockSecretsService.createSecret.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockSecretsService.createSecret).toHaveBeenCalledWith(
        'apiKey',
        'secret-val',
        expect.stringContaining('Auto-synced'),
      );

      process.env = originalEnv;
    });

    it('should not overwrite existing secrets', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, SCRAPE_DOJO_SECRET_EXISTING: 'new-val' };

      mockSecretsService.getSecret.mockResolvedValue({
        id: 'sec-1',
        name: 'existing',
      });

      await service.onModuleInit();

      expect(mockSecretsService.createSecret).not.toHaveBeenCalled();

      process.env = originalEnv;
    });

    it('should update existing env variable if value changed', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, SCRAPE_DOJO_VAR_CHANGED: 'new-value' };

      const existingVar = {
        id: 'var_1',
        name: 'changed',
        value: 'old-value',
        scope: 'global',
        createdAt: 0,
        updatedAt: 0,
      };
      mockRepository.findOne.mockResolvedValue(existingVar);
      mockRepository.save.mockImplementation((v: any) => Promise.resolve(v));

      await service.onModuleInit();

      expect(mockRepository.save).toHaveBeenCalled();

      process.env = originalEnv;
    });

    it('should handle errors in syncEnvVariable gracefully', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, SCRAPE_DOJO_VAR_FAIL: 'val' };

      mockRepository.findOne.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.onModuleInit()).resolves.not.toThrow();

      process.env = originalEnv;
    });

    it('should handle errors in syncEnvSecret gracefully', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, SCRAPE_DOJO_SECRET_FAIL: 'val' };

      mockSecretsService.getSecret.mockRejectedValue(
        new Error('Secrets DB error'),
      );

      // Should not throw
      await expect(service.onModuleInit()).resolves.not.toThrow();

      process.env = originalEnv;
    });
  });

  describe('convertEnvNameToVarName', () => {
    it('should convert ENV_NAME to camelCase', () => {
      expect((service as any).convertEnvNameToVarName('TEST_NAME')).toBe(
        'testName',
      );
    });

    it('should handle single word', () => {
      expect((service as any).convertEnvNameToVarName('SIMPLE')).toBe('simple');
    });

    it('should handle multiple underscores', () => {
      expect((service as any).convertEnvNameToVarName('MY_LONG_VAR_NAME')).toBe(
        'myLongVarName',
      );
    });
  });

  describe('getByName', () => {
    it('should return variable value', async () => {
      const mockVariable = {
        id: '1',
        scope: 'workflow',
        workflowId: 'test',
        name: 'testVar',
        value: 'testValue',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      variableRepository.findOne.mockResolvedValue(mockVariable as any);

      const result = await service.getByName('testVar', 'test');

      expect(result?.value).toBe('testValue');
      expect(variableRepository.findOne).toHaveBeenCalled();
    });

    it('should return undefined if variable not found', async () => {
      variableRepository.findOne.mockResolvedValue(null);

      const result = await service.getByName('nonExistent', 'test');

      expect(result).toBeUndefined();
    });

    it('should fallback to global if workflow variable not found', async () => {
      variableRepository.findOne
        .mockResolvedValueOnce(null) // workflow lookup
        .mockResolvedValueOnce({
          id: '1',
          name: 'test',
          value: 'global-val',
          scope: 'global',
          createdAt: 0,
          updatedAt: 0,
        }); // global lookup

      const result = await service.getByName('test', 'workflow-1');
      expect(result?.value).toBe('global-val');
    });

    it('should search only global when no workflowId provided', async () => {
      variableRepository.findOne.mockResolvedValue({
        id: '1',
        name: 'test',
        value: 'val',
        scope: 'global',
        createdAt: 0,
        updatedAt: 0,
      });

      const result = await service.getByName('test');

      expect(result?.value).toBe('val');
      // Only one call (global lookup), not two
      expect(variableRepository.findOne).toHaveBeenCalledTimes(1);
      expect(variableRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'test', scope: 'global' },
      });
    });

    it('should return workflow-specific variable when found', async () => {
      const workflowVar = {
        id: '2',
        name: 'test',
        value: 'workflow-val',
        scope: 'workflow',
        workflowId: 'wf1',
        createdAt: 0,
        updatedAt: 0,
      };
      variableRepository.findOne.mockResolvedValueOnce(workflowVar);

      const result = await service.getByName('test', 'wf1');
      expect(result?.value).toBe('workflow-val');
      // Should not make a second call for global since workflow var was found
      expect(variableRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('getByNameAndWorkflow', () => {
    it('should find workflow-specific variable', async () => {
      const mockVar = {
        id: '1',
        name: 'var1',
        scope: 'workflow',
        workflowId: 'wf1',
        value: 'v',
        createdAt: 0,
        updatedAt: 0,
      };
      variableRepository.findOne.mockResolvedValue(mockVar);

      const result = await service.getByNameAndWorkflow('var1', 'wf1');
      expect(result).toBeDefined();
      expect(variableRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'var1', scope: 'workflow', workflowId: 'wf1' },
      });
    });

    it('should return undefined when not found', async () => {
      variableRepository.findOne.mockResolvedValue(null);

      const result = await service.getByNameAndWorkflow('nonexistent', 'wf1');
      expect(result).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('should return variable by ID', async () => {
      variableRepository.findOne.mockResolvedValue({
        id: '1',
        name: 'test',
        value: 'val',
        scope: 'global',
        createdAt: 0,
        updatedAt: 0,
      });
      const result = await service.getById('1');
      expect(result).toBeDefined();
      expect(result?.name).toBe('test');
    });

    it('should return undefined for missing ID', async () => {
      variableRepository.findOne.mockResolvedValue(null);
      const result = await service.getById('missing');
      expect(result).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create new variable', async () => {
      const mockVariable = {
        id: '1',
        scope: 'workflow',
        workflowId: 'test',
        name: 'newVar',
        value: 'newValue',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      variableRepository.create.mockReturnValue(mockVariable as any);
      variableRepository.save.mockResolvedValue(mockVariable as any);

      await service.create({
        name: 'newVar',
        value: 'newValue',
        scope: 'workflow',
        workflowId: 'test',
      });

      expect(variableRepository.create).toHaveBeenCalled();
      expect(variableRepository.save).toHaveBeenCalled();
    });

    it('should throw if variable already exists', async () => {
      const queryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({ id: '1' }),
      };
      variableRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      await expect(
        service.create({
          name: 'existing',
          value: 'val',
          scope: 'global',
        }),
      ).rejects.toThrow(/already exists/);
    });

    it('should create global variable with correct scope check', async () => {
      const queryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      variableRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const mockVar = {
        id: 'var_1',
        name: 'globalVar',
        value: 'gv',
        scope: 'global',
        createdAt: 0,
        updatedAt: 0,
      };
      variableRepository.create.mockReturnValue(mockVar);
      variableRepository.save.mockResolvedValue(mockVar);

      const result = await service.create({
        name: 'globalVar',
        value: 'gv',
        scope: 'global',
      });

      expect(result.name).toBe('globalVar');
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'variable.scope = :scope',
        { scope: 'global' },
      );
    });

    it('should create workflow variable with correct scope and workflowId check', async () => {
      const queryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      variableRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const mockVar = {
        id: 'var_1',
        name: 'wfVar',
        value: 'wv',
        scope: 'workflow',
        workflowId: 'wf1',
        createdAt: 0,
        updatedAt: 0,
      };
      variableRepository.create.mockReturnValue(mockVar);
      variableRepository.save.mockResolvedValue(mockVar);

      await service.create({
        name: 'wfVar',
        value: 'wv',
        scope: 'workflow',
        workflowId: 'wf1',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'variable.scope = :scope AND variable.workflowId = :workflowId',
        { scope: 'workflow', workflowId: 'wf1' },
      );
    });

    it('should set isSecret and secretId when provided', async () => {
      const queryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      variableRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const mockVar = {
        id: 'var_1',
        name: 'secVar',
        value: '',
        scope: 'global',
        isSecret: true,
        secretId: 'sec-1',
        createdAt: 0,
        updatedAt: 0,
      };
      variableRepository.create.mockReturnValue(mockVar);
      variableRepository.save.mockResolvedValue(mockVar);

      await service.create({
        name: 'secVar',
        value: '',
        scope: 'global',
        isSecret: true,
        secretId: 'sec-1',
      });

      expect(variableRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isSecret: true,
          secretId: 'sec-1',
        }),
      );
    });
  });

  describe('update', () => {
    it('should update existing variable', async () => {
      const existingVariable = {
        id: '1',
        scope: 'workflow',
        workflowId: 'test',
        name: 'existingVar',
        value: 'oldValue',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      variableRepository.findOne.mockResolvedValue(existingVariable as any);
      variableRepository.save.mockResolvedValue({
        ...existingVariable,
        value: 'newValue',
      } as any);

      await service.update('1', { value: 'newValue' });

      expect(variableRepository.save).toHaveBeenCalled();
    });

    it('should throw if variable not found', async () => {
      variableRepository.findOne.mockResolvedValue(null);
      await expect(service.update('missing', { value: 'v' })).rejects.toThrow(
        'Variable not found',
      );
    });

    it('should update only description when value is not provided', async () => {
      const existing = {
        id: '1',
        name: 'test',
        value: 'original',
        description: 'old desc',
        scope: 'global',
        createdAt: 0,
        updatedAt: 0,
      };
      variableRepository.findOne.mockResolvedValue({ ...existing });
      variableRepository.save.mockImplementation((v: any) =>
        Promise.resolve(v),
      );

      await service.update('1', { description: 'new desc' });

      const saved = variableRepository.save.mock.calls[0][0];
      expect(saved.value).toBe('original');
      expect(saved.description).toBe('new desc');
    });

    it('should update updatedAt timestamp', async () => {
      const existing = {
        id: '1',
        name: 'test',
        value: 'val',
        scope: 'global',
        createdAt: 1000,
        updatedAt: 1000,
      };
      variableRepository.findOne.mockResolvedValue({ ...existing });
      variableRepository.save.mockImplementation((v: any) =>
        Promise.resolve(v),
      );

      await service.update('1', { value: 'new' });

      const saved = variableRepository.save.mock.calls[0][0];
      expect(saved.updatedAt).toBeGreaterThan(1000);
    });
  });

  describe('getAll', () => {
    it('should return all variables', async () => {
      const mockVariables = [
        {
          id: '1',
          scope: 'workflow',
          workflowId: 'test',
          name: 'var1',
          value: 'value1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: '2',
          scope: 'workflow',
          workflowId: 'test',
          name: 'var2',
          value: 'value2',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const queryBuilder: any = {
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockVariables),
      };
      variableRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(queryBuilder);

      const result = await service.getAll('workflow', 'test');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('var1');
    });

    it('should not apply scope filter when scope is not provided', async () => {
      const queryBuilder: any = {
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      variableRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(queryBuilder);

      await service.getAll();

      // andWhere should not be called for scope or workflowId
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should apply scope filter but not workflowId when only scope is provided', async () => {
      const queryBuilder: any = {
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      variableRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(queryBuilder);

      await service.getAll('global');

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'variable.scope = :scope',
        { scope: 'global' },
      );
    });
  });

  describe('getGlobal', () => {
    it('should call getAll with global scope', async () => {
      const queryBuilder = {
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      variableRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(queryBuilder);

      await service.getGlobal();
      expect(variableRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getByWorkflow', () => {
    it('should call getAll with workflow scope', async () => {
      const queryBuilder = {
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      variableRepository.createQueryBuilder = vi
        .fn()
        .mockReturnValue(queryBuilder);

      await service.getByWorkflow('wf-1');
      expect(variableRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete variable and return true', async () => {
      variableRepository.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.delete('1');

      expect(result).toBe(true);
      expect(variableRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should return false when nothing deleted', async () => {
      variableRepository.delete.mockResolvedValue({ affected: 0 } as any);
      const result = await service.delete('nonexistent');
      expect(result).toBe(false);
    });

    it('should return false when affected is undefined', async () => {
      variableRepository.delete.mockResolvedValue({} as any);
      const result = await service.delete('x');
      expect(result).toBe(false);
    });
  });

  describe('getAsMap', () => {
    it('should return key-value map of variables', async () => {
      variableRepository.find.mockResolvedValue([
        { name: 'var1', value: 'val1', scope: 'global', isSecret: false },
        { name: 'var2', value: 'val2', scope: 'global', isSecret: false },
      ]);

      const result = await service.getAsMap();
      expect(result.var1).toBe('val1');
      expect(result.var2).toBe('val2');
    });

    it('should resolve secret values for secret variables', async () => {
      variableRepository.find.mockResolvedValue([
        {
          name: 'secretVar',
          value: '',
          scope: 'global',
          isSecret: true,
          secretId: 'sec-1',
        },
      ]);
      mockSecretsService.getSecretValue.mockResolvedValue('decrypted-value');

      const result = await service.getAsMap();
      expect(result.secretVar).toBe('decrypted-value');
    });

    it('should merge workflow variables over global', async () => {
      variableRepository.find
        .mockResolvedValueOnce([
          { name: 'shared', value: 'global', scope: 'global', isSecret: false },
        ])
        .mockResolvedValueOnce([
          {
            name: 'shared',
            value: 'workflow',
            scope: 'workflow',
            isSecret: false,
          },
        ]);

      const result = await service.getAsMap('wf-1');
      expect(result.shared).toBe('workflow');
    });

    it('should return empty string for secret with no secretId', async () => {
      variableRepository.find.mockResolvedValue([
        {
          name: 'secretNoId',
          value: '',
          scope: 'global',
          isSecret: true,
          secretId: undefined,
        },
      ]);

      const result = await service.getAsMap();
      expect(result.secretNoId).toBe('');
    });

    it('should return empty string when getSecretValue returns null', async () => {
      variableRepository.find.mockResolvedValue([
        {
          name: 'secretNull',
          value: '',
          scope: 'global',
          isSecret: true,
          secretId: 'sec-missing',
        },
      ]);
      mockSecretsService.getSecretValue.mockResolvedValue(null);

      const result = await service.getAsMap();
      expect(result.secretNull).toBe('');
    });

    it('should handle workflow secrets overriding global secrets', async () => {
      variableRepository.find
        .mockResolvedValueOnce([
          {
            name: 'apiKey',
            value: '',
            scope: 'global',
            isSecret: true,
            secretId: 'sec-global',
          },
        ])
        .mockResolvedValueOnce([
          {
            name: 'apiKey',
            value: '',
            scope: 'workflow',
            isSecret: true,
            secretId: 'sec-workflow',
          },
        ]);

      mockSecretsService.getSecretValue
        .mockResolvedValueOnce('global-secret')
        .mockResolvedValueOnce('workflow-secret');

      const result = await service.getAsMap('wf-1');
      expect(result.apiKey).toBe('workflow-secret');
    });

    it('should not query workflow variables when no workflowId provided', async () => {
      variableRepository.find.mockResolvedValue([
        { name: 'var1', value: 'val', scope: 'global', isSecret: false },
      ]);

      await service.getAsMap();

      // Only one call for global variables
      expect(variableRepository.find).toHaveBeenCalledTimes(1);
      expect(variableRepository.find).toHaveBeenCalledWith({
        where: { scope: 'global' },
      });
    });
  });

  describe('private generateId', () => {
    it('should generate IDs starting with var_', () => {
      const id = (service as any).generateId();
      expect(id).toMatch(/^var_\d+_[a-z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const id1 = (service as any).generateId();
      const id2 = (service as any).generateId();
      expect(id1).not.toBe(id2);
    });
  });
});
