import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PuppeteerService } from '../puppeteer/puppeteer.service';
import { VariablesService } from '../variables/variables.service';
import { actionsMapping } from './actions/actions.mapping';
import { PreviousData } from './types/previous-data.type';
import { ScrapeAction } from '../scrape/types/scrape-action.interface';
import {
  getAllActions,
  RegisteredAction,
} from './_decorators/action.decorator';
import { ScrapeActionData } from '../scrape/types/scrape-action-data.interface';
import { ActionFactory } from './factories/action.factory';
import { VariableResolutionStrategy } from './strategies/variable-resolution.strategy';
import { ActionContext } from './interfaces/action-context.interface';
import { ScrapeLogger } from '../_logger/scrape-logger.service';

@Injectable()
export class ActionHandlerService implements OnModuleInit {
  private actions: Array<RegisteredAction> = getAllActions();

  private actionsMapping = actionsMapping;

  private readonly logger: ScrapeLogger;

  constructor(
    private puppeteerService: PuppeteerService,
    private variablesService: VariablesService,
    private actionFactory: ActionFactory,
    private variableStrategy: VariableResolutionStrategy,
    logger: ScrapeLogger,
  ) {
    this.logger = logger;
    this.logger.setContext(ActionHandlerService.name);
  }

  onModuleInit() {
    const logger = new Logger(ActionHandlerService.name);

    this.actions.forEach((action: RegisteredAction) => {
      logger.debug(
        `✅ Action registered: ${action.name} (${action.metadata.displayName})`,
      );
    });

    logger.debug(`📋 Total actions registered: ${this.actions.length}`);
    logger.debug(
      `📝 Registered action names: ${this.actions.map((a) => a.name).join(', ')}`,
    );
  }

  async handleAction(
    scrapeAction: ScrapeAction<unknown>,
    previousData: PreviousData,
    data?: ScrapeActionData,
    storedData?: object,
    runVariables?: Record<string, any>,
  ): Promise<any> {
    // Logger-Kontext setzen für Event-Support
    this.logger.setEventContext(
      data?.scrapeEventsService,
      data?.scrapeId,
      data?.runId,
    );

    this.logger.log(
      `🚀 Handling action {"action":"${scrapeAction.action}","name":"${scrapeAction.name || ''}"}`,
    );

    // Action finden
    const actionInstance = this.getAction(scrapeAction.action);
    if (!actionInstance) {
      const errorMsg = `Action "${scrapeAction.action}" not found! Available actions: ${this.actions.map((a) => a.name).join(', ')}`;
      this.logger.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Page holen
    const page = await this.puppeteerService.getValidPage();
    this.logger.debug(`📄 Using page: ${page.url()}`);

    // ✨ STRATEGY PATTERN: Variablen-Resolution
    // Priorisiere explizit übergebene runVariables, falls nicht vorhanden nutze die aus data
    const effectiveRunVariables = runVariables ?? data?.runVariables;
    const variablesMap = await this.variableStrategy.resolve(
      data?.scrapeId,
      effectiveRunVariables,
    );

    if (
      effectiveRunVariables &&
      Object.keys(effectiveRunVariables).length > 0
    ) {
      this.logger.log(
        `✨ Using ${Object.keys(effectiveRunVariables).length} run-time variables (overriding DB values)`,
      );
    }

    // ✨ FACTORY PATTERN: Action-Instanz erstellen
    const context: ActionContext<unknown> = {
      page,
      previousData,
      scrapeAction,
      services: {
        puppeteerService: this.puppeteerService,
        actionHandlerService: this,
      },
      data,
      storedData,
      variables: variablesMap,
    };

    const instance = this.actionFactory.create(actionInstance, context, this);
    return await instance.run();
  }

  getAction(action: string) {
    return this.actions.find((a) => a.name === action);
  }
}
