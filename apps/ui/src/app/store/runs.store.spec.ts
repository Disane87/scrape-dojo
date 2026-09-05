vi.mock('@angular/common/http', () => ({
  HttpClient: class {},
}));

vi.mock('../services/scrape.service', () => ({
  ScrapeService: class {},
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal, computed } from '@angular/core';
import { RunsStore } from './runs.store';
import { ScrapeEvent } from '@scrape-dojo/shared';

describe('RunsStore', () => {
  let store: RunsStore;
  let loadRunData: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = Object.create(RunsStore.prototype);

    const _entities = signal<any[]>([
      { id: 'run-1', scrapeId: 'scrape-1', status: 'running', steps: [] },
    ]);
    (store as any)._entities = _entities;
    (store as any)._loading = signal(false);
    (store as any)._error = signal<string | null>(null);
    (store as any).entities = _entities.asReadonly();
    (store as any).count = computed(() => _entities().length);
    (store as any).isEmpty = computed(() => _entities().length === 0);

    (store as any).config = {
      storeName: 'Runs',
      loadFn: vi.fn(),
      eventTypes: [],
    };
    (store as any).logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    (store as any).scrapesStore = {
      getById: () => () => undefined,
      update: vi.fn(),
    };

    // updateWith aus der Basisklasse nachbilden — der Test zielt auf
    // handleScrapeEnd, nicht auf den EntityStore.
    (store as any).updateWith = (id: string, fn: (r: any) => any) => {
      _entities.update((list) => list.map((e) => (e.id === id ? fn(e) : e)));
    };

    loadRunData = vi.fn();
    (store as any).loadRunData = loadRunData;
  });

  function scrapeEnd(overrides: Partial<ScrapeEvent> = {}): ScrapeEvent {
    return {
      type: 'scrape-end',
      runId: 'run-1',
      scrapeId: 'scrape-1',
      timestamp: Date.now(),
      ...overrides,
    } as ScrapeEvent;
  }

  describe('handleScrapeEnd', () => {
    it('marks a run without error as success', () => {
      store.handleEvent(scrapeEnd());

      expect((store as any)._entities()[0].status).toBe('success');
    });

    it('marks a run with error as failed', () => {
      store.handleEvent(scrapeEnd({ error: 'boom' } as Partial<ScrapeEvent>));

      const run = (store as any)._entities()[0];
      expect(run.status).toBe('failed');
      expect(run.error).toBe('boom');
    });

    it('loads debug data and artifacts after a successful run', () => {
      store.handleEvent(scrapeEnd());

      expect(loadRunData).toHaveBeenCalledWith('run-1', 'scrape-1');
    });

    it('also loads debug data and artifacts after a FAILED run', () => {
      // Regression: previously guarded by `status === 'success'`, so a failed
      // run never got the data one actually needs to debug it.
      store.handleEvent(scrapeEnd({ error: 'boom' } as Partial<ScrapeEvent>));

      expect(loadRunData).toHaveBeenCalledWith('run-1', 'scrape-1');
    });

    it('does not load run data when the event carries no scrapeId', () => {
      store.handleEvent(scrapeEnd({ scrapeId: undefined }));

      expect(loadRunData).not.toHaveBeenCalled();
    });

    it('ignores events without a runId', () => {
      store.handleEvent(scrapeEnd({ runId: undefined }));

      expect(loadRunData).not.toHaveBeenCalled();
      expect((store as any)._entities()[0].status).toBe('running');
    });
  });
});
