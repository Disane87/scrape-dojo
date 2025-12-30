import { compile } from 'handlebars';
import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';

@Action('break', {
    displayName: 'Break',
    icon: 'CircleStop',
    description: 'Break out of the current loop',
    color: 'red',
    category: 'flow'
})
export class BreakAction extends BaseAction<{ condition: string }> {
    async run(): Promise<void> {
        this.logger.log(`Evaluating break condition: ${this.params.condition}`);

        // Kompiliere die Bedingung als Handlebars-Template
        // const conditionTemplate = compile(this.params.condition);

        // Ersetze Variablen in der Bedingung
        const conditionData = {
            previousData: Object.fromEntries(this.previousData),
            currentData: this.data?.currentData,
            storedData: this.storedData,
        };

        // this.logger.log(`Break condition: ${this.params.condition}`);

        // Evaluiere die Bedingung (True/Falsy-Wert)
        if (await this.evaluateCondition(this.params.condition, conditionData)) {
            this.logger.warn(`Break condition met: ${this.params.condition}`);
            throw new Error('BreakLoop'); // Spezielle Ausnahme, um den Loop zu beenden
        }
    }

    private async evaluateCondition(condition: string, data: object): Promise<boolean> {
        // Wende den JSONata-Ausdruck an
        try {
            const jsonata = require('jsonata');
            const expression = jsonata(condition);
            const expressionResult = await expression.evaluate(data) as boolean;

            this.logger.log(`Should break ${expressionResult}`);
            return expressionResult;
        } catch (error) {
            this.logger.error(`Error during data transformation: ${error.message}`);
            throw error;
        }
    }
}
