
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {

  private readonly logger = new Logger(`CatchEverythingFilter`);
  constructor(private readonly httpAdapterHost: HttpAdapterHost) { }

  catch(exception: HttpException, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      statusCode: httpStatus,
      exception: exception.toString(),
      stack: exception.stack,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    if (!(exception.message === 'BreakLoop')) {
      this.logger.error(`⚠️ Exception: ${exception.toString()} - ${responseBody.statusCode} `);

      httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    }
  }
}
