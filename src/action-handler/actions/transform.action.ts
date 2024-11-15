import { BaseAction } from "./bases/base.action";
import { Action } from "../_decorators/action.decorator";
import { PreviousData } from "../types/previous-data.type";

// Typdefinition für die Parameter der TransformAction
export type TransformActionParams = {
    expression: string; // JSONata-Ausdruck zur Transformation der Daten
    previousDataKey: string; // Schlüssel, um die vorherigen Daten aus actionMap zu holen
}

@Action('transform')
export class TransformAction extends BaseAction<TransformActionParams> {

    async run(): Promise<void> {
        // Überprüfe, ob der Schlüssel vorhanden ist
        if (!this.params.previousDataKey) {
            throw new Error('Missing required parameter: previousDataKey');
        }

        if(!this.params.expression) {
            throw new Error('Missing required parameter: expression');
        }

        const data = { 
            [this.params.previousDataKey]: this.previousData.get(this.params.previousDataKey)
        }

        // Wende den JSONata-Ausdruck an
        try {
            const jsonata = require('jsonata');
            const expression = jsonata(this.params.expression);
            const transformedData = await expression.evaluate(data);

            this.logger.log(`Transformed data: ${JSON.stringify(transformedData)}`);
            return transformedData;
        } catch (error) {
            this.logger.error(`Error during data transformation: ${error.message}`);
            throw error;
        }
    }
}

export default TransformAction;
