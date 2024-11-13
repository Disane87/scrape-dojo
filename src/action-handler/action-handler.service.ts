import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getAllActions, RegisteredAction } from './decorators/action.decorator';
import { PuppeteerService } from 'src/puppeteer/puppeteer.service';
import { Page } from 'puppeteer';
import ExtractAction from './actions/extract.action';
import ExtractAllAction from './actions/extractAll.action';
import { BaseAction } from './actions/bases/base.action';
import { WaitAction } from './actions/wait.actions';

const actionsMapping = {
    'extract': ExtractAction,
    'extractAll': ExtractAllAction,
    'wait': WaitAction,
}

@Injectable()
export class ActionHandlerService implements OnModuleInit {
    private actions: Array<RegisteredAction> = getAllActions();

    private readonly logger = new Logger(ActionHandlerService.name);

    constructor(private puppeteerService: PuppeteerService) {}

    onModuleInit() {
        this.actions.forEach((action: RegisteredAction) => {
            this.logger.log(`Action "${action.name}" registered`);
        });
    }

    async handleAction(action: string, url: string, params: unknown): Promise<any> {
        // Hier wird der Code für das Scrapen implementiert
        const actionInstance = this.getAction(action);
        if (!actionInstance) {
            return null;
        }

        // Übergib die Page beim Erstellen der Instanz
        const page = await this.puppeteerService.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const instance = new (actionInstance.actionClass as new (page: Page) => BaseAction<unknown>)(page);
        const result = await instance.run(params);
        this.logger.log(`Action "${action}" returned: ${result}`);

        await page.close();
        return result;
    }

    getAction(action: string) {
        return this.actions.find(a => a.name === action);
    }   
}
