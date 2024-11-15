import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { Action } from "../_decorators/action.decorator";
import { getValueFromPath } from "./_helpers/get-value-from-path.helper";
import { ElementHandle } from "puppeteer";

export type ExtractAllParams = {
    selector: string; // Der CSS-Selektor, um die Elemente zu holen
    element: string;
    property: string;
}

@Action('extractAll')
export class ExtractAllAction extends BaseAction<ExtractAllParams> {

    // Verwende den params-Typ aus BaseAction ohne ihn erneut zu definieren
    async run(): Promise<string[] | null> {
        // const pageOrElement = getValueFromPath<ElementHandle<Element>>(this.data, this.params.element) || this.page;
        const pageOrElement = this.previousData.get(this.params.element) as unknown as ElementHandle<HTMLElement> || this.page;
        let prop = this.params.property;

        if (!prop) {
            prop = 'textContent';
        }

        const content = await this.page.evaluate((el: HTMLElement) => el.innerHTML, pageOrElement);

        this.logger.debug(`Content: ${content}`);

        try {
            // Hole alle Elemente für den gegebenen Selektor
            const elements = await pageOrElement.$$(this.params.selector);
            if (!elements || elements.length === 0) {
                this.logger.error(`No elements found with selector ${this.params.selector}`);
                return null;
            }



            // Iteriere über alle Elemente und extrahiere die angegebene Property
            const values: string[] = [];
            for (const element of elements) {
                const propertyHandle = await element.getProperty(prop);
                const propertyValue = (await propertyHandle.jsonValue() as string).trim();

                if (propertyValue) {
                    values.push((propertyValue as string).trim());
                } else {
                    // Falls die Property nicht direkt gefunden wurde, verwende evaluate
                    const htmlContent = await this.page.evaluate(
                        (el: HTMLElement, prop: string) => el[prop] || '',
                        element,
                        prop
                    );
                    values.push((htmlContent as string).trim());
                }
            }

            return values;
        } catch (ex) {
            this.logger.error(`Error while extracting data: ${ex.message}`);
            return null;
        }
    }
}

export default ExtractAllAction;