import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { ScrapeAction } from "src/scrape/types/scrape-action.interface";
import { ActionName } from "../actions.mapping";

import Handlebars from "handlebars";
import { PreviousData } from "src/action-handler/types/previous-data.type";
import { ActionHandlerService } from "src/action-handler/action-handler.service";

Handlebars.registerHelper('year', () => {
    // Return the current year dynamically
    return new Date().getFullYear();
});

export abstract class BaseAction<TParams> implements ScrapeAction<TParams> {
    protected readonly logger: Logger;
    protected page: Page;
    readonly params: TParams;

    protected data: object;

    constructor(page: Page, scrapeAction: ScrapeAction<TParams>, actionHandlerService: ActionHandlerService, data?: object) {
        this.page = page;
        this.params = scrapeAction.params;
        this.name = scrapeAction.name;

        if(data) {
            this.data = data;
        }

        this.logger = new Logger(this.constructor.name)

        this.logger.log(`⭐️ Action ${this.constructor.name} created`);
    }

    name: string;
    action: ActionName;

    // Die Methode kann flexibel eine beliebige Anzahl von Parametern akzeptieren
    run(previousActions: PreviousData): Promise<any> {
        
        Object.entries(this.params).forEach(([key, value]) => {
            this.logger.log(`Parameter ${key}: ${value}`);
            value = Handlebars.compile(value)({ previousData: previousActions, ...this.data });

            this.params[key] = value;
        });

        return Promise.resolve();
        
    }
}

