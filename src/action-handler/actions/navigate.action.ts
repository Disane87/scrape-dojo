import { Page } from "puppeteer";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { Action } from "../_decorators/action.decorator";

export type NavigateActionParams = {
    url: string;
}

@Action('navigate')
export class NavigateAction extends BaseAction<NavigateActionParams> {

    async run(): Promise<void> {
        await this.page.goto(this.params.url);
        // await this.page.waitForNavigation();
    }
}

export default NavigateAction;
