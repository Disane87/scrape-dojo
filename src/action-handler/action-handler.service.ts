import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PuppeteerService } from 'src/puppeteer/puppeteer.service';
import { Page } from 'puppeteer';
import { BaseAction } from './actions/bases/base.action';
import { actionsMapping } from './actions/actions.mapping'
import { PreviousData } from './types/previous-data.type';
import { ScrapeAction } from 'src/scrape/types/scrape-action.interface';
import { getAllActions, RegisteredAction } from './_decorators/action.decorator';
import { ScrapeActionData } from 'src/scrape/types/scrape-action-data.interface';

@Injectable()
export class ActionHandlerService implements OnModuleInit {
    private actions: Array<RegisteredAction> = getAllActions();

    private actionsMapping = actionsMapping;

    private readonly logger = new Logger(ActionHandlerService.name);

    constructor(private puppeteerService: PuppeteerService) { }

    onModuleInit() {
        this.actions.forEach((action: RegisteredAction) => {
            this.logger.debug(` ✅ Action "${action.name}" registered`);
        });
    }

    async handleAction(scrapeAction: ScrapeAction<unknown>, previousData: PreviousData, data?: object, storedData?: ScrapeActionData): Promise<any> {

        this.logger.log(`🚀 Handling action ${JSON.stringify(scrapeAction)}`);
        this.logger.debug(`🚀 Params: ${JSON.stringify(scrapeAction.params)}`);
        this.logger.debug(`🚀 Previous data: ${JSON.stringify(previousData)}`);
        this.logger.debug(`🚀 Data: ${JSON.stringify(data)}`);
        this.logger.debug(`🚀 Stored data: ${JSON.stringify(storedData)}`);

        // Hier wird der Code für das Scrapen implementiert
        const actionInstance = this.getAction(scrapeAction.action);
        if (!actionInstance) {
            return null;
        }

        // Übergib die Page beim Erstellen der Instanz
        const page = await this.puppeteerService.currentPage;

        const instance = new (actionInstance.actionClass as new
            (
                page: Page,
                pveiousData: PreviousData,
                scrapeAction: ScrapeAction<unknown>,
                actionHandlerService: ActionHandlerService,
                puppeteerService: PuppeteerService,
                data?: object,
                storedData?: ScrapeActionData
            )
            => BaseAction<unknown>)(page, previousData, scrapeAction, this, this.puppeteerService, data, storedData);

        const result = await instance.run();

        // await page.close();
        return result;
    }

    getAction(action: string) {
        return this.actions.find(a => a.name === action);
    }
}