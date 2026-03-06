vi.mock('@angular/common/http', () => ({
  HttpClient: class {},
}));

vi.mock('../services/scrape.service', () => ({
  ScrapeService: class {},
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal, computed } from '@angular/core';
import { ScrapesStore } from './scrapes.store';
import { ScrapeEvent } from '@scrape-dojo/shared';

describe('ScrapesStore', () => {
  let store: ScrapesStore;
  let mockLoadFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLoadFn = vi.fn().mockResolvedValue([]);

    store = Object.create(ScrapesStore.prototype);

    // Set up base EntityStore signals
    const _entities = signal<any[]>([
      { id: 'scrape-1', stepsCount: 3, lastRun: undefined },
      { id: 'scrape-2', stepsCount: 5, lastRun: undefined },
    ]);
    (store as any)._entities = _entities;
    (store as any)._loading = signal(false);
    (store as any)._error = signal<string | null>(null);
    (store as any).entities = _entities.asReadonly();
    (store as any).count = computed(() => _entities().length);
    (store as any).isEmpty = computed(() => _entities().length === 0);

    (store as any).config = {
      storeName: 'Scrapes',
      loadFn: mockLoadFn,
      eventTypes: [
        'scrape-start',
        'scrape-end',
        'scrape-complete',
        'config-reload',
      ],
    };

    (store as any).logger = { log: vi.fn() };
    (store as any).scrapeService = {
      getScrapes: vi.fn(),
    };
  });

  describe('canHandleEvent', () => {
    it('should return true for scrape-start event', () => {
      const event = {
        type: 'scrape-start',
        timestamp: Date.now(),
      } as ScrapeEvent;
      expect(store.canHandleEvent(event)).toBe(true);
    });

    it('should return false for step-start event', () => {
      const event = {
        type: 'step-start',
        timestamp: Date.now(),
      } as ScrapeEvent;
      expect(store.canHandleEvent(event)).toBe(false);
    });
  });

  describe('handleEvent', () => {
    it('should set status to running on scrape-start', () => {
      const event = {
        type: 'scrape-start',
        scrapeId: 'scrape-1',
        timestamp: Date.now(),
      } as ScrapeEvent;

      store.handleEvent(event);

      const entity = (store as any)
        ._entities()
        .find((e: any) => e.id === 'scrape-1');
      expect(entity.lastRun.status).toBe('running');
    });

    it('should set status to completed on scrape-end without error', () => {
      const event = {
        type: 'scrape-end',
        scrapeId: 'scrape-1',
        timestamp: Date.now(),
      } as ScrapeEvent;

      store.handleEvent(event);

      const entity = (store as any)
        ._entities()
        .find((e: any) => e.id === 'scrape-1');
      expect(entity.lastRun.status).toBe('completed');
    });

    it('should set status to failed on scrape-end with error', () => {
      const event = {
        type: 'scrape-end',
        scrapeId: 'scrape-1',
        timestamp: Date.now(),
        error: 'Something went wrong',
      } as ScrapeEvent;

      store.handleEvent(event);

      const entity = (store as any)
        ._entities()
        .find((e: any) => e.id === 'scrape-1');
      expect(entity.lastRun.status).toBe('failed');
    });

    it('should call load on config-reload', () => {
      const loadSpy = vi.fn();
      (store as any).load = loadSpy;

      const event = {
        type: 'config-reload',
        timestamp: Date.now(),
      } as ScrapeEvent;

      store.handleEvent(event);

      expect(loadSpy).toHaveBeenCalled();
    });
  });

  describe('updateLastRunFromHistory', () => {
    it('should update the entity lastRun field', () => {
      const lastRun = {
        status: 'completed' as const,
        startTime: 1000,
        endTime: 2000,
      };

      store.updateLastRunFromHistory('scrape-1', lastRun);

      const entity = (store as any)
        ._entities()
        .find((e: any) => e.id === 'scrape-1');
      expect(entity.lastRun).toEqual(lastRun);
    });
  });
});
