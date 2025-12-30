import { ElementHandle, Page } from "puppeteer";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { Action } from "../_decorators/action.decorator";
import { getValueFromPath } from "./_helpers/get-value-from-path.helper";

export type ClickActionParams = {
    selector: string;
    element: string;
    optional?: boolean;
    timeout?: number;
}

@Action('click', {
    displayName: 'Click',
    icon: 'MousePointer',
    description: 'Click on an element',
    color: 'purple',
    category: 'interaction'
})
export class ClickAction extends BaseAction<ClickActionParams> {
    async run(): Promise<boolean> {
        let elementHandle: ElementHandle<Element> | null = null;
        const optional = this.params.optional || false;
        const timeout = this.params.timeout || 30000;

        const target = this.params.selector || this.params.element || 'element';
        this.logger.log(`🖱️ Clicking: ${target}${optional ? ' (optional)' : ''}`);

        try {
            // Prüfe, ob ein elementHandle basierend auf this.params.element existiert
            if (this.params.element) {
                elementHandle = getValueFromPath<ElementHandle<Element>>(this.data, this.params.element);
            }

            // Falls ein elementHandle vorhanden ist, nutze es
            if (elementHandle) {
                if (this.params.selector) {
                    const selectorElementHandle = await elementHandle.waitForSelector(this.params.selector, { timeout });
                    if (!selectorElementHandle) {
                        if (optional) {
                            this.logger.warn(`⚠️ Optional element not found: ${this.params.selector}`);
                            return false;
                        }
                        throw new Error(`Element not found: ${this.params.selector}`);
                    }
                    await selectorElementHandle.click();
                } else {
                    await elementHandle.click();
                }
            } else {
                // Falls kein elementHandle vorhanden ist, klicke direkt auf den Selector auf der Seite
                const selectorElementHandle = await this.page.waitForSelector(this.params.selector, { timeout });
                if (!selectorElementHandle) {
                    if (optional) {
                        this.logger.warn(`⚠️ Optional element not found: ${this.params.selector}`);
                        return false;
                    }
                    throw new Error(`Element not found: ${this.params.selector}`);
                }
                await selectorElementHandle.click();
            }
            this.logger.debug(`✅ Click completed`);
            return true;
        } catch (error) {
            if (optional) {
                this.logger.warn(`⚠️ Optional click failed: ${target}`);
                return false;
            }
            throw error;
        }
    }
}

export default ClickAction;
