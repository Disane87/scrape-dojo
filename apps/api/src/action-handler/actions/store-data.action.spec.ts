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

    it('stores a dotted key as a nested object', async () => {
      // Regression: templates resolve {{storedData.a.b}} as a PATH, so a flat
      // key "a.b" is invisible to them. The DB loader builds nested objects
      // (convertJobDataToNestedObject) — the runtime store has to match,
      // otherwise a value written during a run cannot be read back in it.
      action.params = { key: 'amazon.downloadedInvoices', value: 'a,b' } as any;
      (action as any).storedData = {};

      await action.run();

      expect((action as any).storedData.amazon.downloadedInvoices).toBe('a,b');
    });

    it('keeps the flat key as well, for configs that rely on it', async () => {
      action.params = { key: 'amazon.lastOrderId', value: '306-1' } as any;
      (action as any).storedData = {};

      await action.run();

      expect((action as any).storedData['amazon.lastOrderId']).toBe('306-1');
    });

    it('handles deeply nested keys', async () => {
      action.params = { key: 'a.b.c.d', value: 'tief' } as any;
      (action as any).storedData = {};

      await action.run();

      expect((action as any).storedData.a.b.c.d).toBe('tief');
    });

    it('merges into an existing branch instead of replacing it', async () => {
      action.params = { key: 'amazon.lastOrderId', value: '306-2' } as any;
      (action as any).storedData = { amazon: { downloadedInvoices: 'a,b' } };

      await action.run();

      expect((action as any).storedData.amazon).toEqual({
        downloadedInvoices: 'a,b',
        lastOrderId: '306-2',
      });
    });

    it('replaces a non-object value that blocks the path', async () => {
      // "amazon" was stored as a plain string earlier — without this the
      // nested write would throw or silently do nothing.
      action.params = { key: 'amazon.foo', value: 'bar' } as any;
      (action as any).storedData = { amazon: 'irgendwas' };

      await action.run();

      expect((action as any).storedData.amazon.foo).toBe('bar');
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
