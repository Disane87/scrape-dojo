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
};

@Action('storeData', {
  displayName: 'Store Data',
  icon: 'Database',
  description: 'Store data persistently in database',
  color: 'sky',
  category: 'data',
})
export class StoreDataAction extends BaseAction<StoreDataParams> {
  async run(): Promise<void> {
    const { key, value, persist = false, attachToRun } = this.params;

    // Speichere die neuen Werte im Runtime-Speicher (für Template-Zugriff in diesem Run).
    //
    // Der Wert muss GENAUSO abgelegt werden, wie er beim Laden aus der DB
    // aufgebaut wird — dort zerlegt convertJobDataToNestedObject() den Key am
    // Punkt in ein verschachteltes Objekt. Eine rein flache Ablage unter
    // "amazon.downloadedInvoices" ist für Handlebars unsichtbar:
    // {{storedData.amazon.downloadedInvoices}} löst als Pfad auf und findet
    // den flachen Key nicht — der Ausdruck liefert dann einen leeren String.
    //
    // Folge vor diesem Fix: Ein im selben Run gespeicherter Wert war für alle
    // folgenden Actions unsichtbar. Erst der nächste Run sah ihn, weil er den
    // Umweg über die DB nahm. Wer damit eine Liste fortschreibt, bekommt pro
    // Run genau EINEN neuen Eintrag statt einen pro Schleifendurchlauf.
    this.setNested(key, value);
    // Zusätzlich flach ablegen — Konfigurationen, die den Key mit Punkt als
    // ganzes lesen, funktionieren damit unverändert weiter.
    this.storedData[key] = value;

    this.logger.log(`💾 Stored: ${key} = ${value}`);

    // Persistiere in DB wenn gewünscht
    const databaseService = this.data?.databaseService;
    if (!databaseService) {
      this.logger.warn(
        '⚠️ DatabaseService not available - skipping persistence',
      );
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
        this.logger.debug(
          `📁 Stored as Run-Level data: ${scrapeId}.${key} (run: ${runId})`,
        );
      }
    } catch (error) {
      this.logger.error(`❌ Failed to persist data: ${error.message}`);
    }
  }

  /**
   * Legt einen Punkt-Key als verschachteltes Objekt ab — spiegelbildlich zu
   * convertJobDataToNestedObject() in ScrapeDataService, das die Daten beim
   * Laden aus der DB genauso aufbaut.
   *
   * "a.b.c" → storedData.a.b.c
   *
   * Ein bestehender Nicht-Objekt-Wert auf dem Weg wird ersetzt, sonst würde
   * ein früher gespeichertes "a" das Anlegen von "a.b" verhindern.
   */
  private setNested(key: string, value: unknown): void {
    const teile = key.split('.');
    if (teile.length === 1) {
      this.storedData[key] = value;
      return;
    }

    let ziel: Record<string, any> = this.storedData;
    for (let i = 0; i < teile.length - 1; i++) {
      const t = teile[i];
      if (typeof ziel[t] !== 'object' || ziel[t] === null) {
        ziel[t] = {};
      }
      ziel = ziel[t];
    }
    ziel[teile[teile.length - 1]] = value;
  }
}
