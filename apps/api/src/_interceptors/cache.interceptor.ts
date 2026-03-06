import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { createHash } from 'crypto';

/**
 * HTTP Caching Interceptor
 *
 * Setzt Cache-Control und ETag Header für GET-Requests.
 * Der Browser/Client handhabt 304 Not Modified automatisch basierend auf den Headers.
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Nur GET-Requests cachen
    if (request.method !== 'GET') {
      return next.handle();
    }

    // SSE-Endpoints nicht cachen
    if (request.path.includes('/events')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((data) => {
        // Nur wenn Response noch nicht gesendet wurde
        if (response.headersSent) {
          return;
        }

        // ETag generieren basierend auf dem Response-Body
        const etag = this.generateETag(data);

        // Cache-Control basierend auf dem Endpoint setzen
        const cacheControl = this.getCacheControl(request.path);

        response.setHeader('Cache-Control', cacheControl);
        response.setHeader('ETag', etag);

        // Support 304 responses
        const ifNoneMatch = request.headers['if-none-match'];
        if (typeof ifNoneMatch === 'string' && ifNoneMatch === etag) {
          response.status(304);
          // End wird automatisch von NestJS gehandhabt
          // response.end() führt zu "Cannot set headers after they are sent"
        }
      }),
    );
  }

  /**
   * Generiert einen ETag-Hash aus den Daten
   */
  private generateETag(data: unknown): string {
    const content = JSON.stringify(data);
    const hash = createHash('md5').update(content).digest('hex');
    return `"${hash}"`;
  }

  /**
   * Bestimmt Cache-Control basierend auf dem Endpoint
   */
  private getCacheControl(path: string): string {
    // Scrape-Definitionen können länger gecached werden (ändern sich selten)
    if (path.match(/\/api\/scrapes\/[^/]+$/)) {
      return 'private, max-age=60, stale-while-revalidate=300';
    }

    // Scrapes-Liste
    if (path === '/api/scrapes') {
      return 'private, max-age=30, stale-while-revalidate=120';
    }

    // Runs können sich häufiger ändern
    if (path.includes('/api/runs')) {
      return 'private, max-age=5, stale-while-revalidate=30';
    }

    // Logs nicht cachen (dynamisch)
    if (path.includes('/api/logs')) {
      return 'no-cache, no-store, must-revalidate';
    }

    // Default: Kurzes Caching
    return 'private, max-age=10, stale-while-revalidate=60';
  }
}
