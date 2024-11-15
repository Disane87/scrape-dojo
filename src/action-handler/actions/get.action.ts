import { ElementHandle, Page } from "puppeteer";
import { BaseAction } from "./bases/base.action";
import { Action } from "../_decorators/action.decorator";
import { getValueFromPath } from "./_helpers/get-value-from-path.helper";

// Typdefinition für die Parameter der GetElementAction
export type GetElementActionParams = {
    selector: string; // Der CSS-Selektor, um das Element zu holen
    element: string;  // Der Pfad zum ElementHandle in den Daten
}

@Action('get')
export class GetElementAction extends BaseAction<GetElementActionParams> {
    async run(): Promise<ElementHandle<Element> | null> {
        // Hole das ElementHandle aus den Daten oder verwende die Seite
        const pageOrElement = getValueFromPath<ElementHandle<Element>>(this.data, this.params.element) || this.page;

        try {
            // Warte auf den gegebenen Selektor
            await pageOrElement.waitForSelector(this.params.selector);
        } catch (e) {
            this.logger.error(`Selector ${this.params.selector} not found`);
            return null;
        }

        // Hole das erste Element für den gegebenen Selektor
        const element = await pageOrElement.$(this.params.selector);

        if (!element) {
            this.logger.error(`Element with selector ${this.params.selector} not found`);
            return null;
        }

        this.logger.log(`Element found for selector: ${this.params.selector}`);
        return element;
    }
}

export default GetElementAction;
