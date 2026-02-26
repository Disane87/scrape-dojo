import { BaseAction } from "./bases/base.action";
import { Action } from "../_decorators/action.decorator";

// Typdefinition für die Parameter der TransformAction
export type TransformActionParams = {
    expression: string; // JSONata-Ausdruck zur Transformation der Daten
    previousDataKey?: string; // Schlüssel, um die vorherigen Daten aus actionMap zu holen ($ = dieser Wert)
    data?: Record<string, string>; // Optionale zusätzliche Daten als Key-Value (Werte können Handlebars sein)
    /** Keys aus previousData die direkt (ohne Handlebars-Konvertierung) übergeben werden sollen */
    previousDataKeys?: string[];
}

@Action('transform', {
    displayName: 'Transform',
    icon: 'Zap',
    description: 'Transform data using JSONata expressions',
    color: 'violet',
    category: 'data'
})
export class TransformAction extends BaseAction<TransformActionParams> {

    async run(): Promise<unknown> {
        if (!this.params.expression) {
            throw new Error('Missing required parameter: expression');
        }

        // Bestimme die Input-Daten für die JSONata-Expression
        let inputData: unknown;

        if (this.params.previousDataKey) {
            // Wenn previousDataKey angegeben, wird dessen Wert direkt als $ (Root) verwendet
            inputData = this.previousData.get(this.params.previousDataKey);
            this.logger.debug(`Using previousDataKey "${this.params.previousDataKey}" as root: ${JSON.stringify(inputData)}`);
        } else if (this.params.previousDataKeys) {
            // Wenn previousDataKeys angegeben, baue ein Objekt mit den originalen Werten (keine String-Konvertierung!)
            const dataObj: Record<string, unknown> = {};
            for (const key of this.params.previousDataKeys) {
                dataObj[key] = this.previousData.get(key);
            }
            inputData = dataObj;
            this.logger.debug(`Using previousDataKeys as root: ${JSON.stringify(inputData)}`);
        } else if (this.params.data) {
            // Wenn data angegeben, wird das Objekt als Root verwendet
            inputData = this.params.data;
            this.logger.debug(`Using data object as root: ${JSON.stringify(inputData)}`);
        } else {
            // Standardmäßig alle previousData als Root verwenden
            const previousDataObject = Object.fromEntries(this.previousData);
            
            // Erstelle konsistenten Context wie bei Handlebars
            inputData = {
                ...previousDataObject,  // Alle Felder direkt verfügbar
                previousData: previousDataObject,  // Auch als previousData.xyz verfügbar (Konsistenz mit Handlebars)
            };
            this.logger.debug(`Using all previousData as root (${this.previousData.size} entries)`);
        }

        // Füge currentData zum Input-Context hinzu (z.B. für Loop-Variablen)
        if (this.data && typeof this.data === 'object' && 'currentData' in this.data) {
            const currentData = (this.data as any).currentData;
            if (currentData && Object.keys(currentData).length > 0 && 
                typeof inputData === 'object' && inputData !== null && !Array.isArray(inputData)) {
                (inputData as Record<string, unknown>).currentData = currentData;
                this.logger.debug(`Added currentData to context: ${JSON.stringify(currentData)}`);
            }
        }

        // Wende den JSONata-Ausdruck an
        try {
            const jsonata = require('jsonata');
            const expression = jsonata(this.params.expression);
            
            // Binde Variablen als JSONata-Bindings
            if (this.variables && Object.keys(this.variables).length > 0) {
                for (const [key, value] of Object.entries(this.variables)) {
                    expression.assign(key, value);
                }
            }

            const transformedData = await expression.evaluate(inputData);
            return transformedData;
        } catch (error) {
            this.logger.error(`Error during data transformation: ${error.message}`);
            throw error;
        }
    }
}

export default TransformAction;
