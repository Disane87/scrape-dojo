import { ElementHandle, Page } from "puppeteer";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { Action } from "../_decorators/action.decorator";
import { getValueFromPath } from "./_helpers/get-value-from-path.helper";

export type ClickActionParams = {
    selector: string;
    element: string;
}

@Action('click')
export class ClickAction extends BaseAction<ClickActionParams> {
    async run(): Promise<void> {
        let elementHandle: ElementHandle<Element> | null = null;

        // Prüfe, ob ein elementHandle basierend auf this.params.element existiert
        if (this.params.element) {
            elementHandle = getValueFromPath<ElementHandle<Element>>(this.data, this.params.element);
        }

        // Falls ein elementHandle vorhanden ist, nutze es
        if (elementHandle) {
            if (this.params.selector) {
                const selectorElementHandle = await elementHandle.waitForSelector(this.params.selector);
                await selectorElementHandle?.click();
            } else {
                await elementHandle.click();
            }
        } else {
            // Falls kein elementHandle vorhanden ist, klicke direkt auf den Selector auf der Seite
            const selectorElementHandle = await this.page.waitForSelector(this.params.selector);
            await selectorElementHandle?.click();
        }
    }
}

export default ClickAction;
