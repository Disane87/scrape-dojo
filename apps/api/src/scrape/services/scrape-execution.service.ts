import { Injectable } from '@nestjs/common';
import { Scrape } from '../types/scrape.interface';
import { PuppeteerService } from '../../puppeteer/puppeteer.service';
import { ActionHandlerService } from '../../action-handler/action-handler.service';
import { ScrapeEventsService } from '../scrape-events.service';
import { DatabaseService } from '../../database/database.service';
import { EventBus } from '../../events/event-bus';
import {
  ScrapeStartedEvent,
  ScrapeCompletedEvent,
  ScrapeAbortedEvent,
  StepStartedEvent,
  StepCompletedEvent,
  ActionStartedEvent,
  ActionCompletedEvent,
  ActionFailedEvent,
} from '../../events/domain-events';
import { ScrapeLogger } from '../../_logger/scrape-logger.service';

@Injectable()
export class ScrapeExecutionService {
  private readonly logger = new ScrapeLogger();

  constructor(
    private readonly puppeteerService: PuppeteerService,
    private readonly actionHandlerService: ActionHandlerService,
    private readonly scrapeEventsService: ScrapeEventsService,
    private readonly databaseService: DatabaseService,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Führt einen Scrape aus
   */
  async executeScrape(
    scrape: Scrape,
    runId: string,
    previousData: Map<string, any>,
    storedData: any,
    variables?: Record<string, any>,
  ): Promise<{ success: boolean; aborted?: boolean; error?: string }> {
    this.puppeteerService.resetAbort();

    // Setze Logger-Context für diesen Workflow
    this.logger.setContext('ScrapeExecutionService');
    this.logger.setEventContext(this.scrapeEventsService, scrape.id, runId);

    try {
      const variablesInfo = await this.prepareVariablesInfo(
        scrape,
        variables,
        previousData,
      );

      // ✨ OBSERVER PATTERN: Publish ScrapeStartedEvent
      await this.eventBus.publish(
        new ScrapeStartedEvent(runId, scrape.id, runId, variablesInfo),
      );

      this.scrapeEventsService.scrapeStarted(scrape.id, runId, variablesInfo);
      await this.databaseService.createRun(runId, scrape.id, 'manual');

      // Prominente Start-Nachricht
      this.logger.scrape(
        '╔════════════════════════════════════════════════════════════════╗',
      );
      this.logger.scrape(`║  🚀 WORKFLOW STARTED: ${scrape.id.padEnd(40)} ║`);
      this.logger.scrape(`║  Run ID: ${runId.padEnd(51)} ║`);
      this.logger.scrape(
        '╚════════════════════════════════════════════════════════════════╝',
      );

      await this.executeSteps(
        scrape,
        runId,
        previousData,
        storedData,
        variables,
      );

      // Build and save debug data
      const debugData = this.buildDebugData(previousData);
      await this.databaseService.storeData(
        scrape.id,
        '__debugData',
        JSON.stringify(debugData),
        runId,
      );

      await this.databaseService.updateRunStatus(runId, 'completed');

      // ✨ OBSERVER PATTERN: Publish ScrapeCompletedEvent
      await this.eventBus.publish(
        new ScrapeCompletedEvent(runId, scrape.id, runId, true),
      );

      this.scrapeEventsService.scrapeEnded(scrape.id, true, undefined, runId);

      // Prominente Success-Nachricht
      this.logger.scrape(
        '╔════════════════════════════════════════════════════════════════╗',
      );
      this.logger.scrape(`║  ✅ WORKFLOW COMPLETED: ${scrape.id.padEnd(37)} ║`);
      this.logger.scrape(`║  Run ID: ${runId.padEnd(51)} ║`);
      this.logger.scrape(
        '╚════════════════════════════════════════════════════════════════╝',
      );

      return { success: true };
    } catch (error) {
      await this.handleExecutionError(scrape, runId, error);
      throw error;
    } finally {
      await this.cleanup(scrape);
    }
  }

  /**
   * Führt alle Steps eines Scrapes aus
   */
  private async executeSteps(
    scrape: Scrape,
    runId: string,
    previousData: Map<string, any>,
    storedData: any,
    variables?: Record<string, any>,
  ): Promise<void> {
    for (let stepIndex = 0; stepIndex < scrape.steps.length; stepIndex++) {
      if (this.checkAbort(scrape, runId)) {
        throw new Error('Aborted by user');
      }

      const step = scrape.steps[stepIndex];
      this.logger.scrape(`Running step: ${step.name}`);

      // ✨ OBSERVER PATTERN: Publish StepStartedEvent
      await this.eventBus.publish(
        new StepStartedEvent(runId, scrape.id, runId, step.name, stepIndex),
      );

      this.scrapeEventsService.updateStepStatus(
        scrape.id,
        step.name,
        stepIndex,
        'running',
        runId,
      );
      const dbStep = await this.databaseService.createStep(
        runId,
        step.name,
        stepIndex,
      );

      try {
        await this.executeActions(
          scrape,
          step,
          stepIndex,
          dbStep.id,
          runId,
          previousData,
          storedData,
          variables,
        );

        await this.databaseService.updateStepStatus(dbStep.id, 'completed');

        // ✨ OBSERVER PATTERN: Publish StepCompletedEvent
        await this.eventBus.publish(
          new StepCompletedEvent(runId, scrape.id, runId, step.name, stepIndex),
        );

        this.scrapeEventsService.updateStepStatus(
          scrape.id,
          step.name,
          stepIndex,
          'completed',
          runId,
        );
        this.logger.scrape(`Step "${step.name}" completed`);
      } catch (error) {
        await this.databaseService.updateStepStatus(dbStep.id, 'error');
        throw error;
      }
    }
  }

  /**
   * Führt alle Actions eines Steps aus
   */
  private async executeActions(
    scrape: Scrape,
    step: any,
    stepIndex: number,
    stepId: number,
    runId: string,
    previousData: Map<string, any>,
    storedData: any,
    variables?: Record<string, any>,
  ): Promise<void> {
    for (
      let actionIndex = 0;
      actionIndex < step.actions.length;
      actionIndex++
    ) {
      if (this.checkAbort(scrape, runId)) {
        throw new Error('Aborted by user');
      }

      const action = step.actions[actionIndex];
      const actionName = action.name || `${action.action}-${actionIndex}`;

      const dbAction = await this.databaseService.createAction(
        stepId,
        actionName,
        action.action,
        actionIndex,
      );

      this.scrapeEventsService.updateActionStatus(
        scrape.id,
        step.name,
        stepIndex,
        actionName,
        actionIndex,
        action.action,
        'running',
        undefined,
        runId,
      );

      this.eventBus.publish(
        new ActionStartedEvent(
          runId,
          scrape.id,
          runId,
          actionName,
          action.action,
          actionIndex,
        ),
      );

      try {
        const result = await this.executeAction(
          action,
          scrape,
          runId,
          previousData,
          storedData,
          variables,
        );

        if (result !== undefined && result !== null) {
          this.logger.debug(`Action "${action.name}" returned: ${result}`);
          previousData.set(action.name, result);
        }

        // Simple result storage - no context metadata
        const actionResult = {
          result,
        };

        // Check if this is a loop action and save loop data
        let loopData = null;
        if (action.action === 'loop' && result && result.iterations) {
          loopData = {
            iterations: result.iterations,
            total: result.total,
            current: result.current,
          };
        }

        // Fire-and-forget for non-critical DB write and events
        this.databaseService.updateActionStatus(
          dbAction.id,
          'completed',
          undefined,
          actionResult,
          loopData,
        );

        this.scrapeEventsService.updateActionStatus(
          scrape.id,
          step.name,
          stepIndex,
          actionName,
          actionIndex,
          action.action,
          'completed',
          undefined,
          runId,
          actionResult,
        );

        this.eventBus.publish(
          new ActionCompletedEvent(
            runId,
            scrape.id,
            runId,
            actionName,
            action.action,
            actionIndex,
            actionResult,
          ),
        );
      } catch (error) {
        await this.handleActionError(
          error,
          scrape,
          step,
          stepIndex,
          actionName,
          actionIndex,
          action.action,
          dbAction.id,
          runId,
        );
      }
    }
  }

  /**
   * Führt eine einzelne Action aus
   */
  private async executeAction(
    action: any,
    scrape: Scrape,
    runId: string,
    previousData: Map<string, any>,
    storedData: any,
    variables?: Record<string, any>,
  ): Promise<any> {
    const actionData = {
      currentData: {},
      storedData: storedData,
      scrapeEventsService: this.scrapeEventsService,
      databaseService: this.databaseService,
      scrapeId: scrape.id,
      runId: runId,
      metadata: scrape.metadata,
      runVariables: variables, // Runtime-Variablen für verschachtelte Actions
    };

    return await this.actionHandlerService.handleAction(
      action,
      previousData,
      actionData,
      storedData,
      variables,
    );
  }

  /**
   * Behandelt Fehler bei der Action-Ausführung
   */
  private async handleActionError(
    error: any,
    scrape: Scrape,
    step: any,
    stepIndex: number,
    actionName: string,
    actionIndex: number,
    actionType: string,
    dbActionId: number,
    runId: string,
  ): Promise<void> {
    // Break-Loop ist kein echter Fehler
    if (error.message === 'BreakLoop') {
      this.logger.warn(
        `Exiting scrape because of break on action "${actionName}"`,
      );
      await this.databaseService.updateActionStatus(dbActionId, 'skipped');
      this.scrapeEventsService.updateActionStatus(
        scrape.id,
        step.name,
        stepIndex,
        actionName,
        actionIndex,
        actionType,
        'skipped',
        undefined,
        runId,
      );
      return;
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    await this.databaseService.updateActionStatus(
      dbActionId,
      'error',
      errorMessage,
    );

    // ✨ OBSERVER PATTERN: Publish ActionFailedEvent
    await this.eventBus.publish(
      new ActionFailedEvent(
        runId,
        scrape.id,
        runId,
        actionName,
        actionType,
        actionIndex,
        errorMessage,
      ),
    );

    this.scrapeEventsService.updateActionStatus(
      scrape.id,
      step.name,
      stepIndex,
      actionName,
      actionIndex,
      actionType,
      'error',
      errorMessage,
      runId,
    );

    this.logger.error(
      `❌ Error executing action "${actionName}": ${errorMessage}`,
    );
    if (errorStack) {
      this.logger.error(errorStack);
    }

    throw error;
  }

  /**
   * Behandelt Fehler bei der Scrape-Ausführung
   */
  private async handleExecutionError(
    scrape: Scrape,
    runId: string,
    error: any,
  ): Promise<void> {
    const errorMessage = error.message || 'Unknown error';
    await this.databaseService.updateRunStatus(runId, 'error', errorMessage);

    // ✨ OBSERVER PATTERN: Publish ScrapeAbortedEvent
    await this.eventBus.publish(
      new ScrapeAbortedEvent(runId, scrape.id, runId, errorMessage),
    );

    this.scrapeEventsService.scrapeEnded(scrape.id, false, errorMessage, runId);

    // Prominente Error-Nachricht
    this.logger.scrape(
      '╔════════════════════════════════════════════════════════════════╗',
    );
    this.logger.scrape(`║  ❌ WORKFLOW FAILED: ${scrape.id.padEnd(40)} ║`);
    this.logger.scrape(`║  Run ID: ${runId.padEnd(51)} ║`);
    this.logger.scrape(
      '╚════════════════════════════════════════════════════════════════╝',
    );
    this.logger.error(`Error: ${errorMessage}`);
  }

  /**
   * Prüft ob Scrape abgebrochen werden soll
   */
  private checkAbort(scrape: Scrape, runId: string): boolean {
    if (this.puppeteerService.isAborted) {
      this.logger.warn('🛑 Scrape aborted by user');
      this.databaseService.updateRunStatus(runId, 'error', 'Aborted by user');
      this.scrapeEventsService.scrapeEnded(
        scrape.id,
        false,
        'Aborted by user',
        runId,
      );
      return true;
    }
    return false;
  }

  /**
   * Bereitet Variablen-Informationen für das Event vor
   */
  private async prepareVariablesInfo(
    scrape: Scrape,
    variables: Record<string, any> | undefined,
    previousData: Map<string, any>,
  ): Promise<any> {
    // Hole DB-Variablen direkt aus previousData (wurden bereits dort gespeichert)
    const dbVariables: Record<string, any> = {};
    for (const [key, value] of previousData.entries()) {
      if (key.startsWith('var_')) {
        dbVariables[key.substring(4)] = value;
      }
    }

    return {
      runtime: variables || {},
      database: dbVariables,
      final: { ...dbVariables, ...(variables || {}) },
    };
  }

  /**
   * Build clean debug data structure from previousData
   */
  private buildDebugData(previousData: Map<string, any>): Record<string, any> {
    const debugData: Record<string, any> = {};

    for (const [key, value] of previousData.entries()) {
      // Unwrap if value is wrapped in { result: ... }
      let unwrappedValue = value;
      if (
        value &&
        typeof value === 'object' &&
        'result' in value &&
        Object.keys(value).length === 1
      ) {
        unwrappedValue = value.result;
      }

      // Summarize loop results instead of copying all iterations
      if (
        unwrappedValue &&
        typeof unwrappedValue === 'object' &&
        'iterations' in unwrappedValue
      ) {
        debugData[key] = {
          total: unwrappedValue.total,
          completed: unwrappedValue.iterations?.length ?? 0,
        };
      } else {
        debugData[key] = unwrappedValue;
      }
    }

    return debugData;
  }

  /**
   * Cleanup nach Scrape-Ausführung
   */
  private async cleanup(scrape: Scrape): Promise<void> {
    await this.puppeteerService.closeAllPages();
    this.logger.scrape(`🧹 Page closed after scrape "${scrape.id}"`);
  }
}
