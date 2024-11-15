import { BaseAction } from "./bases/base.action";
import { Action } from "../_decorators/action.decorator";
import { PreviousData } from "../types/previous-data.type";

// Typdefinition für die Parameter der StoreDataAction
export type StoreDataActionParams = {
    data: { [key: string]: any }; // Ein Objekt mit mehreren Schlüssel-Wert-Paaren
}

@Action('storeData')
export class StoreDataAction extends BaseAction<StoreDataActionParams> {
    async run(): Promise<void> {

        if (typeof this.params.data !== 'object' || this.params.data === null) {
            throw new Error("Invalid data provided for StoreDataAction. Expected an object.");
        }

        // Speichere alle Schlüssel-Wert-Paare in this.data.currentData
        Object.entries(this.params.data).forEach(([key, value]) => {
            if (!key || key.trim() === "") {
                this.logger.warn(`Skipped storing data for an invalid key: "${key}"`);
                return;
            }
            this.storedData[key] = value ;
            this.logger.log(`📦 Stored data under key: ${key}`);
        });
    }
}

export default StoreDataAction;
