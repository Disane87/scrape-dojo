import { vi } from 'vitest';
import { EventLogger } from './event-logger';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { promises as fsPromises } from 'fs';

// Mock the entire fs module
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(''),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([]),
  statSync: vi.fn().mockReturnValue({ mtime: new Date() }),
  unlinkSync: vi.fn(),
  promises: {
    appendFile: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 100 }),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockedExistsSync = vi.mocked(existsSync);
const mockedMkdirSync = vi.mocked(mkdirSync);
const mockedReadFileSync = vi.mocked(readFileSync);
const mockedWriteFileSync = vi.mocked(writeFileSync);
const mockedAppendFile = vi.mocked(fsPromises.appendFile);
const mockedStat = vi.mocked(fsPromises.stat);
const mockedReadFile = vi.mocked(fsPromises.readFile);
const mockedFsWriteFile = vi.mocked(fsPromises.writeFile);

describe('EventLogger', () => {
  let logger: EventLogger;
  let mockEventsService: any;

  beforeEach(() => {
    // Reset static state between tests
    (EventLogger as any).eventsService = null;
    (EventLogger as any).logFilePath = undefined;
    (EventLogger as any).initialized = false;
    if ((EventLogger as any).trimTimer) {
      clearTimeout((EventLogger as any).trimTimer);
      (EventLogger as any).trimTimer = null;
    }

    mockEventsService = {
      emitLog: vi.fn(),
    };

    logger = new EventLogger();
    logger.setContext('TestContext');

    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if ((EventLogger as any).trimTimer) {
      clearTimeout((EventLogger as any).trimTimer);
      (EventLogger as any).trimTimer = null;
    }
  });

  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  // ============ Static methods ============

  describe('setEventsService', () => {
    it('should set the static events service', () => {
      EventLogger.setEventsService(mockEventsService);

      expect((EventLogger as any).eventsService).toBe(mockEventsService);
    });

    it('should initialize log rotation on first call', () => {
      expect((EventLogger as any).initialized).toBe(false);

      EventLogger.setEventsService(mockEventsService);

      expect((EventLogger as any).initialized).toBe(true);
    });

    it('should not reinitialize on subsequent calls', () => {
      EventLogger.setEventsService(mockEventsService);
      const firstPath = EventLogger.getCurrentLogFilePath();

      const anotherService = { emitLog: vi.fn() } as any;
      EventLogger.setEventsService(anotherService);

      expect(EventLogger.getCurrentLogFilePath()).toBe(firstPath);
    });

    it('should create logs directory if it does not exist', () => {
      mockedExistsSync.mockReturnValue(false);

      EventLogger.setEventsService(mockEventsService);

      expect(mockedMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        { recursive: true },
      );
    });

    it('should not create logs directory if it already exists', () => {
      mockedExistsSync.mockReturnValue(true);

      EventLogger.setEventsService(mockEventsService);

      expect(mockedMkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentLogFilePath', () => {
    it('should return null when not initialized', () => {
      expect(EventLogger.getCurrentLogFilePath()).toBeNull();
    });

    it('should return a path after initialization', () => {
      EventLogger.setEventsService(mockEventsService);

      const logPath = EventLogger.getCurrentLogFilePath();

      expect(logPath).not.toBeNull();
      expect(logPath).toContain('server-');
      expect(logPath).toContain('.log');
    });
  });

  describe('getLogsDir', () => {
    it('should return the logs directory path', () => {
      const dir = EventLogger.getLogsDir();

      expect(dir).toContain('logs');
    });
  });

  describe('readLogs', () => {
    it('should return empty array when log file does not exist', () => {
      mockedExistsSync.mockReturnValue(false);

      const logs = EventLogger.readLogs();

      expect(logs).toEqual([]);
    });

    it('should parse JSON log lines from file', () => {
      EventLogger.setEventsService(mockEventsService);
      mockedExistsSync.mockReturnValue(true);

      const logLines = [
        JSON.stringify({
          timestamp: '2025-01-01T00:00:00.000Z',
          level: 'log',
          context: 'App',
          message: 'hello',
        }),
        JSON.stringify({
          timestamp: '2025-01-01T00:00:01.000Z',
          level: 'error',
          context: 'App',
          message: 'oops',
        }),
      ].join('\n');
      mockedReadFileSync.mockReturnValue(logLines);

      const logs = EventLogger.readLogs();

      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('hello');
      expect(logs[1].level).toBe('error');
    });

    it('should skip malformed JSON lines', () => {
      EventLogger.setEventsService(mockEventsService);
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(
        'not-json\n{"timestamp":"t","level":"log","context":"c","message":"m"}',
      );

      const logs = EventLogger.readLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('m');
    });

    it('should respect the limit parameter', () => {
      EventLogger.setEventsService(mockEventsService);
      mockedExistsSync.mockReturnValue(true);

      const lines = Array.from({ length: 10 }, (_, i) =>
        JSON.stringify({
          timestamp: 't',
          level: 'log',
          context: 'c',
          message: `msg${i}`,
        }),
      ).join('\n');
      mockedReadFileSync.mockReturnValue(lines);

      const logs = EventLogger.readLogs(3);

      expect(logs).toHaveLength(3);
      // Should return the last 3 (most recent)
      expect(logs[0].message).toBe('msg7');
    });

    it('should initialize log rotation if not yet initialized', () => {
      // Reset initialized state
      (EventLogger as any).initialized = false;
      (EventLogger as any).logFilePath = undefined;
      mockedExistsSync.mockReturnValue(false);

      const logs = EventLogger.readLogs();

      // After readLogs, it should have initialized
      expect((EventLogger as any).initialized).toBe(true);
      expect(logs).toEqual([]);
    });

    it('should return empty array when readFileSync throws', () => {
      EventLogger.setEventsService(mockEventsService);
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockImplementation(() => {
        throw new Error('read error');
      });

      const logs = EventLogger.readLogs();

      expect(logs).toEqual([]);
    });
  });

  describe('clearLogs', () => {
    it('should write empty string to log file when it exists', () => {
      EventLogger.setEventsService(mockEventsService);
      mockedExistsSync.mockReturnValue(true);

      EventLogger.clearLogs();

      expect(mockedWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('server-'),
        '',
        'utf-8',
      );
    });

    it('should not throw if log file does not exist', () => {
      mockedExistsSync.mockReturnValue(false);

      expect(() => EventLogger.clearLogs()).not.toThrow();
    });

    it('should not throw when logFilePath is not set', () => {
      (EventLogger as any).logFilePath = undefined;

      expect(() => EventLogger.clearLogs()).not.toThrow();
    });

    it('should silently handle writeFileSync errors', () => {
      EventLogger.setEventsService(mockEventsService);
      mockedExistsSync.mockReturnValue(true);
      mockedWriteFileSync.mockImplementation(() => {
        throw new Error('write error');
      });

      expect(() => EventLogger.clearLogs()).not.toThrow();
    });
  });

  // ============ File logging ============

  describe('writeToFile (tested via logging methods)', () => {
    it('should write to log file when logFilePath is set', () => {
      EventLogger.setEventsService(mockEventsService);

      logger.log('file-write-test');

      expect(mockedAppendFile).toHaveBeenCalled();
      const appendCall = mockedAppendFile.mock.calls[0];
      expect(appendCall[0]).toContain('server-');
      const logLine = appendCall[1] as string;
      const parsed = JSON.parse(logLine.trim());
      expect(parsed.level).toBe('log');
      expect(parsed.message).toBe('file-write-test');
    });

    it('should not write when logFilePath is not set', () => {
      (EventLogger as any).logFilePath = undefined;

      logger.log('no-file');

      expect(mockedAppendFile).not.toHaveBeenCalled();
    });

    it('should include timestamp, level, context, and message in log entry', () => {
      EventLogger.setEventsService(mockEventsService);

      logger.log('structured-log', 'MyCtx');

      const logLine = (mockedAppendFile.mock.calls[0][1] as string).trim();
      const parsed = JSON.parse(logLine);
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed.level).toBe('log');
      expect(parsed.context).toBe('MyCtx');
      expect(parsed.message).toBe('structured-log');
    });
  });

  describe('trimIfNeeded (tested via scheduleTrimIfNeeded)', () => {
    it('should schedule trim after writing to file', () => {
      EventLogger.setEventsService(mockEventsService);

      logger.log('trigger-trim');

      // trimTimer should be set
      expect((EventLogger as any).trimTimer).not.toBeNull();
    });

    it('should not schedule multiple trims concurrently', () => {
      EventLogger.setEventsService(mockEventsService);

      logger.log('first');
      const firstTimer = (EventLogger as any).trimTimer;

      logger.log('second');
      const secondTimer = (EventLogger as any).trimTimer;

      // Timer should be the same (no re-scheduling)
      expect(firstTimer).toBe(secondTimer);
    });
  });

  // ============ Instance logging methods ============

  describe('log', () => {
    it('should not throw when called', () => {
      expect(() => logger.log('test message')).not.toThrow();
    });

    it('should emit log event to events service when set', () => {
      EventLogger.setEventsService(mockEventsService);

      logger.log('hello', 'MyContext');

      expect(mockEventsService.emitLog).toHaveBeenCalledWith(
        'log',
        'hello',
        'MyContext',
      );
    });

    it('should not emit when no events service is set', () => {
      logger.log('hello');

      expect(mockEventsService.emitLog).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should emit error level event', () => {
      EventLogger.setEventsService(mockEventsService);

      logger.error('bad thing', undefined, 'ErrContext');

      expect(mockEventsService.emitLog).toHaveBeenCalledWith(
        'error',
        'bad thing',
        'ErrContext',
      );
    });

    it('should use stack as context fallback when no context provided', () => {
      EventLogger.setEventsService(mockEventsService);

      logger.error('fail', 'stack-trace');

      expect(mockEventsService.emitLog).toHaveBeenCalledWith(
        'error',
        'fail',
        'stack-trace',
      );
    });
  });

  describe('warn', () => {
    it('should emit warn level event', () => {
      EventLogger.setEventsService(mockEventsService);

      logger.warn('warning', 'WarnCtx');

      expect(mockEventsService.emitLog).toHaveBeenCalledWith(
        'warn',
        'warning',
        'WarnCtx',
      );
    });
  });

  describe('debug', () => {
    it('should emit debug level event', () => {
      EventLogger.setEventsService(mockEventsService);

      logger.debug('debug info', 'DbgCtx');

      expect(mockEventsService.emitLog).toHaveBeenCalledWith(
        'debug',
        'debug info',
        'DbgCtx',
      );
    });
  });

  describe('verbose', () => {
    it('should emit verbose level event', () => {
      EventLogger.setEventsService(mockEventsService);

      logger.verbose('verbose info', 'VrbCtx');

      expect(mockEventsService.emitLog).toHaveBeenCalledWith(
        'verbose',
        'verbose info',
        'VrbCtx',
      );
    });
  });

  describe('emitLogEvent (private, tested via public methods)', () => {
    it('should use instance context when no context argument provided', () => {
      EventLogger.setEventsService(mockEventsService);
      logger.setContext('MyService');

      logger.log('test');

      expect(mockEventsService.emitLog).toHaveBeenCalledWith(
        'log',
        'test',
        'MyService',
      );
    });

    it('should fall back to App context when nothing is set', () => {
      EventLogger.setEventsService(mockEventsService);
      const freshLogger = new EventLogger();

      freshLogger.log('test');

      // ConsoleLogger default context or 'App'
      expect(mockEventsService.emitLog).toHaveBeenCalledWith(
        'log',
        'test',
        expect.any(String),
      );
    });

    it('should write to log file when logFilePath is set', () => {
      EventLogger.setEventsService(mockEventsService);

      logger.log('file-write-test');

      expect(mockedAppendFile).toHaveBeenCalled();
    });

    it('should stringify non-string messages', () => {
      EventLogger.setEventsService(mockEventsService);

      logger.log(42 as any);

      expect(mockEventsService.emitLog).toHaveBeenCalledWith(
        'log',
        '42',
        expect.any(String),
      );
    });
  });

  describe('writeToFile - error handling', () => {
    it('should not throw when appendFile rejects', () => {
      EventLogger.setEventsService(mockEventsService);
      mockedAppendFile.mockRejectedValueOnce(new Error('disk full'));

      // Should not throw
      expect(() => logger.log('test')).not.toThrow();
    });
  });

  describe('trimIfNeeded', () => {
    it('should trim file when it exceeds max bytes and lines', async () => {
      vi.useFakeTimers();
      EventLogger.setEventsService(mockEventsService);

      // Simulate a large file
      mockedStat.mockResolvedValue({ size: 10_000_000 } as any);
      const manyLines = Array.from(
        { length: 2000 },
        (_, i) => `line-${i}`,
      ).join('\n');
      mockedReadFile.mockResolvedValue(manyLines);

      // Trigger trimIfNeeded by advancing timer
      logger.log('trigger-trim');

      // Advance the debounce timer
      await vi.advanceTimersByTimeAsync(1500);

      expect(mockedFsWriteFile).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should not trim when file is under max bytes', async () => {
      vi.useFakeTimers();
      EventLogger.setEventsService(mockEventsService);
      mockedStat.mockResolvedValue({ size: 100 } as any);

      logger.log('trigger-trim');
      await vi.advanceTimersByTimeAsync(1500);

      expect(mockedFsWriteFile).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should handle missing logFilePath in trimIfNeeded', async () => {
      // Set initialized but no logFilePath
      (EventLogger as any).initialized = true;
      (EventLogger as any).logFilePath = undefined;

      // Directly call private static method
      await (EventLogger as any).trimIfNeeded();
      // Should not throw or call stat
    });

    it('should handle stat returning null', async () => {
      vi.useFakeTimers();
      EventLogger.setEventsService(mockEventsService);
      mockedStat.mockResolvedValue(null as any);

      logger.log('trigger');
      await vi.advanceTimersByTimeAsync(1500);

      // Should not throw or write
      expect(mockedFsWriteFile).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
