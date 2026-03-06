import { vi } from 'vitest';
import { HttpCacheInterceptor } from './cache.interceptor';
import { of } from 'rxjs';

describe('HttpCacheInterceptor', () => {
  let interceptor: HttpCacheInterceptor;

  beforeEach(() => {
    interceptor = new HttpCacheInterceptor();
  });

  function createContext(
    method: string,
    path: string,
    headers: Record<string, string> = {},
  ) {
    const response = {
      headersSent: false,
      setHeader: vi.fn(),
      status: vi.fn(),
    };
    const request = { method, path, headers };
    return {
      context: {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response,
        }),
      } as any,
      response,
      request,
    };
  }

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should skip caching for non-GET requests', () => {
    const { context } = createContext('POST', '/api/scrapes');
    const next = { handle: () => of({ data: 'test' }) };

    interceptor.intercept(context, next).subscribe();
    // No setHeader calls expected for POST
  });

  it('should skip caching for SSE /events endpoints', () => {
    const { context, response } = createContext('GET', '/api/events');
    const next = { handle: () => of({ data: 'test' }) };

    interceptor.intercept(context, next).subscribe();
    expect(response.setHeader).not.toHaveBeenCalled();
  });

  it('should set ETag and Cache-Control for GET requests', () => {
    const { context, response } = createContext('GET', '/api/scrapes');
    const next = { handle: () => of({ data: 'test' }) };

    interceptor.intercept(context, next).subscribe();
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      expect.any(String),
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'ETag',
      expect.stringMatching(/^"[a-f0-9]+"$/),
    );
  });

  it('should set no-cache for log endpoints', () => {
    const { context, response } = createContext('GET', '/api/logs');
    const next = { handle: () => of([]) };

    interceptor.intercept(context, next).subscribe();
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-cache, no-store, must-revalidate',
    );
  });

  it('should set shorter cache for runs endpoint', () => {
    const { context, response } = createContext('GET', '/api/runs');
    const next = { handle: () => of([]) };

    interceptor.intercept(context, next).subscribe();
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      expect.stringContaining('max-age=5'),
    );
  });

  it('should set longer cache for scrape definition endpoint', () => {
    const { context, response } = createContext(
      'GET',
      '/api/scrapes/test-scrape',
    );
    const next = { handle: () => of({}) };

    interceptor.intercept(context, next).subscribe();
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      expect.stringContaining('max-age=60'),
    );
  });

  it('should respond with 304 when ETag matches If-None-Match', () => {
    const { context, response } = createContext('GET', '/api/scrapes', {});
    const testData = { data: 'consistent' };
    const next = { handle: () => of(testData) };

    // First request to get the ETag
    interceptor.intercept(context, next).subscribe();
    const etag = response.setHeader.mock.calls.find(
      (c: any) => c[0] === 'ETag',
    )?.[1];

    // Second request with matching If-None-Match
    const { context: context2, response: response2 } = createContext(
      'GET',
      '/api/scrapes',
      { 'if-none-match': etag },
    );
    const next2 = { handle: () => of(testData) };

    interceptor.intercept(context2, next2).subscribe();
    expect(response2.status).toHaveBeenCalledWith(304);
  });

  it('should not set headers if response already sent', () => {
    const { context, response } = createContext('GET', '/api/scrapes');
    response.headersSent = true;
    const next = { handle: () => of({ data: 'test' }) };

    interceptor.intercept(context, next).subscribe();
    expect(response.setHeader).not.toHaveBeenCalled();
  });
});
