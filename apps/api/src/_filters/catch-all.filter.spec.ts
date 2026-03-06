import { vi } from 'vitest';
import { CatchEverythingFilter } from './catch-all.filter';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';

describe('CatchEverythingFilter', () => {
  let filter: CatchEverythingFilter;
  let mockHttpAdapter: any;
  let mockHost: any;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(() => {
    mockResponse = {
      headersSent: false,
      writableEnded: false,
      finished: false,
    };
    mockRequest = {
      method: 'GET',
      originalUrl: '/api/test',
      url: '/api/test',
    };
    mockHttpAdapter = {
      getRequestUrl: vi.fn().mockReturnValue('/api/test'),
      reply: vi.fn(),
    };
    mockHost = {
      switchToHttp: vi.fn().mockReturnValue({
        getResponse: vi.fn().mockReturnValue(mockResponse),
        getRequest: vi.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ArgumentsHost;

    filter = new CatchEverythingFilter({ httpAdapter: mockHttpAdapter } as any);
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle HttpException and reply with correct status', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    filter.catch(exception, mockHost);
    expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Not Found',
      }),
      HttpStatus.NOT_FOUND,
    );
  });

  it('should handle unknown errors as 500', () => {
    const exception = new Error('Something broke');
    filter.catch(exception, mockHost);
    expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('should not reply if response already sent (headersSent)', () => {
    mockResponse.headersSent = true;
    filter.catch(new Error('test'), mockHost);
    expect(mockHttpAdapter.reply).not.toHaveBeenCalled();
  });

  it('should not reply if response already ended (writableEnded)', () => {
    mockResponse.writableEnded = true;
    filter.catch(new Error('test'), mockHost);
    expect(mockHttpAdapter.reply).not.toHaveBeenCalled();
  });

  it('should not reply for BreakLoop exceptions', () => {
    const exception = new Error('BreakLoop');
    filter.catch(exception, mockHost);
    expect(mockHttpAdapter.reply).not.toHaveBeenCalled();
  });

  it('should include stack and exception in non-production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const exception = new Error('Dev error');
    filter.catch(exception, mockHost);

    expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      expect.objectContaining({
        exception: expect.stringContaining('Dev error'),
        stack: expect.any(String),
      }),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should not include stack in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    filter.catch(new Error('Prod error'), mockHost);

    const replyBody = mockHttpAdapter.reply.mock.calls[0][1];
    expect(replyBody.stack).toBeUndefined();
    expect(replyBody.exception).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle 401 as warning-level (no throw)', () => {
    const exception = new HttpException(
      'Unauthorized',
      HttpStatus.UNAUTHORIZED,
    );
    expect(() => filter.catch(exception, mockHost)).not.toThrow();
    expect(mockHttpAdapter.reply).toHaveBeenCalled();
  });
});
