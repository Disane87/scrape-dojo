import { Test, TestingModule } from '@nestjs/testing';
import { LoggingEventHandler } from './logging-event.handler';
import { EventBus } from '../event-bus';
import { SecretRedactionService } from '../../_logger/secret-redaction.service';

describe('LoggingEventHandler', () => {
  let handler: LoggingEventHandler;
  let eventBus: EventBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingEventHandler, EventBus, SecretRedactionService],
    }).compile();

    handler = module.get<LoggingEventHandler>(LoggingEventHandler);
    eventBus = module.get<EventBus>(EventBus);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should subscribe to all domain events on construction', () => {
    // Verify subscriptions were made by checking handler counts
    expect(eventBus.getHandlerCount('ScrapeStartedEvent')).toBe(1);
    expect(eventBus.getHandlerCount('ScrapeCompletedEvent')).toBe(1);
    expect(eventBus.getHandlerCount('ScrapeAbortedEvent')).toBe(1);
    expect(eventBus.getHandlerCount('StepStartedEvent')).toBe(1);
    expect(eventBus.getHandlerCount('StepCompletedEvent')).toBe(1);
    expect(eventBus.getHandlerCount('ActionStartedEvent')).toBe(1);
    expect(eventBus.getHandlerCount('ActionCompletedEvent')).toBe(1);
    expect(eventBus.getHandlerCount('ActionFailedEvent')).toBe(1);
  });

  it('should handle scrape started events without error', async () => {
    const event = {
      eventName: 'ScrapeStartedEvent',
      occurredOn: new Date(),
      aggregateId: '1',
      scrapeId: 'scrape-1',
      runId: 'run-1',
      variables: { key: 'val' },
    };
    await expect(eventBus.publish(event)).resolves.toBeUndefined();
  });

  it('should handle scrape completed events', async () => {
    const event = {
      eventName: 'ScrapeCompletedEvent',
      occurredOn: new Date(),
      aggregateId: '1',
      scrapeId: 'scrape-1',
      runId: 'run-1',
      success: true,
    };
    await expect(eventBus.publish(event)).resolves.toBeUndefined();
  });

  it('should handle scrape completed events with failure', async () => {
    const event = {
      eventName: 'ScrapeCompletedEvent',
      occurredOn: new Date(),
      aggregateId: '1',
      scrapeId: 'scrape-1',
      runId: 'run-1',
      success: false,
      error: 'Timeout reached',
    };
    await expect(eventBus.publish(event)).resolves.toBeUndefined();
  });

  it('should handle scrape aborted events', async () => {
    const event = {
      eventName: 'ScrapeAbortedEvent',
      occurredOn: new Date(),
      aggregateId: '1',
      scrapeId: 'scrape-1',
      runId: 'run-1',
      reason: 'User cancelled',
    };
    await expect(eventBus.publish(event)).resolves.toBeUndefined();
  });

  it('should handle step started events', async () => {
    const event = {
      eventName: 'StepStartedEvent',
      occurredOn: new Date(),
      aggregateId: '1',
      scrapeId: 'scrape-1',
      runId: 'run-1',
      stepName: 'Login Step',
      stepIndex: 0,
    };
    await expect(eventBus.publish(event)).resolves.toBeUndefined();
  });

  it('should handle step completed events', async () => {
    const event = {
      eventName: 'StepCompletedEvent',
      occurredOn: new Date(),
      aggregateId: '1',
      scrapeId: 'scrape-1',
      runId: 'run-1',
      stepName: 'Login Step',
      stepIndex: 0,
    };
    await expect(eventBus.publish(event)).resolves.toBeUndefined();
  });

  it('should handle action started events', async () => {
    const event = {
      eventName: 'ActionStartedEvent',
      occurredOn: new Date(),
      aggregateId: '1',
      scrapeId: 'scrape-1',
      runId: 'run-1',
      actionName: 'Navigate',
      actionType: 'navigate',
      actionIndex: 0,
    };
    await expect(eventBus.publish(event)).resolves.toBeUndefined();
  });

  it('should handle action completed events with result', async () => {
    const event = {
      eventName: 'ActionCompletedEvent',
      occurredOn: new Date(),
      aggregateId: '1',
      scrapeId: 'scrape-1',
      runId: 'run-1',
      actionName: 'Extract',
      actionType: 'extract',
      actionIndex: 0,
      result: { data: 'x'.repeat(200) },
    };
    await expect(eventBus.publish(event)).resolves.toBeUndefined();
  });

  it('should handle action completed events without result', async () => {
    const event = {
      eventName: 'ActionCompletedEvent',
      occurredOn: new Date(),
      aggregateId: '1',
      scrapeId: 'scrape-1',
      runId: 'run-1',
      actionName: 'Click',
      actionType: 'click',
      actionIndex: 1,
      result: undefined,
    };
    await expect(eventBus.publish(event)).resolves.toBeUndefined();
  });

  it('should handle action failed events', async () => {
    const event = {
      eventName: 'ActionFailedEvent',
      occurredOn: new Date(),
      aggregateId: '1',
      scrapeId: 'scrape-1',
      runId: 'run-1',
      actionName: 'Click',
      actionType: 'click',
      actionIndex: 0,
      error: 'Element not found',
    };
    await expect(eventBus.publish(event)).resolves.toBeUndefined();
  });

  it('should not throw when events have no handlers left after unsubscribing', async () => {
    // Clear all handlers
    eventBus.clearAll();

    const event = {
      eventName: 'ScrapeStartedEvent',
      occurredOn: new Date(),
      aggregateId: '1',
      scrapeId: 'scrape-1',
      runId: 'run-1',
      variables: {},
    };
    await expect(eventBus.publish(event)).resolves.toBeUndefined();
  });
});
