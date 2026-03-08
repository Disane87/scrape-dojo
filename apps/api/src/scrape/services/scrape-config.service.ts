import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { parse, stringify } from 'comment-json';
import { Scrape, Scrapes } from '../types/scrape.interface';

export type WorkflowSource = 'builtin' | 'custom';

export interface ScrapeWithSource extends Scrape {
  _source: WorkflowSource;
}

@Injectable()
export class ScrapeConfigService {
  private readonly logger = new Logger(ScrapeConfigService.name);
  private readonly sitesPath = path.join(process.cwd(), 'config', 'sites');
  private readonly customSitesPath = path.join(
    process.cwd(),
    'config',
    'sites',
    'custom',
  );

  /** Maps scrape ID to its source (builtin or custom) */
  private sourceMap = new Map<string, WorkflowSource>();

  /**
   * Lädt alle Scrape-Definitionen aus dem sites-Verzeichnis
   */
  loadScrapeDefinitions(): Scrape[] {
    let allScrapes: Scrape[] = [];
    this.sourceMap.clear();

    if (!fs.existsSync(this.sitesPath)) {
      this.logger.debug(`📁 Sites directory does not exist: ${this.sitesPath}`);
      return allScrapes;
    }

    // Load builtin workflows (top-level files in config/sites/)
    const siteFiles = this.getSiteFiles();
    for (const siteFile of siteFiles) {
      try {
        const scrapes = this.loadSiteFile(siteFile);
        if (scrapes.length > 0) {
          for (const scrape of scrapes) {
            this.sourceMap.set(scrape.id, 'builtin');
          }
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

    // Load custom workflows (config/sites/custom/)
    if (fs.existsSync(this.customSitesPath)) {
      const customFiles = this.getCustomSiteFiles();
      for (const customFile of customFiles) {
        try {
          const scrapes = this.loadCustomSiteFile(customFile);
          if (scrapes.length > 0) {
            for (const scrape of scrapes) {
              this.sourceMap.set(scrape.id, 'custom');
            }
            allScrapes = [...allScrapes, ...scrapes];
            this.logger.debug(
              `📄 Loaded ${scrapes.length} custom scrapes from: custom/${customFile}`,
            );
          }
        } catch (error) {
          const formatted = this.formatSiteConfigError(
            `custom/${customFile}`,
            error,
          );
          this.logger.warn(
            `⚠️ Failed to parse custom site config ${customFile}: ${formatted}`,
          );
        }
      }
    }

    this.validateScrapeIds(allScrapes);
    this.logger.log(`🎯 Total loaded scrapes: ${allScrapes.length}`);

    return allScrapes;
  }

  /**
   * Returns the source of a workflow by its ID
   */
  getWorkflowSource(id: string): WorkflowSource | null {
    return this.sourceMap.get(id) ?? null;
  }

  /**
   * Checks if a workflow is a custom (user-created) workflow
   */
  isCustomWorkflow(id: string): boolean {
    return this.sourceMap.get(id) === 'custom';
  }

  /**
   * Saves a new custom workflow to config/sites/custom/{id}.jsonc
   */
  saveCustomWorkflow(scrape: Scrape): string {
    this.ensureCustomSitesDirectory();
    const fileName = `${this.sanitizeFileName(scrape.id)}.jsonc`;
    const filePath = path.join(this.customSitesPath, fileName);

    if (fs.existsSync(filePath)) {
      throw new Error(`Custom workflow file already exists: ${fileName}`);
    }

    const content = stringify({ scrapes: [scrape] }, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
    this.logger.log(`📝 Saved custom workflow: ${fileName}`);
    return fileName;
  }

  /**
   * Updates an existing custom workflow
   */
  updateCustomWorkflow(id: string, scrape: Scrape): void {
    const filePath = this.findCustomWorkflowFile(id);
    if (!filePath) {
      throw new Error(`Custom workflow file not found for: ${id}`);
    }

    const content = stringify({ scrapes: [{ ...scrape, id }] }, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
    this.logger.log(`📝 Updated custom workflow: ${id}`);
  }

  /**
   * Deletes a custom workflow file
   */
  deleteCustomWorkflow(id: string): boolean {
    const filePath = this.findCustomWorkflowFile(id);
    if (!filePath) {
      return false;
    }

    fs.unlinkSync(filePath);
    this.sourceMap.delete(id);
    this.logger.log(`🗑️ Deleted custom workflow: ${id}`);
    return true;
  }

  /**
   * Reads the raw JSONC content of a workflow file for export
   */
  getWorkflowFileContent(id: string): string | null {
    // Check custom first
    const customPath = this.findCustomWorkflowFile(id);
    if (customPath) {
      return fs.readFileSync(customPath, 'utf-8');
    }

    // Check builtin files
    const siteFiles = this.getSiteFiles();
    for (const siteFile of siteFiles) {
      try {
        const scrapes = this.loadSiteFile(siteFile);
        const match = scrapes.find((s) => s.id === id);
        if (match) {
          // Return just the single scrape as JSONC
          return stringify({ scrapes: [match] }, null, 2);
        }
      } catch {
        // Skip
      }
    }

    return null;
  }

  /**
   * Lädt eine einzelne Site-Config-Datei (builtin)
   */
  private loadSiteFile(fileName: string): Scrape[] {
    const filePath = path.join(this.sitesPath, fileName);
    return this.parseScrapeFile(filePath, fileName);
  }

  /**
   * Lädt eine einzelne Custom-Config-Datei
   */
  private loadCustomSiteFile(fileName: string): Scrape[] {
    const filePath = path.join(this.customSitesPath, fileName);
    return this.parseScrapeFile(filePath, `custom/${fileName}`);
  }

  /**
   * Parses a scrape config file and returns the scrapes
   */
  private parseScrapeFile(filePath: string, displayName: string): Scrape[] {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    let parsed: unknown;
    try {
      parsed = parse(fileContent, null, true);
    } catch (error) {
      (error as any).filePath = filePath;
      (error as any).fileName = displayName;
      (error as any).fileContent = fileContent;
      throw error;
    }

    // Unterstütze sowohl direktes Array als auch Objekt mit scrapes-Property
    if (Array.isArray(parsed)) {
      return parsed as unknown as Scrape[];
    }

    if (parsed && typeof parsed === 'object' && 'scrapes' in parsed) {
      const scrapes = (parsed as unknown as Scrapes).scrapes as unknown;
      if (!Array.isArray(scrapes)) {
        this.logger.warn(
          `⚠️ Invalid site config structure in ${displayName}: "scrapes" is not an array`,
        );
        return [];
      }
      return scrapes as Scrape[];
    }

    this.logger.warn(
      `⚠️ Invalid site config structure in ${displayName}: expected an array or an object with "scrapes"`,
    );
    return [];
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
    const resolvedColumn = lastLine.length + 1;

    return { line: resolvedLine, column: resolvedColumn };
  }

  private getLineExcerpt(content: string, lineNumber: number): string {
    const lines = content.split(/\r\n|\r|\n/);
    const idx = Math.max(0, Math.min(lineNumber - 1, lines.length - 1));
    const line = lines[idx] ?? '';
    const trimmed = line.length > 240 ? `${line.slice(0, 237)}...` : line;
    return trimmed;
  }

  private getCaretLine(columnNumber: number): string {
    const col = Math.max(1, Math.min(columnNumber, 240));
    return `${' '.repeat(col - 1)}^`;
  }

  /**
   * Holt alle JSON/JSONC-Dateien aus dem sites-Verzeichnis (top-level only)
   */
  private getSiteFiles(): string[] {
    return fs
      .readdirSync(this.sitesPath)
      .filter(
        (file) =>
          (file.endsWith('.json') || file.endsWith('.jsonc')) &&
          fs.statSync(path.join(this.sitesPath, file)).isFile(),
      )
      .sort();
  }

  /**
   * Holt alle JSON/JSONC-Dateien aus dem custom-Verzeichnis
   */
  private getCustomSiteFiles(): string[] {
    if (!fs.existsSync(this.customSitesPath)) return [];
    return fs
      .readdirSync(this.customSitesPath)
      .filter((file) => file.endsWith('.json') || file.endsWith('.jsonc'))
      .sort();
  }

  /**
   * Finds the file path of a custom workflow by its ID
   */
  private findCustomWorkflowFile(id: string): string | null {
    if (!fs.existsSync(this.customSitesPath)) return null;

    const sanitized = this.sanitizeFileName(id);
    // Check exact match first
    for (const ext of ['.jsonc', '.json']) {
      const filePath = path.join(this.customSitesPath, `${sanitized}${ext}`);
      if (fs.existsSync(filePath)) return filePath;
    }

    // Fallback: scan files for matching ID
    const files = this.getCustomSiteFiles();
    for (const file of files) {
      try {
        const scrapes = this.loadCustomSiteFile(file);
        if (scrapes.some((s) => s.id === id)) {
          return path.join(this.customSitesPath, file);
        }
      } catch {
        // Skip
      }
    }

    return null;
  }

  /**
   * Sanitizes a string for use as a filename
   */
  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '-');
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
   * Gibt den Pfad zum custom-Verzeichnis zurück
   */
  getCustomSitesPath(): string {
    return this.customSitesPath;
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
    this.ensureCustomSitesDirectory();
  }

  /**
   * Erstellt das custom-Verzeichnis, falls es nicht existiert
   */
  private ensureCustomSitesDirectory(): void {
    if (!fs.existsSync(this.customSitesPath)) {
      fs.mkdirSync(this.customSitesPath, { recursive: true });
      this.logger.debug('📂 Custom sites directory created successfully.');
    }
  }
}
