import { compile } from 'handlebars';
import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';

@Action('storeData')
export class StoreDataAction extends BaseAction<{ key: string; value: string }> {

    async run(): Promise<void> {
        const keyTemplate = compile(this.params.key);
        const valueTemplate = compile(this.params.value);

        // Ersetze die Templates mit den aktuellen Werten aus `previousData`
        const key = keyTemplate({ previousData: this.previousData });
        const value = valueTemplate({ previousData: this.previousData });

        // Lade bestehende Daten
        // const existingData = StoreDataAction.loadStoredData();

        // Speichere die neuen Werte
        this.storedData[key] = value;

        this.logger.log(`Stored data: ${key} = ${value}`);
    }

    // /**
    //  * Lädt die gespeicherten Daten aus der JSON-Datei.
    //  */
    // private static loadStoredData(): Record<string, any> {
    //     if (!fs.existsSync(StoreDataAction.storageFilePath)) {
    //         return {};
    //     }
    //     const fileContent = fs.readFileSync(StoreDataAction.storageFilePath, 'utf-8');
    //     return JSON.parse(fileContent);
    // }
}
