import { PuppeteerLifeCycleEvent } from "puppeteer";
import { BaseAction } from "./bases/base.action";
import { Action } from "../_decorators/action.decorator";

export type NavigateActionParams = {
    url: string;
    waitUntil?: PuppeteerLifeCycleEvent;
    timeout?: number;
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

        const waitUntil = this.params.waitUntil ?? 'domcontentloaded';
        const timeout = this.params.timeout ?? 30000;

        try {
            await this.page.goto(this.params.url, { waitUntil, timeout });
        } catch (error) {
            if (error.message?.includes('frame was detached') || error.message?.includes('Navigating frame')) {
                this.logger.warn(`⚠️ Frame detached during navigation, retrying...`);
                await this.page.goto(this.params.url, { waitUntil: 'domcontentloaded', timeout });
            } else {
                throw error;
            }
        }
        this.logger.log(`✅ Navigation completed`);
    }
}

export default NavigateAction;
