import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from './domain-events';

export type EventHandler<T extends DomainEvent> = (
  event: T,
) => void | Promise<void>;

/**
 * Event Bus - Observer Pattern Implementation
 * Ermöglicht Publish/Subscribe für Domain Events
 */
@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);
  private handlers = new Map<string, Set<EventHandler<any>>>();

  /**
   * Registriert einen Event Handler
   */
  subscribe<T extends DomainEvent>(
    eventName: string,
    handler: EventHandler<T>,
  ): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }

    this.handlers.get(eventName)!.add(handler);
    this.logger.debug(`📡 Subscribed handler for event: ${eventName}`);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventName)?.delete(handler);
    };
  }

  /**
   * Publiziert ein Event an alle registrierten Handler
   */
  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const handlers = this.handlers.get(event.eventName);

    if (!handlers || handlers.size === 0) {
      this.logger.debug(`📭 No handlers for event: ${event.eventName}`);
      return;
    }

    this.logger.debug(
      `📤 Publishing event: ${event.eventName} to ${handlers.size} handler(s)`,
    );

    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(
          `❌ Error in event handler for ${event.eventName}: ${error.message}`,
          error.stack,
        );
      }
    });

    await Promise.all(promises);
  }

  /**
   * Entfernt alle Handler für ein Event
   */
  clearHandlers(eventName: string): void {
    this.handlers.delete(eventName);
    this.logger.debug(`🗑️ Cleared all handlers for event: ${eventName}`);
  }

  /**
   * Entfernt alle Handler
   */
  clearAll(): void {
    this.handlers.clear();
    this.logger.debug(`🗑️ Cleared all event handlers`);
  }

  /**
   * Gibt die Anzahl der Handler für ein Event zurück
   */
  getHandlerCount(eventName: string): number {
    return this.handlers.get(eventName)?.size || 0;
  }
}
