import { vi } from 'vitest';
import { ScrapeValidationService } from './scrape-validation.service';
import { BadRequestException } from '@nestjs/common';

describe('ScrapeValidationService', () => {
  let service: ScrapeValidationService;
  let mockDatabaseService: any;

  beforeEach(() => {
    mockDatabaseService = {
      getAllSecrets: vi.fn().mockResolvedValue([]),
    };
    service = new ScrapeValidationService(mockDatabaseService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateScrape', () => {
    it('should throw when scrape is disabled', async () => {
      const scrape = {
        id: 'test',
        metadata: { disabled: true, triggers: [{ type: 'manual' }] },
      } as any;
      await expect(service.validateScrape(scrape, 'manual')).rejects.toThrow(
        'disabled',
      );
    });

    it('should throw when no triggers configured', async () => {
      const scrape = { id: 'test', metadata: { triggers: [] } } as any;
      await expect(service.validateScrape(scrape, 'manual')).rejects.toThrow(
        'no triggers',
      );
    });

    it('should throw when trigger type not allowed', async () => {
      const scrape = {
        id: 'test',
        metadata: { triggers: [{ type: 'cron' }] },
      } as any;
      await expect(service.validateScrape(scrape, 'manual')).rejects.toThrow(
        'not configured',
      );
    });

    it('should map "scheduled" trigger to "cron"', async () => {
      mockDatabaseService.getAllSecrets.mockResolvedValue([]);
      const scrape = {
        id: 'test',
        metadata: { triggers: [{ type: 'cron' }] },
      } as any;
      await expect(
        service.validateScrape(scrape, 'scheduled'),
      ).resolves.not.toThrow();
    });

    it('should pass when trigger type matches', async () => {
      mockDatabaseService.getAllSecrets.mockResolvedValue([]);
      const scrape = {
        id: 'test',
        metadata: { triggers: [{ type: 'manual' }] },
      } as any;
      await expect(
        service.validateScrape(scrape, 'manual'),
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException when required secrets are missing', async () => {
      const scrape = {
        id: 'test',
        metadata: {
          triggers: [{ type: 'manual' }],
          variables: [{ name: 'user', required: true, secretRef: 'my-secret' }],
        },
      } as any;
      mockDatabaseService.getAllSecrets.mockResolvedValue([]);

      await expect(service.validateScrape(scrape, 'manual')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should pass when required secrets exist', async () => {
      const scrape = {
        id: 'test',
        metadata: {
          triggers: [{ type: 'manual' }],
          variables: [{ name: 'user', required: true, secretRef: 'my-secret' }],
        },
      } as any;
      mockDatabaseService.getAllSecrets.mockResolvedValue([
        { name: 'my-secret' },
      ]);

      await expect(
        service.validateScrape(scrape, 'manual'),
      ).resolves.not.toThrow();
    });
  });
});
