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

        // Überprüfen, ob das Verzeichnis existiert, und falls nicht, erstellen
        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
            this.logger.log('Config directory created successfully.');
        } else {
            this.logger.log('Config directory already exists.');
        }

        // Überprüfen, ob die Datei existiert, und falls nicht, erstellen
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '[]'); // Eine leere JSON-Datei erzeugen
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
    
            for (const step of scrape.steps) {
                this.logger.log(`Running step: ${step.name}`);
    
                for (const action of step.actions) {
                    this.logger.log(`Running action: ${action.action} with params: ${JSON.stringify(action.params)}`);
                    
                    // Warte auf den Abschluss der Aktion
                    const ret = await this.actionsHandlerService.handleAction(action.action, scrape.url, action.params);
                    // this.logger.log(`Action returned: ${ret}`);
    
                    // Timer für 1 Sekunde
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
    
        // Browser schließen, falls erforderlich
        // await this.puppeteerService.closeBrowser();
        return scrapeId;
    }
    
}
