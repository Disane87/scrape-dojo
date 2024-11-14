import { Page } from "puppeteer";
import { Action } from "../decorators/action.decorator";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";

export type ExtractActionParams = {
    selector: string;
}

@Action('extract')
export class ExtractAction extends BaseAction<ExtractActionParams> {

    // Verwende den `params`-Typ aus `BaseAction` ohne ihn erneut zu definieren
    async run(previousData: PreviousData): Promise<string | null> {
        return await this.page.$eval(this.params.selector, el => el.textContent);
    }
}

export default ExtractAction;
