import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';

export type WaitActionParams = {
  selector: string;
  timeout?: number;
  optional?: boolean;
  /** Optional: Bedingung die erfüllt sein muss damit gewartet wird (Handlebars-Template) */
  condition?: string;
};

@Action('waitForSelector', {
  displayName: 'Wait for Selector',
  icon: 'Hourglass',
  description: 'Wait until an element appears on the page',
  color: 'yellow',
  category: 'flow',
})
export class WaitForSelectorAction extends BaseAction<WaitActionParams> {
  async run(): Promise<boolean> {
    // Prüfe optionale Bedingung
    if (this.params.condition !== undefined) {
      const conditionMet = this.params.condition === 'true';

      if (!conditionMet) {
        this.logger.log(
          `⏭️ Skipping wait: condition not met (${this.params.condition})`,
        );
        return false;
      }
      this.logger.debug(`✓ Condition met: ${this.params.condition}`);
    }

    const timeout = this.params.timeout || 30000;
    const optional = this.params.optional || false;

    this.logger.log(
      `⏳ Waiting for: ${this.params.selector} (timeout: ${timeout}ms, optional: ${optional})`,
    );

    try {
      await this.page.waitForSelector(this.params.selector, { timeout });
      this.logger.debug(`✅ Element found`);
      return true;
    } catch (error) {
      if (optional) {
        this.logger.warn(
          `⚠️ Optional element not found: ${this.params.selector}`,
        );
        return false;
      }
      throw error;
    }
  }
}

export default WaitForSelectorAction;
