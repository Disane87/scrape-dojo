import { ActionName } from "src/action-handler/actions/actions.mapping";
import { ScrapeActionData } from "./scrape-action-data.interface";

export interface ScrapeAction<T> {
    name: string;

    action: ActionName;

    params: T;

    data: ScrapeActionData;
}