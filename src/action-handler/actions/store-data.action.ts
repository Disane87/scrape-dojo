import { Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { compile } from 'handlebars';
import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';

@Action('storeData')
export class StoreDataAction extends BaseAction<{ key: string; value: string }> {
    private static storageFilePath = path.join(process.cwd(), 'config', 'stored-data.json');

    async run(): Promise<void> {
        const keyTemplate = compile(this.params.key);
        const valueTemplate = compile(this.params.value);

        // Ersetze die Templates mit den aktuellen Werten aus `previousData`
        const key = keyTemplate({ previousData: this.previousData });
        const value = valueTemplate({ previousData: this.previousData });

        // Lade bestehende Daten
        const existingData = StoreDataAction.loadStoredData();

        // Speichere die neuen Werte
        existingData[key] = value;

        // Schreibe die aktualisierten Daten zurück
        fs.writeFileSync(StoreDataAction.storageFilePath, JSON.stringify(existingData, null, 2));

        this.logger.log(`Stored data: ${key} = ${value}`);
    }

    /**
     * Lädt die gespeicherten Daten aus der JSON-Datei.
     */
    private static loadStoredData(): Record<string, any> {
        if (!fs.existsSync(StoreDataAction.storageFilePath)) {
            return {};
        }
        const fileContent = fs.readFileSync(StoreDataAction.storageFilePath, 'utf-8');
        return JSON.parse(fileContent);
    }
}
