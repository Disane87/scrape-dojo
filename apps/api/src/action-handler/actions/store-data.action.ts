import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';

export type StoreDataParams = {
    key: string;
    value: string;
    /** 
     * Wenn true, wird der Wert in der DB persistiert (Job-Level).
     * Job-Level Daten bleiben über alle Runs hinweg erhalten.
     */
    persist?: boolean;
    /**
     * Wenn true, werden die Daten dem aktuellen Run zugeordnet (Run-Level).
     * Run-Level Daten können in der Run-Detail-Ansicht visualisiert werden.
     * Default: true (wenn persist=true ist, wird es auf false gesetzt)
     */
    attachToRun?: boolean;
}

@Action('storeData', {
    displayName: 'Store Data',
    icon: 'Database',
    description: 'Store data persistently in database',
    color: 'sky',
    category: 'data'
})
export class StoreDataAction extends BaseAction<StoreDataParams> {

    async run(): Promise<void> {
        const { key, value, persist = false, attachToRun } = this.params;

        // Speichere die neuen Werte im Runtime-Speicher (für Template-Zugriff in diesem Run)
        this.storedData[key] = value;

        this.logger.log(`💾 Stored: ${key} = ${value}`);

        // Persistiere in DB wenn gewünscht
        const databaseService = this.data?.databaseService;
        if (!databaseService) {
            this.logger.warn('⚠️ DatabaseService not available - skipping persistence');
            return;
        }

        const scrapeId = this.data?.scrapeId;
        if (!scrapeId) {
            this.logger.warn('⚠️ ScrapeId not available - skipping persistence');
            return;
        }

        // Bestimme ob Job-Level oder Run-Level
        // persist=true → IMMER Job-Level (ohne runId), auch wenn attachToRun=true
        // persist=false → attachToRun=true (default) → Run-Level (mit runId)
        const shouldAttachToRun = persist ? false : (attachToRun ?? true);
        const runId = shouldAttachToRun ? this.data?.runId : undefined;

        try {
            await databaseService.storeData(scrapeId, key, value, runId);

            if (persist && !shouldAttachToRun) {
                this.logger.debug(`📁 Persisted as Job-Level data: ${scrapeId}.${key}`);
            } else {
                this.logger.debug(`📁 Stored as Run-Level data: ${scrapeId}.${key} (run: ${runId})`);
            }
        } catch (error) {
            this.logger.error(`❌ Failed to persist data: ${error.message}`);
        }
    }
}
