import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { randomUUID } from 'crypto';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  private readonly logger = new Logger(`CatchEverythingFilter`);
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const response: any = ctx.getResponse();
    const request: any = ctx.getRequest();

    // If the controller already sent/ended a response (e.g. res.redirect, SSE), do not attempt to write again.
    if (
      response?.headersSent ||
      response?.writableEnded ||
      response?.finished
    ) {
      const errorId = randomUUID();
      const method = request?.method
        ? String(request.method)
        : 'UNKNOWN_METHOD';
      const url = request?.originalUrl || request?.url || 'UNKNOWN_URL';
      this.logger.error(
        `⚠️ Exception after response sent (${errorId}) [${method} ${url}]: ${String(exception)}`,
      );
      const stack = (exception as any)?.stack;
      if (stack) {
        this.logger.error(`Stack trace:\n${stack}`);
      }
      return;
    }

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProd = process.env.NODE_ENV === 'production';
    const errorId = randomUUID();

    const message =
      exception instanceof HttpException
        ? ((exception.getResponse() as any)?.message ?? exception.message)
        : 'Internal server error';

    const responseBody: any = {
      statusCode: httpStatus,
      message,
      errorId,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    if (!isProd) {
      responseBody.exception = String(exception);
      responseBody.stack = (exception as any)?.stack;
    }

    if (!((exception as any)?.message === 'BreakLoop')) {
      // 401 errors are expected auth failures - log as warning without stack trace
      if (httpStatus === HttpStatus.UNAUTHORIZED) {
        this.logger.warn(
          `🔒 Unauthorized: ${String((exception as any)?.message ?? message)} - ${responseBody.path}`,
        );
      } else {
        this.logger.error(
          `⚠️ Exception (${errorId}): ${String(exception)} - ${responseBody.statusCode}`,
        );
        const stack = (exception as any)?.stack;
        if (stack) {
          this.logger.error(`Stack trace:\n${stack}`);
        }
      }

      try {
        const res: any = ctx.getResponse();
        if (res?.headersSent || res?.writableEnded || res?.finished) {
          return;
        }
        httpAdapter.reply(res, responseBody, httpStatus);
      } catch (replyError) {
        const replyErrorId = randomUUID();
        this.logger.error(
          `⚠️ Failed to send error response (${replyErrorId}): ${String(replyError)}`,
        );
      }
    }
  }
}
