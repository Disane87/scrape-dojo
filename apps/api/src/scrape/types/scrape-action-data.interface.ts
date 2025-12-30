import { ScrapeEventsService } from '../scrape-events.service';
import { DatabaseService } from '../../database/database.service';

/** Metadata for notification icons */
export interface ScrapeMetadataForNotify {
    icon?: string;
    description?: string;
}

// Definiere den Typ für data
export type ScrapeActionData = {
    currentData: CurrentData;
    storedData: StoredData;
    scrapeEventsService?: ScrapeEventsService;
    databaseService?: DatabaseService;
    scrapeId?: string;
    runId?: string; // Eindeutige ID für jeden Scrape-Lauf
    skipCurrentIteration?: boolean; // Flag für skipIf Action um Loop-Iteration zu überspringen
    /** Pfad für verschachtelte Loops - wird für Events und Tracking verwendet */
    loopPath?: Array<{ name: string; index: number }>;
    /** Scrape metadata (for notify action to get job icon) */
    metadata?: ScrapeMetadataForNotify;
    /** Runtime variables die DB-Variablen überschreiben */
    runVariables?: Record<string, any>;
};

// Definiere den Typ für currentData
type CurrentData = {
    [key: string]: any; // Ein generisches Objekt, das beliebige Schlüssel und Werte erlaubt
};

// Definiere den Typ für currentData
type StoredData = {
    [key: string]: any; // Ein generisches Objekt, das beliebige Schlüssel und Werte erlaubt
};