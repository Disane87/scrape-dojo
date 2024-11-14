import { Page } from "puppeteer";
import { Action } from "../decorators/action.decorator";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";

export type ClickActionParams = {
    selector: string;
}

@Action('click')
export class ClickAction extends BaseAction<ClickActionParams> {

    async run(previousData: PreviousData): Promise<void> {
        await this.page.click(this.params.selector);
    }
}

export default ClickAction;
