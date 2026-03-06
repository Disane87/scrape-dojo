import { Injectable, Logger } from '@nestjs/common';
import { BaseAction } from '../actions/bases/base.action';
import { ActionContext } from '../interfaces/action-context.interface';
import { PuppeteerService } from '../../puppeteer/puppeteer.service';
import { ActionHandlerService } from '../action-handler.service';
import { RegisteredAction } from '../_decorators/action.decorator';

/**
 * Factory für Action-Instanzen
 * Vereinfacht die Erstellung von Actions mit Builder Pattern
 */
@Injectable()
export class ActionFactory {
  private readonly logger = new Logger(ActionFactory.name);

  constructor(private readonly puppeteerService: PuppeteerService) {}

  /**
   * Erstellt eine Action-Instanz aus einem registrierten Action-Typ
   */
  create<TParams = unknown>(
    registeredAction: RegisteredAction,
    context: ActionContext<TParams>,
    actionHandlerService: ActionHandlerService,
  ): BaseAction<TParams> {
    const services = {
      puppeteerService: this.puppeteerService,
      actionHandlerService,
    };

    const fullContext: ActionContext<TParams> = {
      ...context,
      services,
    };

    // Instanziiere die Action mit dem vereinfachten Context
    const instance = new (registeredAction.actionClass as new (
      page: any,
      previousData: any,
      scrapeAction: any,
      actionHandlerService: any,
      puppeteerService: any,
      data?: any,
      storedData?: any,
      variables?: any,
    ) => BaseAction<TParams>)(
      fullContext.page,
      fullContext.previousData,
      fullContext.scrapeAction,
      actionHandlerService,
      this.puppeteerService,
      fullContext.data,
      fullContext.storedData,
      fullContext.variables,
    );

    this.logger.debug(`🏭 Created action instance: ${registeredAction.name}`);
    return instance;
  }

  /**
   * Erstellt eine Action mit allen benötigten Abhängigkeiten
   * Alternative Methode für zukünftige Vereinfachung
   */
  createWithDependencies<TParams = unknown>(
    actionClass: any,
    context: ActionContext<TParams>,
    actionHandlerService: ActionHandlerService,
  ): BaseAction<TParams> {
    return new actionClass(
      context.page,
      context.previousData,
      context.scrapeAction,
      actionHandlerService,
      this.puppeteerService,
      context.data,
      context.storedData,
      context.variables,
    );
  }
}
