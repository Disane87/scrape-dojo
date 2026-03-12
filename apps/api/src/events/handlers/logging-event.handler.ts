import { Injectable, Logger } from '@nestjs/common';
import { EventBus } from '../event-bus';
import {
  ScrapeStartedEvent,
  ScrapeCompletedEvent,
  ScrapeAbortedEvent,
  StepStartedEvent,
  StepCompletedEvent,
  ActionStartedEvent,
  ActionCompletedEvent,
  ActionFailedEvent,
} from '../domain-events';
import { SecretRedactionService } from '../../_logger/secret-redaction.service';

/**
 * Event Handler für strukturiertes Logging
 *
 * Abonniert alle Domain Events und loggt sie strukturiert
 * 🎯 OBSERVER PATTERN: Concrete Observer
 */
@Injectable()
export class LoggingEventHandler {
  private readonly logger = new Logger(LoggingEventHandler.name);

  constructor(
    private readonly eventBus: EventBus,
    private readonly secretRedaction: SecretRedactionService,
  ) {
    this.subscribeToEvents();
  }

  /**
   * Abonniert alle relevanten Events
   */
  private subscribeToEvents(): void {
    this.eventBus.subscribe(
      ScrapeStartedEvent.name,
      this.onScrapeStarted.bind(this),
    );
    this.eventBus.subscribe(
      ScrapeCompletedEvent.name,
      this.onScrapeCompleted.bind(this),
    );
    this.eventBus.subscribe(
      ScrapeAbortedEvent.name,
      this.onScrapeAborted.bind(this),
    );
    this.eventBus.subscribe(
      StepStartedEvent.name,
      this.onStepStarted.bind(this),
    );
    this.eventBus.subscribe(
      StepCompletedEvent.name,
      this.onStepCompleted.bind(this),
    );
    this.eventBus.subscribe(
      ActionStartedEvent.name,
      this.onActionStarted.bind(this),
    );
    this.eventBus.subscribe(
      ActionCompletedEvent.name,
      this.onActionCompleted.bind(this),
    );
    this.eventBus.subscribe(
      ActionFailedEvent.name,
      this.onActionFailed.bind(this),
    );

    this.logger.log('📝 LoggingEventHandler subscribed to all domain events');
  }

  /**
   * Scrape Started Event Handler
   */
  private onScrapeStarted(event: ScrapeStartedEvent): void {
    const redactedVars = this.secretRedaction.redactObject(event.variables);
    this.logger.log(
      `🚀 Scrape started: ${event.scrapeId} | Run: ${event.runId} | Variables: ${JSON.stringify(redactedVars)}`,
    );
  }

  /**
   * Scrape Completed Event Handler
   */
  private onScrapeCompleted(event: ScrapeCompletedEvent): void {
    this.logger.log(
      `✅ Scrape completed: ${event.scrapeId} | Run: ${event.runId} | Success: ${event.success}`,
    );
  }

  /**
   * Scrape Aborted Event Handler
   */
  private onScrapeAborted(event: ScrapeAbortedEvent): void {
    this.logger.error(
      `🛑 Scrape aborted: ${event.scrapeId} | Run: ${event.runId} | Reason: ${event.reason}`,
    );
  }

  /**
   * Step Started Event Handler
   */
  private onStepStarted(event: StepStartedEvent): void {
    this.logger.log(
      `  ▶️  Step started: ${event.stepName} [${event.stepIndex}] | Scrape: ${event.scrapeId}`,
    );
  }

  /**
   * Step Completed Event Handler
   */
  private onStepCompleted(event: StepCompletedEvent): void {
    this.logger.log(
      `  ✅ Step completed: ${event.stepName} [${event.stepIndex}] | Scrape: ${event.scrapeId}`,
    );
  }

  /**
   * Action Started Event Handler
   */
  private onActionStarted(event: ActionStartedEvent): void {
    this.logger.log(
      `    🔧 Action started: ${event.actionName} (${event.actionType}) [${event.actionIndex}] | Scrape: ${event.scrapeId}`,
    );
  }

  /**
   * Action Completed Event Handler
   */
  private onActionCompleted(event: ActionCompletedEvent): void {
    const resultPreview = event.result
      ? ` | Result: ${this.secretRedaction.redact(JSON.stringify(event.result).substring(0, 100))}${JSON.stringify(event.result).length > 100 ? '...' : ''}`
      : '';
    this.logger.log(
      `    ✅ Action completed: ${event.actionName} (${event.actionType}) [${event.actionIndex}]${resultPreview}`,
    );
  }

  /**
   * Action Failed Event Handler
   */
  private onActionFailed(event: ActionFailedEvent): void {
    this.logger.error(
      this.secretRedaction.redact(
        `    ❌ Action failed: ${event.actionName} (${event.actionType}) [${event.actionIndex}] | Error: ${event.error}`,
      ),
    );
  }
}
