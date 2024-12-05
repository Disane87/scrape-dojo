import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PuppeteerService } from 'src/puppeteer/puppeteer.service';
import { Scrape, Scrapes } from './types/scrape.interface';
import { ActionHandlerService } from 'src/action-handler/action-handler.service';
import { parse } from 'comment-json';

@Injectable()
export class ScrapeService implements OnModuleInit {
    private readonly logger = new Logger(ScrapeService.name);
    private scrapeDefinitions: Array<Scrape> = [];
    private scrapeResults: Map<string, Map<string, Map<string, any>>> = new Map();

    constructor(private actionsHandlerService: ActionHandlerService, private puppeteerService: PuppeteerService) { }

    getScrapeDefinitions(): Array<Scrape> {
        const rootDirectory = process.cwd();
        const filePath = path.join(rootDirectory, 'config', 'scrapes.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        const scrapeDefinitions = parse(fileContent, null, true);

        return (scrapeDefinitions as unknown as Scrapes).scrapes;
    }

    onModuleInit() {
        const rootDirectory = process.cwd();
        this.logger.debug(`🫚 Root directory ${rootDirectory}`);

        const directoryPath = path.join(rootDirectory, 'config');
        const filePath = path.join(directoryPath, 'scrapes.json');

        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
            this.logger.debug('📂 Config directory created successfully.');
        } else {
            this.logger.debug('📁 Config directory already exists.');
        }

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '[]');
            this.logger.debug('📂 File "scrapes.json" created successfully.');
        } else {
            this.logger.debug('📁 File "scrapes.json" already exists.');
        }

    }

    async scrape(scrapeId: string | null) {
        this.scrapeDefinitions = this.getScrapeDefinitions();

        const { storedData, isFirstRun } = this.getStoredData();
        const previousData = new Map<string, any>();

        previousData.set('firstRun', isFirstRun);

        for (const scrape of this.scrapeDefinitions) {
            this.logger.debug(`Scrape definition: ${JSON.stringify(scrape)}`);
            this.logger.log(`Scrape ID: ${scrapeId}`);

            const stepMap = new Map<string, Map<string, any>>();
            this.scrapeResults.set(scrape.id, stepMap);

            for (const step of scrape.steps) {
                this.logger.log(`Running step: ${step.name}`);


                stepMap.set(step.name, previousData);

                for (const action of step.actions) {
                    this.logger.log(`Running action: ${action.action} with params: ${JSON.stringify(action.params)}`);

                    try {
                        const ret = await this.actionsHandlerService.handleAction(action, previousData, null, storedData);

                        if (ret !== undefined && ret !== null) {
                            this.logger.debug(`Action "${action.name}" returned: ${ret}`);
                            previousData.set(action.name, ret);
                        }
                        
                    } catch (error) {
                        if (error.message === 'BreakLoop') {
                            this.logger.warn(`Exiting scrape because of break on action "${action.name}"`);
                            break;
                        }
                        this.logger.error(`Error executing action: ${action.name}`);
                        throw new Error(error);
                    }


                    this.logger.log(`Action "${action.name}" completed`);
                }
                this.logger.log(`Step "${step.name}" completed`);
            }

            this.logger.log(`Scrape "${scrape.id}" completed`);
        }

        this.writeStoreData(storedData);

        // Konvertiere die Map in ein serialisierbares JSON-Objekt und gib es zurück
        return this.convertScrapeResultsToJson();
    }

    private writeStoreData(storedData: any) {
        const storageFilePath = path.join(process.cwd(), 'config', 'stored-data.json');


        // Schreibe die aktualisierten Daten zurück
        fs.writeFileSync(storageFilePath, JSON.stringify(storedData, null, 2));
    }

    private convertScrapeResultsToJson(): any {
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

    private getStoredData = (): { storedData: any; isFirstRun: boolean } => {
        const filePath = path.join(process.cwd(), 'config', 'stored-data.json');

        if (!fs.existsSync(filePath)) {
            // Datei existiert nicht -> erster Start
            return { storedData: {}, isFirstRun: true };
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsedData = JSON.parse(fileContent);

        // Prüfen, ob die Datei nur ein leeres JSON-Objekt enthält
        const isFirstRun = Object.keys(parsedData).length === 0;

        return { storedData: parsedData, isFirstRun };
    };


}
