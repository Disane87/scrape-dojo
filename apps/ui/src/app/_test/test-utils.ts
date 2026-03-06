import { vi } from 'vitest';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { signal } from '@angular/core';

/**
 * Creates a mock Transloco testing module with minimal translations
 */
export function createMockTranslocoModule(
  translations: Record<string, any> = {},
) {
  return TranslocoTestingModule.forRoot({
    langs: { en: translations },
    translocoConfig: {
      availableLangs: ['en'],
      defaultLang: 'en',
    },
  });
}

/**
 * Creates a mock Router for testing
 */
export function createMockRouter() {
  return {
    navigate: vi.fn().mockResolvedValue(true),
    navigateByUrl: vi.fn().mockResolvedValue(true),
    url: '/',
    events: {
      subscribe: vi.fn(),
      pipe: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
    },
    createUrlTree: vi.fn(),
    serializeUrl: vi.fn(),
  };
}

/**
 * Creates a mock ApiService
 */
export function createMockApiService() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
}

/**
 * Creates a mock StoreService with BehaviorSubject-like properties
 */
export function createMockStoreService() {
  return {
    scrapes: signal([]),
    runs: signal([]),
    selectedScrape: signal(null),
    selectedRun: signal(null),
    loading: signal(false),
    error: signal(null),
    loadScrapes: vi.fn(),
    loadRuns: vi.fn(),
    selectScrape: vi.fn(),
    selectRun: vi.fn(),
    reset: vi.fn(),
  };
}

/**
 * Creates a mock ActivatedRoute
 */
export function createMockActivatedRoute(
  params: Record<string, any> = {},
  queryParams: Record<string, any> = {},
) {
  return {
    params: { subscribe: vi.fn((fn: any) => fn(params)) },
    queryParams: { subscribe: vi.fn((fn: any) => fn(queryParams)) },
    snapshot: {
      params,
      queryParams,
      data: {},
      paramMap: {
        get: vi.fn((key: string) => params[key] || null),
        has: vi.fn((key: string) => key in params),
      },
    },
  };
}
