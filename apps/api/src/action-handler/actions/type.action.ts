import { Page } from "puppeteer";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { Action } from "../_decorators/action.decorator";

export type TypeActionParams = {
    selector: string;
    text: string;
    pressEnter: boolean;
    /** Optional: Bedingung die erfüllt sein muss damit getippt wird (Handlebars-Template, z.B. "{{isDefined previousData.emailField}}") */
    condition?: string;
}

@Action('type', {
    displayName: 'Type',
    icon: 'Keyboard',
    description: 'Type text into an input field',
    color: 'pink',
    category: 'interaction'
})
export class TypeAction extends BaseAction<TypeActionParams> {
    async run(): Promise<void> {
        // Prüfe optionale Bedingung
        if (this.params.condition !== undefined) {
            // Condition ist bereits durch Handlebars aufgelöst (z.B. "true" oder "false")
            const conditionMet = this.params.condition === 'true';

            if (!conditionMet) {
                this.logger.log(`⏭️ Skipping type action: condition not met (${this.params.condition})`);
                return;
            }
            this.logger.debug(`✓ Condition met: ${this.params.condition}`);
        }

        // Maskiere sensible Daten im Log
        const maskedText = this.params.selector.includes('password') ? '********' : this.params.text;
        this.logger.log(`⌨️ Typing into: ${this.params.selector}`);
        this.logger.debug(`📝 Text: "${maskedText}"`);

        await this.page.type(this.params.selector, this.params.text);
        if (this.params.pressEnter) {
            this.logger.debug(`↵ Pressing Enter`);
            await this.page.keyboard.press('Enter');
            await this.page.waitForNavigation();
        }
    }
}

export default TypeAction;
