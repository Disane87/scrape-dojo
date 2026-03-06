import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecretsService } from './secrets.service';
import { DatabaseService } from '../database/database.service';

// Valid 256-bit hex key for testing
const VALID_ENCRYPTION_KEY = 'a'.repeat(64);
const INVALID_ENCRYPTION_KEY = 'not-a-valid-hex-key';

describe('SecretsService', () => {
  let service: SecretsService;
  let databaseService: {
    getAllSecrets: ReturnType<typeof vi.fn>;
    getSecretById: ReturnType<typeof vi.fn>;
    getSecretByName: ReturnType<typeof vi.fn>;
    createSecret: ReturnType<typeof vi.fn>;
    updateSecret: ReturnType<typeof vi.fn>;
    deleteSecret: ReturnType<typeof vi.fn>;
    dataSource: {
      getRepository: ReturnType<typeof vi.fn>;
    };
  };
  let configService: {
    get: ReturnType<typeof vi.fn>;
  };

  const mockSecretEntity = {
    id: 'secret-1',
    name: 'my-secret',
    description: 'Test description',
    encryptedValue: '',
    createdAt: 1000,
    updatedAt: 2000,
  };

  function createMocks(encryptionKey: string | null = VALID_ENCRYPTION_KEY) {
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([]),
    };

    databaseService = {
      getAllSecrets: vi.fn(),
      getSecretById: vi.fn(),
      getSecretByName: vi.fn(),
      createSecret: vi.fn(),
      updateSecret: vi.fn(),
      deleteSecret: vi.fn(),
      dataSource: {
        getRepository: vi.fn().mockReturnValue({
          createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
        }),
      },
    };

    configService = {
      get: vi.fn().mockReturnValue(encryptionKey),
    };

    return { mockQueryBuilder };
  }

  async function createService(
    encryptionKey: string | null = VALID_ENCRYPTION_KEY,
  ) {
    createMocks(encryptionKey);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecretsService,
        { provide: DatabaseService, useValue: databaseService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<SecretsService>(SecretsService);

    // Initialize encryption (calls onModuleInit internally)
    if (encryptionKey && /^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
      await service.onModuleInit();
    }

    return service;
  }

  beforeEach(async () => {
    await createService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit / initializeEncryption', () => {
    it('should initialize encryption with valid key', async () => {
      const svc = await createService(VALID_ENCRYPTION_KEY);
      expect(svc).toBeDefined();
      // Service should work - verify by creating a secret (encrypt won't throw)
    });

    it('should throw if SCRAPE_DOJO_ENCRYPTION_KEY is not set', async () => {
      createMocks(null);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SecretsService,
          { provide: DatabaseService, useValue: databaseService },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const svc = module.get<SecretsService>(SecretsService);

      await expect(svc.onModuleInit()).rejects.toThrow(
        'SCRAPE_DOJO_ENCRYPTION_KEY environment variable is required',
      );
    });

    it('should throw if encryption key has invalid format', async () => {
      createMocks(INVALID_ENCRYPTION_KEY);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SecretsService,
          { provide: DatabaseService, useValue: databaseService },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      const svc = module.get<SecretsService>(SecretsService);

      await expect(svc.onModuleInit()).rejects.toThrow(
        'Invalid SCRAPE_DOJO_ENCRYPTION_KEY format',
      );
    });
  });

  describe('listSecrets', () => {
    it('should return secrets without values', async () => {
      databaseService.getAllSecrets.mockResolvedValue([mockSecretEntity]);

      const result = await service.listSecrets();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('secret-1');
      expect(result[0].name).toBe('my-secret');
      expect(result[0].maskedValue).toBe('********');
      expect(result[0]).not.toHaveProperty('value');
    });

    it('should return empty array when no secrets exist', async () => {
      databaseService.getAllSecrets.mockResolvedValue([]);

      const result = await service.listSecrets();

      expect(result).toEqual([]);
    });

    it('should include linked workflows from variable entities', async () => {
      databaseService.getAllSecrets.mockResolvedValue([mockSecretEntity]);

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([
          { v_secretId: 'secret-1', v_workflowId: 'wf-1' },
          { v_secretId: 'secret-1', v_workflowId: 'wf-2' },
        ]),
      };
      databaseService.dataSource.getRepository.mockReturnValue({
        createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
      });

      const result = await service.listSecrets();

      expect(result[0].linkedWorkflows).toEqual(['wf-1', 'wf-2']);
    });

    it('should mark secrets with short encrypted values as empty', async () => {
      const emptySecret = { ...mockSecretEntity, encryptedValue: 'short' };
      databaseService.getAllSecrets.mockResolvedValue([emptySecret]);

      const result = await service.listSecrets();

      expect(result[0].isEmpty).toBe(true);
    });
  });

  describe('getSecret', () => {
    it('should return a secret by id without value', async () => {
      databaseService.getSecretById.mockResolvedValue(mockSecretEntity);

      const result = await service.getSecret('secret-1');

      expect(result).toBeDefined();
      expect(result!.id).toBe('secret-1');
      expect(result!.maskedValue).toBe('********');
    });

    it('should return null if secret not found', async () => {
      databaseService.getSecretById.mockResolvedValue(null);

      const result = await service.getSecret('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getSecretValue (encrypt/decrypt round-trip)', () => {
    it('should create and retrieve a secret value', async () => {
      const plainValue = 'super-secret-password';

      // Mock createSecret to capture the encrypted value
      let capturedEncryptedValue = '';
      databaseService.getSecretByName.mockResolvedValue(null); // no duplicate
      databaseService.createSecret.mockImplementation(
        async (
          id: string,
          name: string,
          encryptedValue: string,
          description?: string,
        ) => {
          capturedEncryptedValue = encryptedValue;
          return {
            id,
            name,
            description,
            encryptedValue,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        },
      );

      await service.createSecret('test', plainValue, 'desc');

      // Now mock getSecretById to return the entity with the captured encrypted value
      databaseService.getSecretById.mockResolvedValue({
        id: 'test-id',
        name: 'test',
        encryptedValue: capturedEncryptedValue,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const retrieved = await service.getSecretValue('test-id');

      expect(retrieved).toBe(plainValue);
    });

    it('should return null if secret not found by id or name', async () => {
      databaseService.getSecretById.mockResolvedValue(null);
      databaseService.getSecretByName.mockResolvedValue(null);

      const result = await service.getSecretValue('nonexistent');

      expect(result).toBeNull();
    });

    it('should try by name if not found by id', async () => {
      const plainValue = 'my-value';

      // Create a real encrypted value first
      databaseService.getSecretByName.mockResolvedValueOnce(null); // for createSecret dup check
      let capturedEncrypted = '';
      databaseService.createSecret.mockImplementation(
        async (id: string, name: string, encryptedValue: string) => {
          capturedEncrypted = encryptedValue;
          return { id, name, encryptedValue, createdAt: 1, updatedAt: 1 };
        },
      );
      await service.createSecret('mySecretName', plainValue);

      // getSecretValue: not found by ID, found by name
      databaseService.getSecretById.mockResolvedValue(null);
      databaseService.getSecretByName.mockResolvedValue({
        id: 'some-id',
        name: 'mySecretName',
        encryptedValue: capturedEncrypted,
        createdAt: 1,
        updatedAt: 1,
      });

      const result = await service.getSecretValue('mySecretName');

      expect(result).toBe(plainValue);
    });

    it('should return null if decryption fails', async () => {
      databaseService.getSecretById.mockResolvedValue({
        id: 'bad-id',
        name: 'bad-secret',
        encryptedValue: 'invalid:encrypted:data',
        createdAt: 1,
        updatedAt: 1,
      });

      const result = await service.getSecretValue('bad-id');

      expect(result).toBeNull();
    });
  });

  describe('createSecret', () => {
    it('should create a secret and return list item', async () => {
      databaseService.getSecretByName.mockResolvedValue(null);
      databaseService.createSecret.mockImplementation(
        async (
          id: string,
          name: string,
          encryptedValue: string,
          description?: string,
        ) => ({
          id,
          name,
          description,
          encryptedValue,
          createdAt: 1000,
          updatedAt: 1000,
        }),
      );

      const result = await service.createSecret(
        'api-key',
        'abcdefgh',
        'My API key',
      );

      expect(result.name).toBe('api-key');
      expect(result.description).toBe('My API key');
      expect(result.maskedValue).toBeDefined();
      expect(result.maskedValue).not.toBe('abcdefgh');
      expect(databaseService.createSecret).toHaveBeenCalledWith(
        expect.any(String),
        'api-key',
        expect.any(String), // encrypted value
        'My API key',
      );
    });

    it('should throw if duplicate name exists', async () => {
      databaseService.getSecretByName.mockResolvedValue(mockSecretEntity);

      await expect(service.createSecret('my-secret', 'value')).rejects.toThrow(
        'Secret with name "my-secret" already exists',
      );
    });

    it('should mask short values', async () => {
      databaseService.getSecretByName.mockResolvedValue(null);
      databaseService.createSecret.mockImplementation(
        async (id: string, name: string, encryptedValue: string) => ({
          id,
          name,
          encryptedValue,
          createdAt: 1,
          updatedAt: 1,
        }),
      );

      const result = await service.createSecret('short', 'ab');

      expect(result.maskedValue).toBe('****');
    });

    it('should mask longer values with first and last 2 chars', async () => {
      databaseService.getSecretByName.mockResolvedValue(null);
      databaseService.createSecret.mockImplementation(
        async (id: string, name: string, encryptedValue: string) => ({
          id,
          name,
          encryptedValue,
          createdAt: 1,
          updatedAt: 1,
        }),
      );

      const result = await service.createSecret('long', 'abcdefghij');

      // 'ab' + 6 asterisks (min(6, 8)) + 'ij'
      expect(result.maskedValue).toBe('ab******ij');
    });
  });

  describe('updateSecret', () => {
    it('should update name, value, and description', async () => {
      databaseService.getSecretById.mockResolvedValue(mockSecretEntity);
      databaseService.getSecretByName.mockResolvedValue(null);
      databaseService.updateSecret.mockResolvedValue({
        ...mockSecretEntity,
        name: 'new-name',
        description: 'new desc',
        updatedAt: 3000,
      });

      const result = await service.updateSecret('secret-1', {
        name: 'new-name',
        value: 'new-value',
        description: 'new desc',
      });

      expect(result).toBeDefined();
      expect(result!.name).toBe('new-name');
      expect(databaseService.updateSecret).toHaveBeenCalledWith('secret-1', {
        name: 'new-name',
        encryptedValue: expect.any(String),
        description: 'new desc',
      });
    });

    it('should return null if secret not found', async () => {
      databaseService.getSecretById.mockResolvedValue(null);

      const result = await service.updateSecret('nonexistent', { name: 'x' });

      expect(result).toBeNull();
    });

    it('should throw if renaming to duplicate name', async () => {
      databaseService.getSecretById.mockResolvedValue(mockSecretEntity);
      databaseService.getSecretByName.mockResolvedValue({
        ...mockSecretEntity,
        id: 'other-secret',
        name: 'taken-name',
      });

      await expect(
        service.updateSecret('secret-1', { name: 'taken-name' }),
      ).rejects.toThrow('Secret with name "taken-name" already exists');
    });

    it('should not check duplicate if name unchanged', async () => {
      databaseService.getSecretById.mockResolvedValue(mockSecretEntity);
      databaseService.updateSecret.mockResolvedValue({
        ...mockSecretEntity,
        description: 'updated',
      });

      const result = await service.updateSecret('secret-1', {
        name: 'my-secret', // same as existing
        description: 'updated',
      });

      expect(result).toBeDefined();
      expect(databaseService.getSecretByName).not.toHaveBeenCalled();
    });

    it('should return null if database update returns null', async () => {
      databaseService.getSecretById.mockResolvedValue(mockSecretEntity);
      databaseService.updateSecret.mockResolvedValue(null);

      const result = await service.updateSecret('secret-1', {
        description: 'updated',
      });

      expect(result).toBeNull();
    });

    it('should show masked value as ******** when value not updated', async () => {
      databaseService.getSecretById.mockResolvedValue(mockSecretEntity);
      databaseService.updateSecret.mockResolvedValue(mockSecretEntity);

      const result = await service.updateSecret('secret-1', {
        description: 'only desc changed',
      });

      expect(result!.maskedValue).toBe('********');
    });
  });

  describe('deleteSecret', () => {
    it('should return true when deletion succeeds', async () => {
      databaseService.deleteSecret.mockResolvedValue(true);

      const result = await service.deleteSecret('secret-1');

      expect(result).toBe(true);
      expect(databaseService.deleteSecret).toHaveBeenCalledWith('secret-1');
    });

    it('should return false when secret not found', async () => {
      databaseService.deleteSecret.mockResolvedValue(false);

      const result = await service.deleteSecret('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getSecretByName', () => {
    it('should return a secret by name', async () => {
      databaseService.getSecretByName.mockResolvedValue(mockSecretEntity);

      const result = await service.getSecretByName('my-secret');

      expect(result).toBeDefined();
      expect(result!.name).toBe('my-secret');
      expect(result!.maskedValue).toBe('********');
    });

    it('should return null if not found', async () => {
      databaseService.getSecretByName.mockResolvedValue(null);

      const result = await service.getSecretByName('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('linkToWorkflow', () => {
    it('should succeed when secret exists', async () => {
      databaseService.getSecretById.mockResolvedValue(mockSecretEntity);

      await expect(
        service.linkToWorkflow('secret-1', 'workflow-1'),
      ).resolves.toBeUndefined();
    });

    it('should throw if secret not found', async () => {
      databaseService.getSecretById.mockResolvedValue(null);

      await expect(
        service.linkToWorkflow('nonexistent', 'workflow-1'),
      ).rejects.toThrow('Secret nonexistent not found');
    });
  });

  describe('unlinkFromWorkflow', () => {
    it('should complete without error', async () => {
      await expect(
        service.unlinkFromWorkflow('secret-1', 'workflow-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('resolveVariables', () => {
    it('should resolve missing variables from secret refs', async () => {
      // Create a real encrypted value
      databaseService.getSecretByName.mockResolvedValueOnce(null); // dup check
      let capturedEncrypted = '';
      databaseService.createSecret.mockImplementation(
        async (id: string, name: string, encryptedValue: string) => {
          capturedEncrypted = encryptedValue;
          return { id, name, encryptedValue, createdAt: 1, updatedAt: 1 };
        },
      );
      await service.createSecret('dbPassword', 'p@ssw0rd');

      // Mock for getSecretValue lookup
      databaseService.getSecretById.mockResolvedValue({
        id: 'pw-id',
        name: 'dbPassword',
        encryptedValue: capturedEncrypted,
        createdAt: 1,
        updatedAt: 1,
      });

      const result = await service.resolveVariables({ host: 'localhost' }, [
        { name: 'host' },
        { name: 'password', secretRef: 'pw-id' },
      ]);

      expect(result.host).toBe('localhost');
      expect(result.password).toBe('p@ssw0rd');
    });

    it('should not override existing variables even if secretRef is present', async () => {
      const result = await service.resolveVariables(
        { password: 'already-set' },
        [{ name: 'password', secretRef: 'some-secret' }],
      );

      expect(result.password).toBe('already-set');
    });

    it('should skip if secret value is null', async () => {
      databaseService.getSecretById.mockResolvedValue(null);
      databaseService.getSecretByName.mockResolvedValue(null);

      const result = await service.resolveVariables({}, [
        { name: 'missing', secretRef: 'nonexistent-secret' },
      ]);

      expect(result).not.toHaveProperty('missing');
    });

    it('should handle empty variable definitions', async () => {
      const result = await service.resolveVariables({ foo: 'bar' }, []);

      expect(result).toEqual({ foo: 'bar' });
    });
  });
});
