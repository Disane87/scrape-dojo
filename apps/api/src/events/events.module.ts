import { Global, Module } from '@nestjs/common';
import { EventBus } from './event-bus';
import { LoggingEventHandler } from './handlers/logging-event.handler';

/**
 * Globales Events Modul
 *
 * Stellt den EventBus für die gesamte Applikation zur Verfügung
 * 🎯 OBSERVER PATTERN: Subject/Publisher
 */
@Global()
@Module({
  providers: [
    EventBus,
    LoggingEventHandler, // Event Handler wird automatisch registriert
  ],
  exports: [EventBus],
})
export class EventsModule {}
