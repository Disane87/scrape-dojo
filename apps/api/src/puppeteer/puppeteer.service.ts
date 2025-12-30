import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Stealth-Plugin aktivieren
puppeteerExtra.use(StealthPlugin());


@Injectable()
export class PuppeteerService implements OnModuleDestroy {
    private readonly logger = new Logger(PuppeteerService.name);

    private browser: Browser | null = null;
    private browserPromise: Promise<Browser> | null = null;
    private debug: boolean;
    private inDocker: boolean;
    private arguments: string[];

    public currentPage: puppeteer.Page;

    // Abort-Flag für laufende Scrapes
    private _aborted = false;
    private popupBlockerRegistered = false;

    constructor() {
        // Hier kannst du die gewünschten Argumente anpassen
        this.debug = false;
        this.inDocker = false;
        this.arguments = [];
    }

    async onModuleDestroy() {
        // Browser schließen, wenn das Modul zerstört wird
        if (this.browser) {
            await this.closeBrowser();
        }
    }

    /**
     * Gibt den Browser zurück - startet ihn lazy bei Bedarf
     */
    public async getBrowser(): Promise<Browser> {
        // Prüfe ob abgebrochen wurde
        if (this._aborted) {
            throw new Error('Scrape wurde abgebrochen');
        }

        // Wenn Browser bereits läuft und verbunden ist, zurückgeben
        if (this.browser?.isConnected()) {
            return this.browser;
        }

        // Wenn bereits ein Start läuft, auf diesen warten
        if (this.browserPromise) {
            return this.browserPromise;
        }

        // Browser starten
        this.logger.log('🚀 Starting browser on demand...');
        this.browserPromise = this.setup();

        try {
            this.browser = await this.browserPromise;
            this.logger.log('✅ Browser started successfully');
            return this.browser;
        } finally {
            this.browserPromise = null;
        }
    }

    public async closeBrowser(): Promise<void> {
        if (this.browser) {
            this.logger.log('🔒 Closing browser...');
            await this.browser.close();
            this.browser = null;
            this.currentPage = null;
        }
    }

    /**
     * Schließt alle offenen Pages ohne den Browser zu beenden
     */
    public async closeAllPages(): Promise<void> {
        if (!this.browser?.isConnected()) {
            return;
        }

        this.logger.log('🗑️ Closing all pages...');
        const pages = await this.browser.pages();

        for (const page of pages) {
            try {
                if (!page.isClosed()) {
                    await page.close();
                }
            } catch (err) {
                this.logger.warn(`⚠️ Could not close page: ${err.message}`);
            }
        }

        this.currentPage = null;
        this.logger.log(`✅ Closed ${pages.length} page(s)`);
    }

    /**
     * Setzt das Abort-Flag
     */
    public abort(): void {
        this._aborted = true;
        this.logger.warn('🛑 Abort requested');
    }

    /**
     * Setzt das Abort-Flag zurück
     */
    public resetAbort(): void {
        this._aborted = false;
    }

    /**
     * Prüft ob abgebrochen wurde
     */
    public get isAborted(): boolean {
        return this._aborted;
    }

    private async setup(): Promise<Browser> {
        // User Data Directory für persistente Cookies/Sessions
        const userDataDir = path.join(process.cwd(), 'browser-data');

        // Erstelle das Verzeichnis falls es nicht existiert
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
            this.logger.log(`📁 Created browser data directory: ${userDataDir}`);
        }

        this.logger.log(`🍪 Using persistent browser data from: ${userDataDir}`);

        return await puppeteerExtra.launch({
            headless: process.env.SCRAPE_DOJO_NODE_ENV === 'production',
            args: this.arguments,
            dumpio: false,
            devtools: this.debug,
            executablePath: this.getExecutablePath(),
            userDataDir, // Persistiert Cookies, LocalStorage, Session Storage, etc.
        }) as unknown as Browser;
    }

    private getExecutablePath(): string {
        const chromePath = this.locateChrome();
        if (!chromePath) {
            this.logger.warn(`⚠️ No Chrome/Chromium found, using Puppeteer's bundled Chromium`);
            return undefined; // Puppeteer wird sein eigenes Chromium verwenden
        }
        this.logger.debug(`🌍 Chrome path: ${path.normalize(chromePath)}`);
        return chromePath;
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

    // Methode, um eine Seite zu erhalten - verwendet existierende oder erstellt neue
    public async newPage(): Promise<puppeteer.Page> {
        const browser = await this.getBrowser();

        this.logger.log(`🌐 Browser connected: ${browser.isConnected()}`);

        // Prüfe ob bereits eine Seite existiert (vom Browser-Start)
        const pages = await browser.pages();
        this.logger.log(`📄 Existing pages: ${pages.length}`);

        // Schließe alle Pages außer der ersten (Session Restore könnte mehrere Pages geöffnet haben)
        if (pages.length > 1) {
            this.logger.log(`🧹 Closing ${pages.length - 1} extra page(s) from session restore`);
            for (let i = 1; i < pages.length; i++) {
                await pages[i].close().catch(() => { });
            }
        }

        // Falls currentPage schon gesetzt ist, verwende diese
        if (this.currentPage && !this.currentPage.isClosed()) {
            this.logger.log('📃 Reusing current page');
            return this.currentPage;
        }

        // Falls Pages existieren, verwende die erste
        if (pages.length > 0) {
            this.logger.log('📃 Using existing browser page');
            this.currentPage = pages[0];
        } else {
            // Andernfalls erstelle neue Page
            this.logger.log('📃 Creating new page');
            this.currentPage = await browser.newPage();
        }

        // Prüfe ob Page noch gültig ist bevor wir sie konfigurieren
        if (this.currentPage.isClosed()) {
            this.logger.warn('⚠️ Page was closed before configuration, creating new one');
            this.currentPage = await browser.newPage();
        }

        try {
            await this.currentPage.setViewport({
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
            });
            // Aktueller User-Agent (Chrome 131, Dezember 2025)
            await this.currentPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
        } catch (error) {
            // Wenn die Page während der Konfiguration geschlossen wurde, erstelle eine neue
            if (error.message.includes('Target closed') || error.message.includes('Session closed')) {
                this.logger.warn('⚠️ Page closed during configuration, creating new page');
                this.currentPage = await browser.newPage();
                await this.currentPage.setViewport({
                    width: 1920,
                    height: 1080,
                    deviceScaleFactor: 1,
                });
                await this.currentPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
            } else {
                throw error;
            }
        }

        // Registriere Popup-Blocker nur einmal
        if (!this.popupBlockerRegistered) {
            this.logger.log('🛡️ Registering popup blocker');
            browser.on('targetcreated', async (target) => {
                if (target.type() === 'page') {
                    const newPage = await target.page();
                    if (newPage && newPage !== this.currentPage) {
                        this.logger.log('🚫 Closing popup page');
                        await newPage.close().catch(() => { });
                    }
                }
            });
            this.popupBlockerRegistered = true;
        }

        this.logger.log(`✅ Page ready: ${this.currentPage.url()}`);
        return this.currentPage;
    }

    /**
     * Prüft ob die aktuelle Page noch gültig ist
     */
    public isPageValid(): boolean {
        if (!this.currentPage) {
            return false;
        }

        try {
            // Prüfe ob der Frame noch attached ist
            const frame = this.currentPage.mainFrame();
            if (frame.detached) {
                this.logger.warn('⚠️ Page frame is detached');
                return false;
            }

            // Prüfe ob die Page noch offen ist
            if (this.currentPage.isClosed()) {
                this.logger.warn('⚠️ Page is closed');
                return false;
            }

            return true;
        } catch (error) {
            this.logger.warn(`⚠️ Page validation failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Gibt eine gültige Page zurück - erstellt bei Bedarf eine neue
     */
    public async getValidPage(): Promise<puppeteer.Page> {
        if (this.isPageValid()) {
            return this.currentPage;
        }

        this.logger.log('🔄 Page invalid, creating new page...');

        // Alte Page-Referenz löschen
        this.currentPage = null;

        // Neue Page erstellen
        return this.newPage();
    }
}
