import { vi } from 'vitest';
import { ScrapeLogger } from './scrape-logger.service';
import { SecretRedactionService } from './secret-redaction.service';

describe('ScrapeLogger', () => {
  let logger: ScrapeLogger;
  let mockEventsService: any;

  beforeEach(async () => {
    mockEventsService = {
      emit: vi.fn(),
    } as any;

    logger = new ScrapeLogger();
    logger.setContext('TestContext');
  });

  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should log messages without throwing errors', () => {
    expect(() => logger.log('Test message')).not.toThrow();
  });

  it('should set context', () => {
    logger.setContext('NewContext');
    expect(logger).toBeDefined();
  });

  it('should set event context and emit events', () => {
    const scrapeId = 'test-scrape';
    const runId = 'test-run';

    logger.setEventContext(mockEventsService, scrapeId, runId);
    logger.log('Test message with events');

    expect(mockEventsService.emit).toHaveBeenCalledWith({
      type: 'log',
      scrapeId,
      runId,
      message: 'Test message with events',
      logLevel: 'log',
      logContext: 'TestContext',
    });
  });

  it('should not emit events if no event service is set', () => {
    logger.log('Test message without events');

    // Kein Service gesetzt, also sollte emit nicht aufgerufen werden
    expect(mockEventsService.emit).not.toHaveBeenCalled();
  });

  it('should support all log levels', () => {
    logger.setEventContext(mockEventsService, 'test-scrape', 'test-run');

    logger.log('log message');
    logger.error('error message');
    logger.warn('warn message');
    logger.debug('debug message');
    logger.verbose('verbose message');

    expect(mockEventsService.emit).toHaveBeenCalledTimes(5);
    expect(mockEventsService.emit).toHaveBeenCalledWith(
      expect.objectContaining({ logLevel: 'log' }),
    );
    expect(mockEventsService.emit).toHaveBeenCalledWith(
      expect.objectContaining({ logLevel: 'error' }),
    );
    expect(mockEventsService.emit).toHaveBeenCalledWith(
      expect.objectContaining({ logLevel: 'warn' }),
    );
    expect(mockEventsService.emit).toHaveBeenCalledWith(
      expect.objectContaining({ logLevel: 'debug' }),
    );
    expect(mockEventsService.emit).toHaveBeenCalledWith(
      expect.objectContaining({ logLevel: 'verbose' }),
    );
  });

  describe('with SecretRedactionService', () => {
    let redactionService: SecretRedactionService;

    beforeEach(() => {
      redactionService = new SecretRedactionService();
      redactionService.registerSecret('my-secret-password');
      logger = new ScrapeLogger(redactionService);
      logger.setContext('TestContext');
    });

    it('should redact secrets in log messages', () => {
      logger.setEventContext(mockEventsService, 'test-scrape', 'test-run');
      logger.log('Typing password: my-secret-password');

      expect(mockEventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Typing password: ***',
        }),
      );
    });

    it('should redact secrets in SSE events', () => {
      logger.setEventContext(mockEventsService, 'test-scrape', 'test-run');
      logger.error('Login failed with my-secret-password');

      expect(mockEventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login failed with ***',
        }),
      );
    });
  });
});
