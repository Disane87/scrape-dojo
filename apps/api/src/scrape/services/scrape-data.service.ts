import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ScrapeDataService {
  private readonly logger = new Logger(ScrapeDataService.name);
  private scrapeResults: Map<string, Map<string, Map<string, any>>> = new Map();

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Lädt die persistierten Job-Level Daten aus der DB für einen Scrape
   */
  async getStoredDataFromDB(
    scrapeId: string,
  ): Promise<{ storedData: any; isFirstRun: boolean }> {
    try {
      const jobData = await this.databaseService.getJobData(scrapeId);

      if (jobData.length === 0) {
        return { storedData: {}, isFirstRun: true };
      }

      const storedData = this.convertJobDataToNestedObject(jobData);
      return { storedData, isFirstRun: false };
    } catch (error) {
      this.logger.warn(
        `⚠️ Failed to load stored data from DB: ${error.message}`,
      );
      return { storedData: {}, isFirstRun: true };
    }
  }

  /**
   * Konvertiert flache Job-Data zu verschachteltem Objekt
   * z.B. key "amazon.lastOrderId" wird zu { amazon: { lastOrderId: "..." } }
   */
  private convertJobDataToNestedObject(jobData: any[]): any {
    const storedData: any = {};

    for (const data of jobData) {
      const keys = data.key.split('.');
      let current = storedData;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = data.value;
    }

    return storedData;
  }

  /**
   * Legacy: Lade aus JSON-Datei (Fallback für Migration)
   */
  getStoredDataFromFile(): { storedData: any; isFirstRun: boolean } {
    const filePath = path.join(process.cwd(), 'config', 'stored-data.json');

    if (!fs.existsSync(filePath)) {
      return { storedData: {}, isFirstRun: true };
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parsedData = JSON.parse(fileContent);
    const isFirstRun = Object.keys(parsedData).length === 0;

    return { storedData: parsedData, isFirstRun };
  }

  /**
   * Konvertiert Scrape-Results zu JSON
   */
  convertScrapeResultsToJson(): any {
    const result: any = {};

    for (const [scrapeName, steps] of this.scrapeResults) {
      result[scrapeName] = {};

      for (const [stepName, actions] of steps) {
        result[scrapeName][stepName] = {};

        for (const [actionName, returnValue] of actions) {
          result[scrapeName][stepName][actionName] = returnValue;
        }
      }
    }

    return result;
  }

  /**
   * Setzt Scrape-Results für einen Scrape
   */
  setScrapeResult(
    scrapeId: string,
    stepMap: Map<string, Map<string, any>>,
  ): void {
    this.scrapeResults.set(scrapeId, stepMap);
  }

  /**
   * Löscht alle Scrape-Results
   */
  clearScrapeResults(): void {
    this.scrapeResults.clear();
  }
}
