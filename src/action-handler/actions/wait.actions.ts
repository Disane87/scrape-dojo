import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { Action } from "../decorators/action.decorator";
import { timer } from "rxjs";
import { BaseAction } from "./bases/base.action";

@Action('wait')
export class WaitAction extends BaseAction<{ time: number }> {
    constructor(page: Page) {
        super(page);
        this.logger.log('WaitAction created');
    }

    // Die `params`-Eigenschaft ist jetzt typisiert
    async run() {
        const { time } = this.params;
        if (isNaN(time)) {
            throw new Error('Invalid time value');
        }
        
        await timer(time).toPromise()

        return;
    }
}