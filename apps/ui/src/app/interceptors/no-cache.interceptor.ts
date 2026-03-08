import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Prevents browser caching of API GET requests.
 * Without this, the browser may serve stale data after
 * create/update/delete operations.
 */
export const noCacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method === 'GET' && req.url.startsWith('/api/')) {
    const noCacheReq = req.clone({
      setHeaders: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    return next(noCacheReq);
  }
  return next(req);
};
