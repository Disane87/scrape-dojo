import { vi } from 'vitest';
import { ScrapeVariablesSyncService } from './scrape-variables-sync.service';

describe('ScrapeVariablesSyncService', () => {
  let service: ScrapeVariablesSyncService;
  let mockVariablesService: any;
  let mockSecretsService: any;

  beforeEach(() => {
    mockVariablesService = {
      getByWorkflow: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    };
    mockSecretsService = {
      getSecretByName: vi.fn().mockResolvedValue(null),
      createSecret: vi
        .fn()
        .mockResolvedValue({ id: 'new-secret-id', name: 'test' }),
      listSecrets: vi.fn().mockResolvedValue([]),
    };
    service = new ScrapeVariablesSyncService(
      mockVariablesService,
      mockSecretsService,
    );
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncWorkflowVariables', () => {
    it('should skip scrapes without variables', async () => {
      const scrapes = [{ id: 's1', metadata: {} }] as any[];
      await service.syncWorkflowVariables(scrapes);
      expect(mockVariablesService.create).not.toHaveBeenCalled();
    });

    it('should create new variables', async () => {
      const scrapes = [
        {
          id: 's1',
          metadata: {
            variables: [
              { name: 'user', default: 'admin', description: 'Username' },
            ],
          },
        },
      ] as any[];
      mockVariablesService.getByWorkflow.mockResolvedValue([]);

      await service.syncWorkflowVariables(scrapes);

      expect(mockVariablesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'user',
          value: 'admin',
          scope: 'workflow',
          workflowId: 's1',
        }),
      );
    });

    it('should skip existing variables (case-insensitive)', async () => {
      const scrapes = [
        {
          id: 's1',
          metadata: { variables: [{ name: 'User' }] },
        },
      ] as any[];
      mockVariablesService.getByWorkflow.mockResolvedValue([{ name: 'user' }]);

      await service.syncWorkflowVariables(scrapes);

      expect(mockVariablesService.create).not.toHaveBeenCalled();
    });

    it('should deduplicate scrapes by ID', async () => {
      const scrapes = [
        { id: 's1', metadata: { variables: [{ name: 'v1' }] } },
        { id: 's1', metadata: { variables: [{ name: 'v1' }] } },
      ] as any[];

      await service.syncWorkflowVariables(scrapes);

      expect(mockVariablesService.getByWorkflow).toHaveBeenCalledTimes(1);
    });

    it('should handle creation errors gracefully', async () => {
      const scrapes = [
        {
          id: 's1',
          metadata: { variables: [{ name: 'broken' }] },
        },
      ] as any[];
      mockVariablesService.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.syncWorkflowVariables(scrapes),
      ).resolves.not.toThrow();
    });
  });

  describe('syncWorkflowSecrets', () => {
    it('should create placeholder secrets for secretRef variables', async () => {
      const scrapes = [
        {
          id: 's1',
          metadata: { variables: [{ name: 'pw', secretRef: 'my-password' }] },
        },
      ] as any[];

      await service.syncWorkflowSecrets(scrapes);

      expect(mockSecretsService.createSecret).toHaveBeenCalledWith(
        'my-password',
        '',
        expect.stringContaining('Auto-created'),
      );
    });

    it('should skip existing secrets', async () => {
      const scrapes = [
        {
          id: 's1',
          metadata: {
            variables: [{ name: 'pw', secretRef: 'existing-secret' }],
          },
        },
      ] as any[];
      mockSecretsService.getSecretByName.mockResolvedValue({
        id: '1',
        name: 'existing-secret',
      });

      await service.syncWorkflowSecrets(scrapes);

      expect(mockSecretsService.createSecret).not.toHaveBeenCalled();
    });

    it('should skip variables without secretRef', async () => {
      const scrapes = [
        {
          id: 's1',
          metadata: { variables: [{ name: 'noSecret' }] },
        },
      ] as any[];

      await service.syncWorkflowSecrets(scrapes);

      expect(mockSecretsService.getSecretByName).not.toHaveBeenCalled();
    });
  });
});
