import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'comment-json';
import { Scrape, Scrapes } from '../types/scrape.interface';

@Injectable()
export class ScrapeConfigService {
    private readonly logger = new Logger(ScrapeConfigService.name);
    private readonly sitesPath = path.join(process.cwd(), 'config', 'sites');

    /**
     * Lädt alle Scrape-Definitionen aus dem sites-Verzeichnis
     */
    loadScrapeDefinitions(): Scrape[] {
        let allScrapes: Scrape[] = [];

        if (!fs.existsSync(this.sitesPath)) {
            this.logger.debug(`📁 Sites directory does not exist: ${this.sitesPath}`);
            return allScrapes;
        }

        const siteFiles = this.getSiteFiles();

        for (const siteFile of siteFiles) {
            try {
                const scrapes = this.loadSiteFile(siteFile);
                if (scrapes.length > 0) {
                    allScrapes = [...allScrapes, ...scrapes];
                    this.logger.debug(`📄 Loaded ${scrapes.length} scrapes from: ${siteFile}`);
                }
            } catch (error) {
                this.logger.warn(`⚠️ Failed to load site config ${siteFile}: ${error.message}`);
            }
        }

        this.validateScrapeIds(allScrapes);
        this.logger.log(`🎯 Total loaded scrapes: ${allScrapes.length}`);

        return allScrapes;
    }

    /**
     * Lädt eine einzelne Site-Config-Datei
     */
    private loadSiteFile(fileName: string): Scrape[] {
        const filePath = path.join(this.sitesPath, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = parse(fileContent, null, true);

        // Unterstütze sowohl direktes Array als auch Objekt mit scrapes-Property
        if (Array.isArray(parsed)) {
            return parsed as unknown as Scrape[];
        }

        if (parsed && typeof parsed === 'object' && 'scrapes' in parsed) {
            return (parsed as unknown as Scrapes).scrapes;
        }

        return [];
    }

    /**
     * Holt alle JSON/JSONC-Dateien aus dem sites-Verzeichnis
     */
    private getSiteFiles(): string[] {
        return fs.readdirSync(this.sitesPath)
            .filter(file => file.endsWith('.json') || file.endsWith('.jsonc'))
            .sort();
    }

    /**
     * Prüft auf doppelte Scrape-IDs
     */
    private validateScrapeIds(scrapes: Scrape[]): void {
        const seenIds = new Set<string>();
        const duplicateIds: string[] = [];

        for (const scrape of scrapes) {
            if (seenIds.has(scrape.id)) {
                duplicateIds.push(scrape.id);
            } else {
                seenIds.add(scrape.id);
            }
        }

        if (duplicateIds.length > 0) {
            this.logger.warn(`⚠️ Found duplicate scrape IDs: ${duplicateIds.join(', ')}`);
        }
    }

    /**
     * Gibt den Pfad zum sites-Verzeichnis zurück
     */
    getSitesPath(): string {
        return this.sitesPath;
    }

    /**
     * Erstellt das sites-Verzeichnis, falls es nicht existiert
     */
    ensureSitesDirectory(): void {
        if (!fs.existsSync(this.sitesPath)) {
            fs.mkdirSync(this.sitesPath, { recursive: true });
            this.logger.debug('📂 Sites directory created successfully.');
        } else {
            this.logger.debug('📁 Sites directory already exists.');
        }
    }
}
