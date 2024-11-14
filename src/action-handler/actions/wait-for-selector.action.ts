import { Page } from "puppeteer";
import { Action } from "../decorators/action.decorator";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";

export type WaitActionParams = {
    selector: string;
}

@Action('wait')
export class WaitAction extends BaseAction<WaitActionParams> {
    async run(previousData: PreviousData): Promise<void> {
        await this.page.waitForSelector(this.params.selector);
    }
}

export default WaitAction;
