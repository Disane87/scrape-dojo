import { Global, Module } from '@nestjs/common';
import { EventBus } from './event-bus';
import { LoggingEventHandler } from './handlers/logging-event.handler';
import { SecretRedactionService } from '../_logger/secret-redaction.service';

/**
 * Globales Events Modul
 *
 * Stellt den EventBus und SecretRedactionService für die gesamte Applikation zur Verfügung
 * 🎯 OBSERVER PATTERN: Subject/Publisher
 */
@Global()
@Module({
  providers: [
    EventBus,
    SecretRedactionService,
    LoggingEventHandler, // Event Handler wird automatisch registriert
  ],
  exports: [EventBus, SecretRedactionService],
})
export class EventsModule {}
