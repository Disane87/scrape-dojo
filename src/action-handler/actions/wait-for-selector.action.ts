import { Page } from "puppeteer";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { Action } from "../_decorators/action.decorator";

export type WaitActionParams = {
    selector: string;
}

@Action('wait')
export class WaitAction extends BaseAction<WaitActionParams> {
    async run(): Promise<void> {
        await this.page.waitForSelector(this.params.selector);
    }
}

export default WaitAction;
