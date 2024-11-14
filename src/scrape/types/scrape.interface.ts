import { ScrapeStep } from "./scrape-step.interface";

export interface Scrape {
    id: string;
    steps: Array<ScrapeStep>;
}

export interface Scrapes {
    scrapes: Array<Scrape>
}
