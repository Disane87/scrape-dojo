import { Page } from "puppeteer";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { Action } from "../_decorators/action.decorator";

export type TypeActionParams = {
    selector: string;
    text: string;
    pressEnter: boolean;
}

@Action('type')
export class TypeAction extends BaseAction<TypeActionParams> {
    async run(): Promise<void> {
        await this.page.type(this.params.selector, this.params.text);
        if(this.params.pressEnter){
            await this.page.keyboard.press('Enter');
            await this.page.waitForNavigation();
        }
    }
}

export default TypeAction;
