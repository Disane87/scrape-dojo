import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { ScrapeAction } from "src/scrape/types/scrape-action.interface";
import { ActionName } from "../types/actionnames.type";

export abstract class BaseAction<TParams> implements ScrapeAction<TParams> {
    protected readonly logger: Logger;
    protected page: Page;

    constructor(page: Page) {
        this.page = page;
        this.logger = new Logger(this.constructor.name)
    }

    name: string;
    action: ActionName;
    params: TParams;

    // Die Methode kann flexibel eine beliebige Anzahl von Parametern akzeptieren
    abstract run(params: TParams): Promise<any>;
}

