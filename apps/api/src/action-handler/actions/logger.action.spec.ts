import { vi } from 'vitest';
import { LoggerAction } from './logger.action';
import { createActionInstance } from 'src/_test/test-utils';

describe('LoggerAction', () => {
  let action: LoggerAction;

  beforeEach(() => {
    action = createActionInstance(LoggerAction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(LoggerAction).toBeDefined();
  });

  describe('run', () => {
    it('should log message with "log" level', async () => {
      action.params = { message: 'Test message', level: 'log' } as any;
      await action.run();
      expect((action as any).logger.log).toHaveBeenCalledWith('Test message');
    });

    it('should log message with "error" level', async () => {
      action.params = { message: 'Error occurred', level: 'error' } as any;
      await action.run();
      expect((action as any).logger.error).toHaveBeenCalledWith(
        'Error occurred',
      );
    });

    it('should log message with "warn" level', async () => {
      action.params = { message: 'Warning', level: 'warn' } as any;
      await action.run();
      expect((action as any).logger.warn).toHaveBeenCalledWith('Warning');
    });

    it('should log message with "debug" level', async () => {
      action.params = { message: 'Debug info', level: 'debug' } as any;
      await action.run();
      expect((action as any).logger.debug).toHaveBeenCalledWith('Debug info');
    });

    it('should log message with "verbose" level', async () => {
      action.params = { message: 'Verbose info', level: 'verbose' } as any;
      await action.run();
      expect((action as any).logger.verbose).toHaveBeenCalledWith(
        'Verbose info',
      );
    });

    it('should warn when log level is invalid', async () => {
      action.params = { message: 'Test', level: 'invalid' } as any;
      await action.run();
      expect((action as any).logger.warn).toHaveBeenCalledWith(
        'Invalid log level: invalid',
      );
    });
  });
});
