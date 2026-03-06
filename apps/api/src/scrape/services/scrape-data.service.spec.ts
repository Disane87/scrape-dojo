import { vi } from 'vitest';
import { ScrapeDataService } from './scrape-data.service';

describe('ScrapeDataService', () => {
  let service: ScrapeDataService;
  let mockDatabaseService: any;

  beforeEach(() => {
    mockDatabaseService = {
      getJobData: vi.fn(),
    };
    service = new ScrapeDataService(mockDatabaseService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStoredDataFromDB', () => {
    it('should return empty storedData and isFirstRun=true when no data', async () => {
      mockDatabaseService.getJobData.mockResolvedValue([]);
      const result = await service.getStoredDataFromDB('scrape-1');
      expect(result).toEqual({ storedData: {}, isFirstRun: true });
    });

    it('should convert flat keys to nested object', async () => {
      mockDatabaseService.getJobData.mockResolvedValue([
        { key: 'amazon.lastOrderId', value: '123' },
        { key: 'amazon.total', value: '50' },
      ]);
      const result = await service.getStoredDataFromDB('scrape-1');
      expect(result.storedData).toEqual({
        amazon: { lastOrderId: '123', total: '50' },
      });
      expect(result.isFirstRun).toBe(false);
    });

    it('should handle DB errors gracefully', async () => {
      mockDatabaseService.getJobData.mockRejectedValue(new Error('DB down'));
      const result = await service.getStoredDataFromDB('scrape-1');
      expect(result).toEqual({ storedData: {}, isFirstRun: true });
    });
  });

  describe('setScrapeResult and convertScrapeResultsToJson', () => {
    it('should set and convert scrape results', () => {
      const actionMap = new Map([['extractTitle', 'My Title']]);
      const stepMap = new Map([['step1', actionMap]]);
      service.setScrapeResult('scrape-1', stepMap);

      const json = service.convertScrapeResultsToJson();
      expect(json['scrape-1']['step1']['extractTitle']).toBe('My Title');
    });
  });

  describe('clearScrapeResults', () => {
    it('should clear all results', () => {
      const actionMap = new Map([['a', 'b']]);
      const stepMap = new Map([['s', actionMap]]);
      service.setScrapeResult('s1', stepMap);
      service.clearScrapeResults();

      const json = service.convertScrapeResultsToJson();
      expect(Object.keys(json)).toHaveLength(0);
    });
  });
});
