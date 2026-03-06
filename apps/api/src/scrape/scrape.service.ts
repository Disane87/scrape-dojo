import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PuppeteerService } from '../puppeteer/puppeteer.service';
import { Scrape } from './types/scrape.interface';
import { ScrapeEventsService } from './scrape-events.service';
import { RunTrigger } from '../database/entities';
import { VariablesService } from '../variables/variables.service';
import { ScrapeConfigService } from './services/scrape-config.service';
import { ScrapeVariablesSyncService } from './services/scrape-variables-sync.service';
import { ScrapeSecretsResolverService } from './services/scrape-secrets-resolver.service';
import { ScrapeExecutionService } from './services/scrape-execution.service';
import { ScrapeDataService } from './services/scrape-data.service';
import { ScrapeValidationService } from './services/scrape-validation.service';

@Injectable()
export class ScrapeService implements OnModuleInit, OnModuleDestroy {
  private initializingScrapeDefinitions = false;
  private readonly logger = new Logger(ScrapeService.name);
  private scrapeDefinitions: Scrape[] = [];
  private sitesWatcher: fs.FSWatcher | null = null;
  private readonly configDirectory = path.join(process.cwd(), 'config');

  constructor(
    private readonly puppeteerService: PuppeteerService,
    private readonly scrapeEventsService: ScrapeEventsService,
    private readonly variablesService: VariablesService,
    private readonly configService: ScrapeConfigService,
    private readonly variablesSyncService: ScrapeVariablesSyncService,
    private readonly secretsResolverService: ScrapeSecretsResolverService,
    private readonly executionService: ScrapeExecutionService,
    private readonly dataService: ScrapeDataService,
    private readonly validationService: ScrapeValidationService,
  ) {}

  getScrapeDefinitions(): Scrape[] {
    // Return cached definitions if available, otherwise load fresh
    if (this.scrapeDefinitions.length > 0) {
      return this.scrapeDefinitions;
    }

    this.scrapeDefinitions = this.configService.loadScrapeDefinitions();
    return this.scrapeDefinitions;
  }

  /**
   * Reloads all scrape definitions from disk and re-syncs variables/secrets.
   * Useful when file watching misses events (e.g. on Windows) or when running in containers.
   */
  async reloadScrapeDefinitions(): Promise<void> {
    this.logger.log(
      '🔄 Manual reload requested: reloading scrape definitions...',
    );
    this.scrapeDefinitions = [];
    await this.initializeScrapeDefinitions();

    this.scrapeEventsService.emit({
      type: 'config-reload',
      scrapeId: '__system__',
      message: 'Scrape configuration files have been reloaded',
    });
  }

  onModuleInit() {
    this.logger.debug(`🫚 Root directory ${process.cwd()}`);
    this.ensureConfigDirectories();
    this.initializeScrapeDefinitions().catch((err) =>
      this.logger.error(
        `Failed to initialize scrape definitions: ${err.message}`,
      ),
    );
    this.setupFileWatchers();
  }

  onModuleDestroy() {
    if (this.sitesWatcher) {
      this.sitesWatcher.close();
      this.logger.debug('🔴 Sites directory watcher closed');
    }
  }

  /**
   * Führt einen Scrape aus
   */
  async scrape(
    scrapeId: string | null,
    runId?: string,
    variables?: Record<string, any>,
    trigger: RunTrigger = 'manual',
  ) {
    this.scrapeDefinitions = this.getScrapeDefinitions();

    for (const scrape of this.scrapeDefinitions) {
      if (scrapeId && scrape.id !== scrapeId) {
        continue;
      }

      await this.validationService.validateScrape(scrape, trigger);

      const currentRunId = this.generateRunId(runId);
      const previousData = await this.preparePreviousData(scrape, variables);

      this.logScrapeStart(scrape, currentRunId, variables);

      try {
        const { storedData, isFirstRun } =
          await this.dataService.getStoredDataFromDB(scrape.id);
        previousData.set('firstRun', isFirstRun);

        const result = await this.executionService.executeScrape(
          scrape,
          currentRunId,
          previousData,
          storedData,
          variables,
        );

        if (result.aborted) {
          return result;
        }
      } catch (error) {
        throw error;
      }
    }

    return {
      success: true,
      scrapeId: scrapeId,
      result: this.dataService.convertScrapeResultsToJson(),
    };
  }

  /**
   * Stoppt den laufenden Scrape und schließt alle Pages
   */
  async stopScrape(): Promise<{ stopped: boolean; message: string }> {
    this.logger.warn('🛑 Stop requested - aborting scrape...');
    this.puppeteerService.abort();
    await this.puppeteerService.closeBrowser();

    return {
      stopped: true,
      message: 'Scrape stopped and browser closed',
    };
  }

  /**
   * Erstellt Config-Verzeichnisse falls sie nicht existieren
   */
  private ensureConfigDirectories(): void {
    if (!fs.existsSync(this.configDirectory)) {
      fs.mkdirSync(this.configDirectory, { recursive: true });
      this.logger.debug('📂 Config directory created successfully.');
    } else {
      this.logger.debug('📁 Config directory already exists.');
    }

    this.configService.ensureSitesDirectory();
  }

  /**
   * Initialisiert Scrape-Definitionen und synchronisiert Variablen
   */
  private async initializeScrapeDefinitions(): Promise<void> {
    if (this.initializingScrapeDefinitions) {
      this.logger.warn(
        '⏳ Scrape definitions initialization already running, skipping parallel execution.',
      );
      return;
    }

    this.initializingScrapeDefinitions = true;

    try {
      const scrapes = this.getScrapeDefinitions();
      this.scrapeDefinitions = scrapes;
      this.logger.log(`🚀 Scrape definitions initialized`);

      await this.variablesSyncService.syncWorkflowVariables(scrapes);
      await this.variablesSyncService.syncWorkflowSecrets(scrapes);
    } catch (error) {
      this.logger.error(
        `Failed to initialize scrape definitions: ${error.message}`,
      );
    } finally {
      this.initializingScrapeDefinitions = false;
    }
  }

  /**
   * File-Watcher für automatisches Reload bei Konfigurationsänderungen
   */
  private setupFileWatchers(): void {
    try {
      const sitesPath = this.configService.getSitesPath();

      if (fs.existsSync(sitesPath)) {
        this.sitesWatcher = fs.watch(
          sitesPath,
          { recursive: false },
          (eventType, filename) => {
            if (
              filename &&
              (filename.endsWith('.json') || filename.endsWith('.jsonc'))
            ) {
              this.logger.log(
                `📝 Site config changed: ${filename} (${eventType})`,
              );
              this.notifyConfigChange();
            }
          },
        );
        this.logger.log(`👁️ Watching sites directory: ${sitesPath}`);
      }
    } catch (error) {
      this.logger.warn(`⚠️ Failed to setup file watchers: ${error.message}`);
    }
  }

  /**
   * Benachrichtigt Frontend über Konfigurations-Änderungen
   */
  private notifyConfigChange(): void {
    this.logger.log('🔄 Sending reload event to clients...');

    // Cache leeren damit neu geladen wird
    this.scrapeDefinitions = [];

    this.initializeScrapeDefinitions();

    this.scrapeEventsService.emit({
      type: 'config-reload',
      scrapeId: '__system__',
      message: 'Scrape configuration files have been updated',
    });
  }

  /**
   * Generiert eine eindeutige Run-ID
   */
  private generateRunId(runId?: string): string {
    return (
      runId || `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
  }

  /**
   * Bereitet previousData Map mit Variablen vor
   */
  private async preparePreviousData(
    scrape: Scrape,
    variables?: Record<string, any>,
  ): Promise<Map<string, any>> {
    const previousData = new Map<string, any>();

    // Runtime-Variablen laden
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        previousData.set(`var_${key}`, value);
      }
      this.logger.debug(
        `📥 Variables loaded: ${Object.keys(variables).join(', ')}`,
      );
    }

    // DB-Variablen laden
    const dbVariablesMap = await this.variablesService.getAsMap(scrape.id);
    for (const [key, value] of Object.entries(dbVariablesMap)) {
      const varKey = `var_${key}`;
      // Runtime-Variablen haben Vorrang
      if (!previousData.has(varKey)) {
        previousData.set(varKey, value);
      }
    }

    // Secrets auflösen
    await this.secretsResolverService.resolveSecretsForWorkflow(
      scrape,
      previousData,
    );

    return previousData;
  }

  /**
   * Loggt Scrape-Start-Informationen
   */
  private logScrapeStart(
    scrape: Scrape,
    runId: string,
    variables?: Record<string, any>,
  ): void {
    if (variables && Object.keys(variables).length > 0) {
      this.logger.log(
        `📝 Run-time variables received: ${JSON.stringify(variables)}`,
      );
    }
    this.logger.debug(`Scrape definition: ${JSON.stringify(scrape)}`);
    this.logger.log(`Scrape ID: ${scrape.id}, Run ID: ${runId}`);
  }
}
