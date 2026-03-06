import { vi } from 'vitest';
import { ScrapeDataService } from './scrape-data.service';

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue('{}'),
  };
});

import * as fs from 'fs';
const mockedExistsSync = vi.mocked(fs.existsSync);
const mockedReadFileSync = vi.mocked(fs.readFileSync);

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

  describe('getStoredDataFromFile', () => {
    it('should return empty data when file does not exist', () => {
      mockedExistsSync.mockReturnValue(false);

      const result = service.getStoredDataFromFile();
      expect(result).toEqual({ storedData: {}, isFirstRun: true });
    });

    it('should read and parse file when it exists with data', () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(
        JSON.stringify({ amazon: { lastId: '123' } }),
      );

      const result = service.getStoredDataFromFile();
      expect(result.storedData).toEqual({ amazon: { lastId: '123' } });
      expect(result.isFirstRun).toBe(false);
    });

    it('should return isFirstRun=true when file contains empty object', () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue('{}');

      const result = service.getStoredDataFromFile();
      expect(result.storedData).toEqual({});
      expect(result.isFirstRun).toBe(true);
    });
  });

  describe('convertScrapeResultsToJson - empty', () => {
    it('should return empty object when no results set', () => {
      const json = service.convertScrapeResultsToJson();
      expect(json).toEqual({});
    });
  });

  describe('getStoredDataFromDB - nested keys', () => {
    it('should handle single-segment keys', async () => {
      mockDatabaseService.getJobData.mockResolvedValue([
        { key: 'simpleKey', value: 'val' },
      ]);
      const result = await service.getStoredDataFromDB('scrape-1');
      expect(result.storedData).toEqual({ simpleKey: 'val' });
      expect(result.isFirstRun).toBe(false);
    });

    it('should handle deeply nested keys', async () => {
      mockDatabaseService.getJobData.mockResolvedValue([
        { key: 'a.b.c.d', value: 'deep' },
      ]);
      const result = await service.getStoredDataFromDB('scrape-1');
      expect(result.storedData).toEqual({ a: { b: { c: { d: 'deep' } } } });
    });
  });
});
