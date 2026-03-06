import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';

export type DelayActionParams = {
  time: number;
  condition?: string;
};

@Action('delay', {
  displayName: 'Delay',
  icon: 'Clock',
  description: 'Wait for a specified amount of time',
  color: 'gray',
  category: 'utility',
})
export class Delay extends BaseAction<DelayActionParams> {
  async run(): Promise<void> {
    if (this.params.condition !== undefined) {
      const conditionMet = this.params.condition === 'true';

      if (!conditionMet) {
        this.logger.log(
          `Skipping delay: condition not met (${this.params.condition})`,
        );
        return;
      }
      this.logger.debug(`Condition met: ${this.params.condition}`);
    }

    if (isNaN(this.params.time)) {
      throw new Error('Invalid time value');
    }

    this.logger.log(`Delaying for ${this.params.time}ms`);
    await new Promise((resolve) => setTimeout(resolve, this.params.time));
    this.logger.log('Delay completed');
  }
}
