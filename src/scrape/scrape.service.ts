import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PuppeteerService } from 'src/puppeteer/puppeteer.service';
import { Scrape, Scrapes } from './types/scrape.interface';
import { ActionHandlerService } from 'src/action-handler/action-handler.service';

@Injectable()
export class ScrapeService implements OnModuleInit {
    private readonly logger = new Logger(ScrapeService.name);
    private scrapeDefinitions: Array<Scrape> = [];
    private scrapeResults: Map<string, Map<string, Map<string, any>>> = new Map();

    constructor(private actionsHandlerService: ActionHandlerService, private puppeteerService: PuppeteerService) {}

    getScrapeDefinitions(): Array<Scrape> {
        const rootDirectory = process.cwd();
        const filePath = path.join(rootDirectory, 'config', 'scrapes.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return (JSON.parse(fileContent) as Scrapes).scrapes;
    }

    onModuleInit() {
        const rootDirectory = process.cwd();
        this.logger.log(`Root directory ${rootDirectory}`);

        const directoryPath = path.join(rootDirectory, 'config');
        const filePath = path.join(directoryPath, 'scrapes.json');

        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
            this.logger.log('Config directory created successfully.');
        } else {
            this.logger.log('Config directory already exists.');
        }

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '[]');
            this.logger.log('File "scrapes.json" created successfully.');
        } else {
            this.logger.log('File "scrapes.json" already exists.');
        }

        this.scrapeDefinitions = this.getScrapeDefinitions();
    }

    async scrape(scrapeId: string | null) {
        for (const scrape of this.scrapeDefinitions) {
            this.logger.log(`Scrape definition: ${JSON.stringify(scrape)}`);
            this.logger.log(`Scrape ID: ${scrapeId}`);

            const stepMap = new Map<string, Map<string, any>>();
            this.scrapeResults.set(scrape.id, stepMap);

            for (const step of scrape.steps) {
                this.logger.log(`Running step: ${step.name}`);

                const actionMap = new Map<string, any>();
                stepMap.set(step.name, actionMap);

                for (const action of step.actions) {
                    this.logger.log(`Running action: ${action.action} with params: ${JSON.stringify(action.params)}`);

                    const ret = await this.actionsHandlerService.handleAction(action, actionMap);
                    if (ret !== undefined && ret !== null) {
                        this.logger.log(`Action "${action.name}" returned: ${ret}`);
                        actionMap.set(action.name, ret);
                    }

                    this.logger.log(`Action "${action.name}" completed`);
                }
                this.logger.log(`Step "${step.name}" completed`);
            }

            this.logger.log(`Scrape "${scrape.id}" completed`);
        }

        // Konvertiere die Map in ein serialisierbares JSON-Objekt und gib es zurück
        return this.convertScrapeResultsToJson();
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
}
