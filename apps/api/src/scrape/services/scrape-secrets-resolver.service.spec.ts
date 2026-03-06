import { vi } from 'vitest';
import { ScrapeSecretsResolverService } from './scrape-secrets-resolver.service';

describe('ScrapeSecretsResolverService', () => {
  let service: ScrapeSecretsResolverService;
  let mockSecretsService: any;

  beforeEach(() => {
    mockSecretsService = {
      getSecretByName: vi.fn(),
      getSecretValue: vi.fn(),
    };
    service = new ScrapeSecretsResolverService(mockSecretsService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveSecretsForWorkflow', () => {
    it('should skip when no variables defined', async () => {
      const scrape = { id: 'test', metadata: {} } as any;
      const previousData = new Map();
      await service.resolveSecretsForWorkflow(scrape, previousData);
      expect(mockSecretsService.getSecretByName).not.toHaveBeenCalled();
    });

    it('should skip when variable already has value', async () => {
      const scrape = {
        id: 'test',
        metadata: { variables: [{ name: 'user', secretRef: 'my-secret' }] },
      } as any;
      const previousData = new Map([['var_user', 'existing-value']]);

      await service.resolveSecretsForWorkflow(scrape, previousData);
      expect(mockSecretsService.getSecretByName).not.toHaveBeenCalled();
    });

    it('should resolve secret and set in previousData', async () => {
      const scrape = {
        id: 'test',
        metadata: {
          variables: [{ name: 'password', secretRef: 'my-password' }],
        },
      } as any;
      const previousData = new Map();

      mockSecretsService.getSecretByName.mockResolvedValue({
        id: 'secret-1',
        name: 'my-password',
      });
      mockSecretsService.getSecretValue.mockResolvedValue('super-secret-123');

      await service.resolveSecretsForWorkflow(scrape, previousData);
      expect(previousData.get('var_password')).toBe('super-secret-123');
    });

    it('should call getSecretValue with the secret id', async () => {
      const scrape = {
        id: 'test',
        metadata: {
          variables: [{ name: 'password', secretRef: 'my-password' }],
        },
      } as any;
      const previousData = new Map();

      mockSecretsService.getSecretByName.mockResolvedValue({
        id: 'secret-1',
        name: 'my-password',
      });
      mockSecretsService.getSecretValue.mockResolvedValue('super-secret-123');

      await service.resolveSecretsForWorkflow(scrape, previousData);
      expect(mockSecretsService.getSecretValue).toHaveBeenCalledWith(
        'secret-1',
      );
    });

    it('should warn when secret not found', async () => {
      const scrape = {
        id: 'test',
        metadata: { variables: [{ name: 'pw', secretRef: 'missing-secret' }] },
      } as any;
      const previousData = new Map();

      mockSecretsService.getSecretByName.mockResolvedValue(null);

      await service.resolveSecretsForWorkflow(scrape, previousData);
      expect(previousData.has('var_pw')).toBe(false);
    });

    it('should apply default value when no secret resolved', async () => {
      const scrape = {
        id: 'test',
        metadata: { variables: [{ name: 'env', default: 'production' }] },
      } as any;
      const previousData = new Map();

      await service.resolveSecretsForWorkflow(scrape, previousData);
      expect(previousData.get('var_env')).toBe('production');
    });

    it('should handle secret resolution errors gracefully', async () => {
      const scrape = {
        id: 'test',
        metadata: { variables: [{ name: 'pw', secretRef: 'broken' }] },
      } as any;
      const previousData = new Map();

      mockSecretsService.getSecretByName.mockRejectedValue(
        new Error('DB error'),
      );

      await service.resolveSecretsForWorkflow(scrape, previousData);
      expect(previousData.has('var_pw')).toBe(false);
    });
  });
});
