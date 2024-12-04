import { compile } from 'handlebars';
import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';

@Action('break')
export class BreakAction extends BaseAction<{ condition: string }> {
    async run(): Promise<void> {
        this.logger.log(`Evaluating break condition: ${this.params.condition}`);

        // Kompiliere die Bedingung als Handlebars-Template
        const conditionTemplate = compile(this.params.condition);

        // Ersetze Variablen in der Bedingung
        const condition = conditionTemplate({
            previousData: this.previousData,
            currentData: this.data?.currentData,
            storedData: this.storedData,
        });

        this.logger.log(`Evaluated condition: ${condition}`);

        // Evaluiere die Bedingung (True/Falsy-Wert)
        if (this.evaluateCondition(condition)) {
            this.logger.warn(`Break condition met: ${this.params.condition}`);
            throw new Error('BreakLoop'); // Spezielle Ausnahme, um den Loop zu beenden
        }
    }

    /**
     * Evaluiert die aufgelöste Bedingung sicher.
     * Handelt sich um einen boolean-Ausdruck (z. B. "true", "false").
     */
    private evaluateCondition(condition: string): boolean {
        try {
            // Sicherstellen, dass nur logische Werte evaluiert werden
            return JSON.parse(condition.toLowerCase());
        } catch {
            this.logger.error(`Invalid break condition: ${condition}`);
            return false;
        }
    }
}
