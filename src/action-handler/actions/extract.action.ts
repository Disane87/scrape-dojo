import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { Action } from "../decorators/action.decorator";
import { BaseAction } from "./bases/base.action";

export type ExtractActionParams = {
    selector: string;
}

@Action('extract')
export class ExtractAction extends BaseAction<ExtractActionParams> {
    constructor(page: Page) {
        super(page);
        this.logger.log('ExtractAction created');
    }

    // Verwende den `params`-Typ aus `BaseAction` ohne ihn erneut zu definieren
    async run(params: ExtractActionParams): Promise<string | null> {
        return await this.page.$eval(params.selector, el => el.textContent);
    }
}

export default ExtractAction;
