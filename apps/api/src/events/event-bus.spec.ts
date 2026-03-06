import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from './event-bus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventBus],
    }).compile();

    eventBus = module.get<EventBus>(EventBus);
  });

  it('should be defined', () => {
    expect(eventBus).toBeDefined();
  });

  describe('subscribe', () => {
    it('should register a handler', () => {
      const handler = vi.fn();
      eventBus.subscribe('test.event', handler);
      expect(eventBus.getHandlerCount('test.event')).toBe(1);
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.subscribe('test.event', handler);

      expect(eventBus.getHandlerCount('test.event')).toBe(1);
      unsubscribe();
      expect(eventBus.getHandlerCount('test.event')).toBe(0);
    });

    it('should allow multiple handlers for same event', () => {
      eventBus.subscribe('test.event', vi.fn());
      eventBus.subscribe('test.event', vi.fn());
      expect(eventBus.getHandlerCount('test.event')).toBe(2);
    });
  });

  describe('publish', () => {
    it('should call all subscribed handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.subscribe('test.event', handler1);
      eventBus.subscribe('test.event', handler2);

      const event = {
        eventName: 'test.event',
        occurredOn: new Date(),
        aggregateId: '1',
      };
      await eventBus.publish(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it('should not throw when no handlers registered', async () => {
      const event = {
        eventName: 'unknown.event',
        occurredOn: new Date(),
        aggregateId: '1',
      };
      await expect(eventBus.publish(event)).resolves.toBeUndefined();
    });

    it('should catch errors in handlers without affecting others', async () => {
      const failingHandler = vi
        .fn()
        .mockRejectedValue(new Error('Handler failed'));
      const successHandler = vi.fn();

      eventBus.subscribe('test.event', failingHandler);
      eventBus.subscribe('test.event', successHandler);

      const event = {
        eventName: 'test.event',
        occurredOn: new Date(),
        aggregateId: '1',
      };
      await eventBus.publish(event);

      expect(failingHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe('clearHandlers', () => {
    it('should remove all handlers for a specific event', () => {
      eventBus.subscribe('test.event', vi.fn());
      eventBus.subscribe('test.event', vi.fn());
      eventBus.subscribe('other.event', vi.fn());

      eventBus.clearHandlers('test.event');

      expect(eventBus.getHandlerCount('test.event')).toBe(0);
      expect(eventBus.getHandlerCount('other.event')).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('should remove all handlers', () => {
      eventBus.subscribe('event1', vi.fn());
      eventBus.subscribe('event2', vi.fn());

      eventBus.clearAll();

      expect(eventBus.getHandlerCount('event1')).toBe(0);
      expect(eventBus.getHandlerCount('event2')).toBe(0);
    });
  });

  describe('getHandlerCount', () => {
    it('should return 0 for unknown events', () => {
      expect(eventBus.getHandlerCount('nonexistent')).toBe(0);
    });
  });
});
