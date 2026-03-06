import {
  ScrapeStartedEvent,
  ScrapeCompletedEvent,
  ScrapeAbortedEvent,
  StepStartedEvent,
  StepCompletedEvent,
  ActionStartedEvent,
  ActionCompletedEvent,
  ActionFailedEvent,
  LogEvent,
} from './domain-events';

describe('Domain Events', () => {
  describe('ScrapeStartedEvent', () => {
    it('should have correct eventName', () => {
      const event = new ScrapeStartedEvent('agg-1', 'scrape-1', 'run-1', {
        key: 'val',
      });
      expect(event.eventName).toBe('scrape.started');
      expect(event.aggregateId).toBe('agg-1');
      expect(event.scrapeId).toBe('scrape-1');
      expect(event.runId).toBe('run-1');
      expect(event.variables).toEqual({ key: 'val' });
      expect(event.occurredOn).toBeInstanceOf(Date);
    });
  });

  describe('ScrapeCompletedEvent', () => {
    it('should store success and optional error', () => {
      const event = new ScrapeCompletedEvent(
        'agg-1',
        'scrape-1',
        'run-1',
        true,
      );
      expect(event.eventName).toBe('scrape.completed');
      expect(event.success).toBe(true);
      expect(event.error).toBeUndefined();
    });

    it('should store error when provided', () => {
      const event = new ScrapeCompletedEvent(
        'agg-1',
        'scrape-1',
        'run-1',
        false,
        'failed',
      );
      expect(event.success).toBe(false);
      expect(event.error).toBe('failed');
    });
  });

  describe('ScrapeAbortedEvent', () => {
    it('should store reason', () => {
      const event = new ScrapeAbortedEvent(
        'agg-1',
        'scrape-1',
        'run-1',
        'user cancelled',
      );
      expect(event.eventName).toBe('scrape.aborted');
      expect(event.reason).toBe('user cancelled');
    });
  });

  describe('StepStartedEvent', () => {
    it('should store step info', () => {
      const event = new StepStartedEvent(
        'agg-1',
        'scrape-1',
        'run-1',
        'Login',
        0,
      );
      expect(event.eventName).toBe('step.started');
      expect(event.stepName).toBe('Login');
      expect(event.stepIndex).toBe(0);
    });
  });

  describe('StepCompletedEvent', () => {
    it('should store step info', () => {
      const event = new StepCompletedEvent(
        'agg-1',
        'scrape-1',
        'run-1',
        'Login',
        0,
      );
      expect(event.eventName).toBe('step.completed');
    });
  });

  describe('ActionStartedEvent', () => {
    it('should store action info', () => {
      const event = new ActionStartedEvent(
        'agg-1',
        'scrape-1',
        'run-1',
        'Navigate',
        'navigate',
        0,
      );
      expect(event.eventName).toBe('action.started');
      expect(event.actionName).toBe('Navigate');
      expect(event.actionType).toBe('navigate');
      expect(event.actionIndex).toBe(0);
    });
  });

  describe('ActionCompletedEvent', () => {
    it('should store result', () => {
      const event = new ActionCompletedEvent(
        'agg-1',
        'scrape-1',
        'run-1',
        'Extract',
        'extract',
        1,
        { data: 'test' },
      );
      expect(event.eventName).toBe('action.completed');
      expect(event.result).toEqual({ data: 'test' });
    });
  });

  describe('ActionFailedEvent', () => {
    it('should store error', () => {
      const event = new ActionFailedEvent(
        'agg-1',
        'scrape-1',
        'run-1',
        'Click',
        'click',
        2,
        'Element not found',
      );
      expect(event.eventName).toBe('action.failed');
      expect(event.error).toBe('Element not found');
    });
  });

  describe('LogEvent', () => {
    it('should store log details', () => {
      const event = new LogEvent(
        'agg-1',
        'scrape-1',
        'run-1',
        'error',
        'Something failed',
        'TestCtx',
      );
      expect(event.eventName).toBe('log');
      expect(event.level).toBe('error');
      expect(event.message).toBe('Something failed');
      expect(event.context).toBe('TestCtx');
    });
  });
});
