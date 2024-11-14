import { Page } from "puppeteer";
import { Action } from "../decorators/action.decorator";
import { BaseAction } from "./bases/base.action";
import { ActionName } from "./actions.mapping";
import { PreviousData } from "../types/previous-data.type";

@Action('extractAll')
export class ExtractAllAction extends BaseAction<{ selector: string }> {

    async run(previousData: PreviousData) {
        return (await this.page.$$eval(this.params.selector, elements => elements.map(element => element.innerHTML.trim())));
    }
}

export default ExtractAllAction;