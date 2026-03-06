import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import { ScrapeAction } from '../../scrape/types/scrape-action.interface';
import { ScrapeActionData } from '../../scrape/types/scrape-action-data.interface';
import { PreviousData } from '../types/previous-data.type';
import { ActionContext } from '../interfaces/action-context.interface';
import { ActionFactory } from '../factories/action.factory';
import { RegisteredAction } from '../_decorators/action.decorator';

/**
 * Strategy für Action Execution
 * Kapselt die Logik für Action-Ausführung
 */
@Injectable()
export class ActionExecutionStrategy {
  private readonly logger = new Logger(ActionExecutionStrategy.name);

  constructor(private readonly actionFactory: ActionFactory) {}

  /**
   * Führt eine Action aus
   */
  async execute<TParams = unknown>(
    registeredAction: RegisteredAction,
    page: Page,
    previousData: PreviousData,
    scrapeAction: ScrapeAction<TParams>,
    actionHandlerService: any,
    data?: ScrapeActionData,
    storedData?: object,
    variables?: Record<string, string>,
  ): Promise<any> {
    // Erstelle Context
    const context: ActionContext<TParams> = {
      page,
      previousData,
      scrapeAction,
      services: null as any, // Wird von Factory gesetzt
      data,
      storedData,
      variables,
    };

    // Nutze Factory zum Erstellen der Action
    const instance = this.actionFactory.create(
      registeredAction,
      context,
      actionHandlerService,
    );

    // Führe Action aus
    this.logger.debug(`▶️ Executing action: ${registeredAction.name}`);
    const result = await instance.run();

    this.logger.debug(`✅ Action completed: ${registeredAction.name}`);
    return result;
  }

  /**
   * Validiert ob eine Action ausführbar ist
   */
  canExecute(registeredAction: RegisteredAction): boolean {
    return !!registeredAction && !!registeredAction.actionClass;
  }
}
