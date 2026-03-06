import { vi } from 'vitest';
import { StoreDataAction } from './store-data.action';
import { createActionInstance } from 'src/_test/test-utils';

describe('StoreDataAction', () => {
  let action: StoreDataAction;

  beforeEach(() => {
    action = createActionInstance(StoreDataAction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(StoreDataAction).toBeDefined();
  });

  describe('run', () => {
    it('should store value in runtime storedData', async () => {
      action.params = { key: 'testKey', value: 'testValue' } as any;
      (action as any).storedData = {};

      await action.run();

      expect((action as any).storedData.testKey).toBe('testValue');
    });

    it('should warn when databaseService is not available', async () => {
      action.params = { key: 'k', value: 'v' } as any;
      (action as any).data = { databaseService: null };

      await action.run();

      expect((action as any).logger.warn).toHaveBeenCalledWith(
        '⚠️ DatabaseService not available - skipping persistence',
      );
    });

    it('should warn when scrapeId is not available', async () => {
      const mockDb = { storeData: vi.fn() };
      action.params = { key: 'k', value: 'v' } as any;
      (action as any).data = { databaseService: mockDb, scrapeId: null };

      await action.run();

      expect((action as any).logger.warn).toHaveBeenCalledWith(
        '⚠️ ScrapeId not available - skipping persistence',
      );
    });

    it('should persist as run-level data by default', async () => {
      const mockDb = { storeData: vi.fn().mockResolvedValue(undefined) };
      action.params = { key: 'k', value: 'v' } as any;
      (action as any).data = {
        databaseService: mockDb,
        scrapeId: 'scrape-1',
        runId: 'run-1',
      };

      await action.run();

      expect(mockDb.storeData).toHaveBeenCalledWith(
        'scrape-1',
        'k',
        'v',
        'run-1',
      );
    });

    it('should persist as job-level data when persist=true', async () => {
      const mockDb = { storeData: vi.fn().mockResolvedValue(undefined) };
      action.params = { key: 'k', value: 'v', persist: true } as any;
      (action as any).data = {
        databaseService: mockDb,
        scrapeId: 'scrape-1',
        runId: 'run-1',
      };

      await action.run();

      expect(mockDb.storeData).toHaveBeenCalledWith(
        'scrape-1',
        'k',
        'v',
        undefined,
      );
    });

    it('should log error when persistence fails', async () => {
      const mockDb = {
        storeData: vi.fn().mockRejectedValue(new Error('DB error')),
      };
      action.params = { key: 'k', value: 'v' } as any;
      (action as any).data = {
        databaseService: mockDb,
        scrapeId: 'scrape-1',
        runId: 'run-1',
      };

      await action.run();

      expect((action as any).logger.error).toHaveBeenCalledWith(
        '❌ Failed to persist data: DB error',
      );
    });
  });
});
