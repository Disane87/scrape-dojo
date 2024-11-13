import { Page } from "puppeteer";
import { Action } from "../decorators/action.decorator";
import { BaseAction } from "./bases/base.action";
import { ActionName } from "./types/actionnames.type";

@Action('extractAll')
export class ExtractAllAction extends BaseAction<{ selector: string }> {

    constructor(page: Page){
        super(page)
        this.logger.log('created');
    }
    name: string = 'extractAll';
    action: ActionName = 'extractAll';
    params: { selector: string };

    async run(params: { selector: string }) {
        return (await this.page.$$eval(params.selector, elements => elements));
    }
}

export default ExtractAllAction;