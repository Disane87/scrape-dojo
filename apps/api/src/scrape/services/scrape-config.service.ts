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
          this.logger.debug(
            `📄 Loaded ${scrapes.length} scrapes from: ${siteFile}`,
          );
        } else {
          this.logger.debug(`ℹ️ No scrapes found in: ${siteFile}`);
        }
      } catch (error) {
        const formatted = this.formatSiteConfigError(siteFile, error);
        this.logger.warn(
          `⚠️ Failed to parse site config ${siteFile}: ${formatted}`,
        );
      }
    }

    this.validateScrapeIds(allScrapes);
    this.logger.log(`🎯 Total loaded scrapes: ${allScrapes.length}`);

    return allScrapes;
  }

  /**
   * Lädt eine einzelne Site-Config-Datei.
   * @param relativePath Pfad relativ zum sites-Verzeichnis (z.B. "e-commerce/amazon.jsonc")
   */
  private loadSiteFile(relativePath: string): Scrape[] {
    const filePath = path.join(this.sitesPath, relativePath);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    let parsed: unknown;
    try {
      parsed = parse(fileContent, null, true);
    } catch (error) {
      // Re-throw with context; caller will log a detailed message.
      (error as any).filePath = filePath;
      (error as any).fileName = relativePath;
      (error as any).fileContent = fileContent;
      throw error;
    }

    // Unterstütze sowohl direktes Array als auch Objekt mit scrapes-Property
    let scrapes: Scrape[];
    if (Array.isArray(parsed)) {
      scrapes = parsed as unknown as Scrape[];
    } else if (parsed && typeof parsed === 'object' && 'scrapes' in parsed) {
      const inner = (parsed as unknown as Scrapes).scrapes as unknown;
      if (!Array.isArray(inner)) {
        this.logger.warn(
          `⚠️ Invalid site config structure in ${relativePath}: "scrapes" is not an array`,
        );
        return [];
      }
      scrapes = inner as Scrape[];
    } else {
      this.logger.warn(
        `⚠️ Invalid site config structure in ${relativePath}: expected an array or an object with "scrapes"`,
      );
      return [];
    }

    // Ordnername als Kategorie verwenden, falls die Config keine eigene definiert
    const dirName = path.dirname(relativePath);
    if (dirName !== '.') {
      const category = dirName.split(path.sep).join(' / ');
      for (const scrape of scrapes) {
        if (!scrape.metadata) {
          scrape.metadata = {} as Scrape['metadata'];
        }
        if (!scrape.metadata.category) {
          scrape.metadata.category = category;
        }
      }
    }

    return scrapes;
  }

  private formatSiteConfigError(fileName: string, error: unknown): string {
    const err = error as any;
    const message = err?.message ? String(err.message) : String(error);

    const filePath =
      typeof err?.filePath === 'string'
        ? err.filePath
        : path.join(this.sitesPath, fileName);
    const content =
      typeof err?.fileContent === 'string' ? err.fileContent : undefined;

    // Try to extract a position/line/column from common parse error shapes.
    const line = this.coerceNumber(err?.line ?? err?.lineNumber);
    const column = this.coerceNumber(err?.column ?? err?.col);
    const position = this.coerceNumber(err?.position ?? err?.pos ?? err?.index);

    if (content) {
      const loc = this.resolveLineColumnFromPosition(
        content,
        position,
        line,
        column,
      );
      if (loc) {
        const excerpt = this.getLineExcerpt(content, loc.line);
        const caret = this.getCaretLine(loc.column);
        return `${message} (${filePath}:${loc.line}:${loc.column})\n${excerpt}\n${caret}`;
      }
    }

    if (line && column) {
      return `${message} (${filePath}:${line}:${column})`;
    }

    return `${message} (${filePath})`;
  }

  private coerceNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (
      typeof value === 'string' &&
      value.trim() !== '' &&
      Number.isFinite(Number(value))
    )
      return Number(value);
    return undefined;
  }

  private resolveLineColumnFromPosition(
    content: string,
    position?: number,
    line?: number,
    column?: number,
  ): { line: number; column: number } | undefined {
    if (line && column) return { line, column };
    if (position === undefined || position === null) return undefined;

    const clamped = Math.max(0, Math.min(position, content.length));
    const before = content.slice(0, clamped);
    const lines = before.split(/\r\n|\r|\n/);
    const resolvedLine = lines.length;
    const lastLine = lines[lines.length - 1] ?? '';
    const resolvedColumn = lastLine.length + 1; // 1-based

    return { line: resolvedLine, column: resolvedColumn };
  }

  private getLineExcerpt(content: string, lineNumber: number): string {
    const lines = content.split(/\r\n|\r|\n/);
    const idx = Math.max(0, Math.min(lineNumber - 1, lines.length - 1));
    const line = lines[idx] ?? '';
    // Limit length so logs stay readable.
    const trimmed = line.length > 240 ? `${line.slice(0, 237)}...` : line;
    return trimmed;
  }

  private getCaretLine(columnNumber: number): string {
    const col = Math.max(1, Math.min(columnNumber, 240));
    return `${' '.repeat(col - 1)}^`;
  }

  /**
   * Holt alle JSON/JSONC-Dateien rekursiv aus dem sites-Verzeichnis.
   * Gibt relative Pfade zurück (z.B. "e-commerce/amazon.jsonc").
   */
  private getSiteFiles(): string[] {
    const results: string[] = [];
    this.collectSiteFiles(this.sitesPath, '', results);
    return results.sort();
  }

  private collectSiteFiles(
    basePath: string,
    relativeTo: string,
    results: string[],
  ): void {
    const entries = fs.readdirSync(basePath, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = relativeTo
        ? path.join(relativeTo, entry.name)
        : entry.name;
      if (entry.isDirectory()) {
        this.collectSiteFiles(
          path.join(basePath, entry.name),
          relPath,
          results,
        );
      } else if (
        entry.name.endsWith('.json') ||
        entry.name.endsWith('.jsonc')
      ) {
        results.push(relPath);
      }
    }
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
      this.logger.warn(
        `⚠️ Found duplicate scrape IDs: ${duplicateIds.join(', ')}`,
      );
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
