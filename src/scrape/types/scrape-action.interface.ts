import { ActionName } from "src/action-handler/actions/actions.mapping";

export interface ScrapeAction<T> {
    name: string;

    action: ActionName;

    params: T;
}