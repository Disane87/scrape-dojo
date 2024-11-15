import { ElementHandle, Page } from "puppeteer";
import { BaseAction } from "./bases/base.action";
import { Action } from "../_decorators/action.decorator";
import { PreviousData } from "../types/previous-data.type";
import { getValueFromPath } from "./_helpers/get-value-from-path.helper";

// Typdefinition für die Parameter der GetAllElementsAction
export type GetAllElementsActionParams = {
    selector: string; // Der CSS-Selektor, um die Elemente zu holen
    element: string;
}

@Action('getAll')
export class GetAllElementsAction extends BaseAction<GetAllElementsActionParams> {

    async run(): Promise<ElementHandle<Element>[]> {

        const pageOrElement = getValueFromPath<ElementHandle<Element>>(this.data, this.params.element) || this.page;

        try{
            await pageOrElement.waitForSelector(this.params.selector);
        } catch(e){
            this.logger.error(`Selector ${this.params.selector} not found`);
            return [];
        }

        // Hole alle Elemente für den gegebenen Selektor
        const elements = await pageOrElement.$$(this.params.selector);

        // // Erstelle ein Array von Elementobjekten mit dem Selektor und Index
        // const elementObjects: ElementObject[] = elements.map((_, index) => ({
        //     selector: this.params.selector,
        //     index: index
        // }));

        this.logger.log(`Found ${elements.length} elements for selector: ${this.params.selector}`);
        return elements.map((element, index) => element);

    }
}

export default GetAllElementsAction;
