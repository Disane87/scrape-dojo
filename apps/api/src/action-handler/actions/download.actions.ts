import { Page } from "puppeteer";
import { BaseAction } from "./bases/base.action";
import { Action } from "../_decorators/action.decorator";

import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';

export type DownloadActionParams = {
    url: string; // Die URL, die heruntergeladen werden soll
    path: string;
    filename: string;
}

@Action('download', {
    displayName: 'Download',
    icon: 'Download',
    description: 'Download a file from a URL',
    color: 'green',
    category: 'utility'
})
export class DownloadAction extends BaseAction<DownloadActionParams> {
    async run(): Promise<string> {
        const { url, path: downloadPath, filename } = this.params;

        try {
            this.logger.log(`📥 Downloading: ${url}`);
            this.logger.debug(`📁 Target path: ${downloadPath}`);
            this.logger.debug(`📄 Filename: ${filename}`);

            // Validierung: Filename darf nicht leer sein
            if (!filename || filename.trim() === '') {
                this.logger.error(`❌ Filename is empty! Check template variable resolution.`);
                this.logger.debug(`Previous data: ${JSON.stringify(Object.fromEntries(this.previousData))}`);
                throw new Error('Filename parameter is required and cannot be empty');
            }

            // Erstelle Unterordner mit scrapeId für bessere Organisation
            // Der scrapeId wird nach dem ersten Verzeichnis eingefügt
            const scrapeId = this.data?.scrapeId;
            let targetPath = downloadPath;
            
            if (scrapeId) {
                // Zerlege den Pfad in Segmente und füge scrapeId nach dem Root ein
                const normalizedPath = downloadPath.replace(/\\/g, '/');
                const segments = normalizedPath.split('/').filter(s => s !== '');
                
                if (segments.length > 0) {
                    // Finde den Root-Teil (z.B. "./documents" oder "documents" oder "C:/documents")
                    let rootParts: string[] = [];
                    let restParts: string[] = [];
                    
                    // Behandle relative Pfade (., ..)
                    let i = 0;
                    while (i < segments.length && (segments[i] === '.' || segments[i] === '..')) {
                        rootParts.push(segments[i]);
                        i++;
                    }
                    
                    // Das erste "echte" Verzeichnis ist auch Teil des Roots
                    if (i < segments.length) {
                        rootParts.push(segments[i]);
                        i++;
                    }
                    
                    // Der Rest kommt nach dem scrapeId
                    restParts = segments.slice(i);
                    
                    // Setze den neuen Pfad zusammen: root + scrapeId + rest
                    targetPath = [...rootParts, scrapeId, ...restParts].join('/');
                    this.logger.debug(`📂 Reorganized path with scrape subfolder: ${targetPath}`);
                } else {
                    targetPath = path.join(downloadPath, scrapeId);
                }
            }

            // Stelle sicher, dass das Zielverzeichnis existiert
            const absolutePath = path.resolve(targetPath);
            this.logger.debug(`📍 Resolved path: ${absolutePath}`);
            
            if (!fs.existsSync(absolutePath)) {
                fs.mkdirSync(absolutePath, { recursive: true });
                this.logger.debug(`📁 Created directory: ${absolutePath}`);
            }

            // Extrahiere sauberen Dateinamen aus URL wenn filename die volle URL ist
            let cleanFilename = filename;
            if (filename.startsWith('file://') || filename.startsWith('http://') || filename.startsWith('https://')) {
                // Extrahiere nur den Dateinamen aus der URL
                cleanFilename = path.basename(new URL(filename).pathname);
            }

            const fullPath = path.join(absolutePath, cleanFilename);

            // Prüfe ob es eine lokale Datei ist (file://)
            if (url.startsWith('file://')) {
                return await this.downloadLocalFile(url, fullPath);
            }

            // Für HTTP(S) URLs: Verwende fetch im Browser-Kontext
            return await this.downloadRemoteFile(url, fullPath, cleanFilename);

        } catch (error) {
            this.logger.error(`❌ Error while downloading file from URL: ${url}. Error: ${error.message}`);
            return null;
        }
    }

    /**
     * Kopiert eine lokale Datei (file:// URL)
     */
    private async downloadLocalFile(url: string, fullPath: string): Promise<string> {
        // Konvertiere file:// URL zu lokalem Pfad
        const fileUrl = new URL(url);
        const sourcePath = fileUrl.pathname;

        // Auf Windows: Entferne führenden Slash bei Pfaden wie /C:/...
        const normalizedPath = process.platform === 'win32' && sourcePath.startsWith('/')
            ? sourcePath.substring(1)
            : sourcePath;

        // Dekodiere URL-kodierte Zeichen
        const decodedPath = decodeURIComponent(normalizedPath);

        if (!fs.existsSync(decodedPath)) {
            this.logger.error(`❌ Local file not found: ${decodedPath}`);
            return null;
        }

        // Kopiere die Datei
        fs.copyFileSync(decodedPath, fullPath);

        const stats = fs.statSync(fullPath);
        const fileSizeKB = Math.round(stats.size / 1024);
        this.logger.log(`✅ Copied local file: ${path.basename(fullPath)} (${fileSizeKB} KB)`);

        return fullPath;
    }

    /**
     * Lädt eine Remote-Datei über fetch im Browser-Kontext herunter
     */
    private async downloadRemoteFile(url: string, fullPath: string, filename: string): Promise<string> {
        // Hole Cookies aus der aktuellen Page-Session
        const cookies = await this.page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        // Verwende die eingeloggte Page um das PDF herunterzuladen
        // page.evaluate kann fetch mit den richtigen Cookies ausführen
        const fileBuffer = await this.page.evaluate(async (downloadUrl: string) => {
            const response = await fetch(downloadUrl, {
                credentials: 'include', // Wichtig: Sendet Cookies mit!
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            return Array.from(new Uint8Array(arrayBuffer));
        }, url);

        if (!fileBuffer || fileBuffer.length === 0) {
            this.logger.error(`❌ Failed to download: ${filename} - Empty response`);
            return null;
        }

        const buffer = Buffer.from(fileBuffer);
        fs.writeFileSync(fullPath, buffer);

        const fileSizeKB = Math.round(buffer.length / 1024);
        this.logger.log(`✅ Downloaded: ${filename} (${fileSizeKB} KB)`);

        return fullPath;
    }
}

export default DownloadAction;