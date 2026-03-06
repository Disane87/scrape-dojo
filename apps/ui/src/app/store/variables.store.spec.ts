vi.mock('@angular/common/http', () => ({
  HttpClient: class {},
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal, computed } from '@angular/core';
import { VariablesStore } from './variables.store';

describe('VariablesStore', () => {
  let store: VariablesStore;
  let mockHttp: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const mockVariables = [
    {
      id: 'v1',
      name: 'API_KEY',
      value: 'key1',
      scope: 'global',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'v2',
      name: 'BASE_URL',
      value: 'http://example.com',
      scope: 'global',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'v3',
      name: 'TIMEOUT',
      value: '5000',
      scope: 'workflow',
      workflowId: 'wf-1',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'v4',
      name: 'RETRY',
      value: '3',
      scope: 'workflow',
      workflowId: 'wf-1',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'v5',
      name: 'API_KEY',
      value: 'wf-key',
      scope: 'workflow',
      workflowId: 'wf-1',
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    store = Object.create(VariablesStore.prototype);

    // Set up base EntityStore signals
    const _entities = signal<any[]>(mockVariables);
    (store as any)._entities = _entities;
    (store as any)._loading = signal(false);
    (store as any)._error = signal<string | null>(null);
    (store as any).entities = _entities.asReadonly();
    (store as any).count = computed(() => _entities().length);
    (store as any).isEmpty = computed(() => _entities().length === 0);

    (store as any).workflowDefinitions = signal([
      {
        workflowId: 'wf-1',
        variables: [
          { name: 'TIMEOUT', label: 'Timeout', type: 'number' },
          { name: 'RETRY', label: 'Retry Count', type: 'number' },
        ],
      },
    ]);

    (store as any).global = computed(() =>
      _entities().filter((v: any) => v.scope === 'global'),
    );

    (store as any).config = {
      storeName: 'Variables',
      loadFn: vi.fn(),
      eventTypes: [],
    };

    (store as any).http = mockHttp;
  });

  describe('canHandleEvent', () => {
    it('should always return false', () => {
      const event = { type: 'scrape-start', timestamp: Date.now() } as any;
      expect(store.canHandleEvent(event)).toBe(false);
    });
  });

  describe('global computed', () => {
    it('should filter entities with scope=global', () => {
      const globalVars = (store as any).global();
      expect(globalVars).toHaveLength(2);
      expect(globalVars.every((v: any) => v.scope === 'global')).toBe(true);
    });
  });

  describe('getByWorkflow', () => {
    it('should filter entities by workflowId', () => {
      const result = store.getByWorkflow('wf-1');
      expect(result).toHaveLength(3);
      expect(result.every((v: any) => v.workflowId === 'wf-1')).toBe(true);
    });

    it('should return empty array for unknown workflow', () => {
      const result = store.getByWorkflow('wf-unknown');
      expect(result).toHaveLength(0);
    });
  });

  describe('getWorkflowDefinitions', () => {
    it('should return definitions for a workflow', () => {
      const result = store.getWorkflowDefinitions('wf-1');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('TIMEOUT');
    });

    it('should return empty array for unknown workflow', () => {
      const result = store.getWorkflowDefinitions('wf-unknown');
      expect(result).toHaveLength(0);
    });
  });

  describe('getByName', () => {
    it('should prioritize workflow variable over global', () => {
      const result = store.getByName('API_KEY', 'wf-1');
      expect(result).toBeDefined();
      expect(result!.id).toBe('v5');
      expect(result!.scope).toBe('workflow');
    });

    it('should fall back to global when no workflow match', () => {
      const result = store.getByName('BASE_URL', 'wf-1');
      expect(result).toBeDefined();
      expect(result!.id).toBe('v2');
      expect(result!.scope).toBe('global');
    });

    it('should return global variable when no workflowId', () => {
      const result = store.getByName('API_KEY');
      expect(result).toBeDefined();
      expect(result!.id).toBe('v1');
      expect(result!.scope).toBe('global');
    });

    it('should return undefined for unknown name', () => {
      const result = store.getByName('NONEXISTENT');
      expect(result).toBeUndefined();
    });
  });

  describe('CRUD operations', () => {
    it('create should call http.post', async () => {
      const returnVal = { id: 'v6', name: 'NEW', value: 'val' };
      mockHttp.post.mockReturnValue({
        subscribe: vi.fn(),
        pipe: vi.fn(),
        toPromise: vi.fn().mockResolvedValue(returnVal),
      });

      // Mock firstValueFrom behavior
      const { of } = await import('rxjs');
      mockHttp.post.mockReturnValue(of(returnVal));

      await store.create({ name: 'NEW', value: 'val', scope: 'global' });
      expect(mockHttp.post).toHaveBeenCalledWith('/api/variables', {
        name: 'NEW',
        value: 'val',
        scope: 'global',
      });
    });

    it('updateVariable should call http.put', async () => {
      const returnVal = { id: 'v1', name: 'API_KEY', value: 'updated' };
      const { of } = await import('rxjs');
      mockHttp.put.mockReturnValue(of(returnVal));

      await store.updateVariable('v1', { value: 'updated' });
      expect(mockHttp.put).toHaveBeenCalledWith('/api/variables/v1', {
        value: 'updated',
      });
    });

    it('deleteVariable should call http.delete', async () => {
      const { of } = await import('rxjs');
      mockHttp.delete.mockReturnValue(of(undefined));

      await store.deleteVariable('v1');
      expect(mockHttp.delete).toHaveBeenCalledWith('/api/variables/v1');
    });
  });
});
