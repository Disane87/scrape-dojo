import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal, computed } from '@angular/core';
import { EntityStore, Entity, EntityStoreConfig } from './entity-store.base';
import { ScrapeEvent } from '@scrape-dojo/shared';

interface TestEntity extends Entity {
  id: string;
  name: string;
  value: number;
}

class TestStore extends EntityStore<TestEntity> {
  constructor(config: EntityStoreConfig<TestEntity>) {
    super(config);
  }
}

describe('EntityStore', () => {
  let store: TestStore;
  let mockLoadFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLoadFn = vi.fn();

    store = Object.create(TestStore.prototype);

    const _entities = signal<TestEntity[]>([]);
    (store as any)._entities = _entities;
    (store as any)._loading = signal(false);
    (store as any)._error = signal<string | null>(null);
    (store as any).entities = _entities.asReadonly();
    (store as any).loading = (store as any)._loading.asReadonly();
    (store as any).error = (store as any)._error.asReadonly();
    (store as any).count = computed(() => _entities().length);
    (store as any).isEmpty = computed(() => _entities().length === 0);

    (store as any).config = {
      storeName: 'Test',
      loadFn: mockLoadFn,
      eventTypes: ['test-event'],
    };
  });

  it('should initialize empty', () => {
    expect(store.entities()).toEqual([]);
    expect(store.count()).toBe(0);
    expect(store.isEmpty()).toBe(true);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  describe('load', () => {
    it('should load entities from loadFn', async () => {
      const items: TestEntity[] = [
        { id: '1', name: 'A', value: 10 },
        { id: '2', name: 'B', value: 20 },
      ];
      mockLoadFn.mockResolvedValue(items);

      await store.load();

      expect(store.entities()).toEqual(items);
      expect(store.count()).toBe(2);
      expect(store.isEmpty()).toBe(false);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it('should handle load error', async () => {
      mockLoadFn.mockRejectedValue(new Error('Network error'));

      await store.load();

      expect(store.entities()).toEqual([]);
      expect(store.error()).toBe('Network error');
      expect(store.loading()).toBe(false);
    });
  });

  describe('add', () => {
    it('should add entity to the beginning', () => {
      store.add({ id: '1', name: 'First', value: 1 });
      store.add({ id: '2', name: 'Second', value: 2 });

      expect(store.entities()).toHaveLength(2);
      expect(store.entities()[0].id).toBe('2');
    });
  });

  describe('update', () => {
    it('should update entity by id', () => {
      store.add({ id: '1', name: 'Original', value: 10 });
      store.update('1', { name: 'Updated' });

      expect(store.entities()[0].name).toBe('Updated');
      expect(store.entities()[0].value).toBe(10);
    });
  });

  describe('updateWith', () => {
    it('should update entity with custom updater', () => {
      store.add({ id: '1', name: 'Test', value: 10 });
      store.updateWith('1', (entity) => ({
        ...entity,
        value: entity.value * 2,
      }));

      expect(store.entities()[0].value).toBe(20);
    });
  });

  describe('remove', () => {
    it('should remove entity by id', () => {
      store.add({ id: '1', name: 'A', value: 1 });
      store.add({ id: '2', name: 'B', value: 2 });

      store.remove('1');

      expect(store.entities()).toHaveLength(1);
      expect(store.entities()[0].id).toBe('2');
    });
  });

  describe('clear', () => {
    it('should remove all entities', () => {
      store.add({ id: '1', name: 'A', value: 1 });
      store.add({ id: '2', name: 'B', value: 2 });

      store.clear();

      expect(store.entities()).toHaveLength(0);
      expect(store.isEmpty()).toBe(true);
    });
  });

  describe('getById', () => {
    it('should return a signal with the matching entity', () => {
      store.add({ id: '1', name: 'A', value: 1 });
      store.add({ id: '2', name: 'B', value: 2 });

      const result = store.getById('1');
      expect(result()).toBeDefined();
      expect(result()!.name).toBe('A');
    });

    it('should return undefined for non-existent id', () => {
      const result = store.getById('nonexistent');
      expect(result()).toBeUndefined();
    });
  });

  describe('filter', () => {
    it('should return a signal with filtered entities', () => {
      store.add({ id: '1', name: 'A', value: 5 });
      store.add({ id: '2', name: 'B', value: 15 });
      store.add({ id: '3', name: 'C', value: 25 });

      const result = store.filter((e) => e.value > 10);
      expect(result()).toHaveLength(2);
    });
  });

  describe('canHandleEvent', () => {
    it('should return true for configured event types', () => {
      const event = {
        type: 'test-event',
        timestamp: Date.now(),
      } as ScrapeEvent;
      expect(store.canHandleEvent(event)).toBe(true);
    });

    it('should return false for non-configured event types', () => {
      const event = {
        type: 'other-event',
        timestamp: Date.now(),
      } as ScrapeEvent;
      expect(store.canHandleEvent(event)).toBe(false);
    });
  });
});
