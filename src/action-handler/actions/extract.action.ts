import { BaseAction } from "./bases/base.action";
import { Action } from "../_decorators/action.decorator";
import { getValueFromPath } from "./_helpers/get-value-from-path.helper";
import { ElementHandle } from "puppeteer";

export type ExtractActionParams = {
    selector: string;
    element: string;
    property: string;
}

@Action('extract')
export class ExtractAction extends BaseAction<ExtractActionParams> {

    // Verwende den params-Typ aus BaseAction ohne ihn erneut zu definieren
    async run(): Promise<string | null> {
        const pageOrElement = getValueFromPath<ElementHandle<Element>>(this.data, this.params.element) || this.page;

        if (!this.params?.property) {
            this.params.property = 'textContent';
        }

        try {
            const value = await pageOrElement.$eval(
                this.params.selector,
                (el: Element, property: string) => el[property].trim(),
                this.params.property
            );
            return value;

        } catch (ex) {
            this.logger.error(`Error while extracting data: ${ex.message}`);
            return null;
        }
    }
}

export default ExtractAction;
