import { Page } from "puppeteer";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { Action } from "../_decorators/action.decorator";

export type NavigateActionParams = {
    url: string;
}

@Action('navigate', {
    displayName: 'Navigate',
    icon: 'Globe',
    description: 'Navigate to a URL in the browser',
    color: 'blue',
    category: 'navigation'
})
export class NavigateAction extends BaseAction<NavigateActionParams> {

    async run(): Promise<void> {
        this.logger.log(`🌐 Navigating to: ${this.params.url}`);

        if (!this.page) {
            throw new Error('Page is not initialized');
        }

        await this.page.goto(this.params.url, { waitUntil: 'networkidle2' });
        this.logger.log(`✅ Navigation completed`);
    }
}

export default NavigateAction;
