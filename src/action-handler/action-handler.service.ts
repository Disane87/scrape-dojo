import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getAllActions, RegisteredAction } from './decorators/action.decorator';
import { PuppeteerService } from 'src/puppeteer/puppeteer.service';
import { Page } from 'puppeteer';
import { BaseAction } from './actions/bases/base.action';
import { actionsMapping } from './actions/actions.mapping'
import { PreviousData } from './types/previous-data.type';
import { ScrapeAction } from 'src/scrape/types/scrape-action.interface';
import LoopAction from './actions/loop.action';

@Injectable()
export class ActionHandlerService implements OnModuleInit {
    private actions: Array<RegisteredAction> = getAllActions();

    private actionsMapping = actionsMapping;

    private readonly logger = new Logger(ActionHandlerService.name);

    constructor(private puppeteerService: PuppeteerService) {}

    onModuleInit() {
        this.actions.forEach((action: RegisteredAction) => {
            this.logger.debug(` ✅ Action "${action.name}" registered`);
        });
    }

    async handleAction(scrapeAction: ScrapeAction<unknown>, previousData: PreviousData, data?: object): Promise<any> {

        this.logger.log(`🚀 Handling action ${scrapeAction}`);
        this.logger.debug(`🚀 Params: ${JSON.stringify(scrapeAction.params)}`);
        this.logger.debug(`🚀 Previous data: ${JSON.stringify(previousData)}`);
        
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
                scrapeAction: ScrapeAction<unknown>, 
                actionHandlerService: ActionHandlerService,
                data?: object
            ) 
            => BaseAction<unknown>)(page, scrapeAction, this, data);

        const result = await instance.run(previousData);

        // await page.close();
        return result;
    }

    getAction(action: string) {
        return this.actions.find(a => a.name === action);
    }   
}
