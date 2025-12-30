import { Page } from 'puppeteer';
import { PreviousData } from '../types/previous-data.type';
import { ScrapeAction } from '../../scrape/types/scrape-action.interface';
import { ScrapeActionData } from '../../scrape/types/scrape-action-data.interface';
import { PuppeteerService } from '../../puppeteer/puppeteer.service';
import { ActionHandlerService } from '../action-handler.service';

/**
 * Grouped services für Actions
 */
export interface ActionServices {
    puppeteerService: PuppeteerService;
    actionHandlerService: ActionHandlerService;
}

/**
 * Vereinfachter Context für Action-Erstellung
 */
export interface ActionContext<TParams = unknown> {
    page: Page;
    previousData: PreviousData;
    scrapeAction: ScrapeAction<TParams>;
    services: ActionServices;
    data?: ScrapeActionData;
    storedData?: object;
    variables?: Record<string, string>;
}
