import { ScrapeAction } from "./scrape-action.interface";

export interface ScrapeStep {
    name: string;
    actions: Array<ScrapeAction<unknown>>;

}