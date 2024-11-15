import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';


@Injectable()
export class PuppeteerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PuppeteerService.name);

    public browser: Browser;
    private debug: boolean;
    private inDocker: boolean;
    private arguments: string[];

    public currentPage: puppeteer.Page;

    constructor() {
        // Hier kannst du die gewünschten Argumente anpassen
        this.debug = false;
        this.inDocker = false;
        this.arguments = [];
    }

    async onModuleInit() {
        // Browser initialisieren, wenn das Modul geladen wird
        this.browser = await this.setup();
        await this.newPage();
        //   const extractActionInstance = new ExtractAction(await this.browser.newPage());
    }

    async onModuleDestroy() {
        // Browser schließen, wenn das Modul zerstört wird
        if (this.browser) {
            await this.closeBrowser();
        }
    }

    public async closeBrowser(): Promise<void> {
        if (this.browser) {
            return await this.browser.close();
        }
    }

    public async setup(): Promise<Browser> {
        return await puppeteer.launch({
            //   headless: this.inDocker ? true : !this.debug,
            headless: false,
            args: this.arguments,
            dumpio: false,
            devtools: this.debug,
            executablePath: this.getExecutablePath(),
        });
    }

    private getExecutablePath(): string {
        const chromePath = this.locateChrome();
        this.logger.debug(`🌍 Chrome path: ${path.normalize(chromePath)}`);
        return;
    }

    private locateChrome(): string {
        let paths: string[];
        this.logger.debug(`💻 Platform: ${process.platform}`);

        switch (process.platform) {
            case 'darwin':
                paths = [
                    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
                    '/Applications/Chromium.app/Contents/MacOS/Chromium',
                    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
                    '/usr/bin/google-chrome-stable',
                    '/usr/bin/google-chrome',
                    '/usr/bin/chromium',
                    '/usr/bin/chromium-browser',
                ];
                break;

            case 'win32':
                paths = [
                    `${process.env['LocalAppData']}/Google/Chrome/Application/chrome.exe`,
                    `${process.env['ProgramFiles']}/Google/Chrome/Application/chrome.exe`,
                    `${process.env['ProgramFiles(x86)']}/Google/Chrome/Application/chrome.exe`,
                    `${process.env['LocalAppData']}/Chromium/Application/chrome.exe`,
                    `${process.env['ProgramFiles']}/Chromium/Application/chrome.exe`,
                    `${process.env['ProgramFiles(x86)']}/Chromium/Application/chrome.exe`,
                    `${process.env['ProgramFiles(x86)']}/Microsoft/Edge/Application/msedge.exe`,
                    `${process.env['ProgramFiles']}/Microsoft/Edge/Application/msedge.exe`,
                ];
                break;

            default:
                paths = [
                    '/usr/bin/google-chrome-stable',
                    '/usr/bin/google-chrome',
                    '/usr/bin/chromium',
                    '/usr/bin/chromium-browser',
                    '/snap/bin/chromium',
                ];
        }

        for (const path of paths) {
            try {
                fs.accessSync(path);
                return path;
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
                continue;
            }
        }
        return null;
    }

    // Beispiel-Methode, um eine neue Seite zu erstellen
    public async newPage(): Promise<puppeteer.Page> {
        if (!this.browser) {
            throw new Error('Browser is not initialized. Call setup() first.');
        }

        this.logger.log('📃 Creating new page');
        this.currentPage = await this.browser.newPage();
        await this.currentPage.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
        });
        this.currentPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        return this.currentPage;
    }
}
