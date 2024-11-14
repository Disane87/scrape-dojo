import { Page } from "puppeteer";
import { Action } from "../decorators/action.decorator";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";

export type NavigateActionParams = {
    url: string;
}

@Action('navigate')
export class NavigateAction extends BaseAction<NavigateActionParams> {

    async run(previousData: PreviousData): Promise<void> {
        super.run(previousData);
        await this.page.goto(this.params.url);
        // await this.page.waitForNavigation();
    }
}

export default NavigateAction;
