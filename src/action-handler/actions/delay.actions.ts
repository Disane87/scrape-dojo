import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { Action } from "../decorators/action.decorator";
import { lastValueFrom, timer } from "rxjs";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";

@Action('delay')
export class Delay extends BaseAction<{ time: number }> {

    // Die `params`-Eigenschaft ist jetzt typisiert
    async run(previousData: PreviousData): Promise<void> {
        if (isNaN(this.params.time)) {
            throw new Error('Invalid time value');
        }

        this.logger.log(`Delaying for ${this.params.time}ms`);        
        await lastValueFrom(timer(this.params.time))
        this.logger.log('Delayed');

        return;
    }
}