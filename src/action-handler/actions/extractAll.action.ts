import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { Action } from "../_decorators/action.decorator";
import { getValueFromPath } from "./_helpers/get-value-from-path.helper";
import { ElementHandle } from "puppeteer";

export type ExtractAllParams = {
    selector: string; // Der CSS-Selektor, um die Elemente zu holen
    element: string;
}

@Action('extractAll')
export class ExtractAllAction extends BaseAction<ExtractAllParams> {

    async run() {
        const pageOrElement = getValueFromPath<ElementHandle<Element>>(this.data, this.params.element) || this.page;

        try{
            await pageOrElement.waitForSelector(this.params.selector);
        } catch(e){
            this.logger.error(`Selector ${this.params.selector} not found`);
            return [];
        }
        
        const extractedData = (await pageOrElement.$$eval(this.params.selector, elements => elements.map(element => element.textContent.trim())))
        return extractedData;
    }
}

export default ExtractAllAction;