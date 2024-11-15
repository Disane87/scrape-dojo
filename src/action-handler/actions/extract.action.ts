import { BaseAction } from "./bases/base.action";
import { Action } from "../_decorators/action.decorator";
import { getValueFromPath } from "./_helpers/get-value-from-path.helper";
import { ElementHandle, JSHandle, Page } from "puppeteer";

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
        let prop = this.params.property

        if (!prop) {
            prop = 'textContent';
        }

        try {


            const value = await pageOrElement.$(this.params.selector);
            if (!value) {
                this.logger.error(`Element with selector ${this.params.selector} not found`);
                return null;
            }

            const property = await (await value.getProperty(prop)).jsonValue();
            if (property) {
                return (property as string).trim();
            } else {
                const htmlContent = await this.page.evaluate((li: HTMLElement, prop: string) => li[prop], pageOrElement, prop);
                return htmlContent;
            }

        } catch (ex) {
            this.logger.error(`Error while extracting data: ${ex.message}`);
            return null;
        }
    }
}

export default ExtractAction;
