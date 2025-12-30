import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { lastValueFrom, timer } from "rxjs";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { Action } from "../_decorators/action.decorator";

@Action('delay', {
    displayName: 'Delay',
    icon: 'Clock',
    description: 'Wait for a specified amount of time',
    color: 'gray',
    category: 'utility'
})
export class Delay extends BaseAction<{ time: number; condition?: string }> {

    // Die `params`-Eigenschaft ist jetzt typisiert
    async run(): Promise<void> {
        // Prüfe optionale Bedingung
        if (this.params.condition !== undefined) {
            const conditionMet = this.params.condition === 'true';

            if (!conditionMet) {
                this.logger.log(`⏭️ Skipping delay: condition not met (${this.params.condition})`);
                return;
            }
            this.logger.debug(`✓ Condition met: ${this.params.condition}`);
        }

        if (isNaN(this.params.time)) {
            throw new Error('Invalid time value');
        }

        this.logger.log(`Delaying for ${this.params.time}ms`);
        await lastValueFrom(timer(this.params.time))
        this.logger.log('Delayed');

        return;
    }
}