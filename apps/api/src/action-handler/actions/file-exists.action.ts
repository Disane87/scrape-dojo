import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'fast-glob';

export type FileExistsParams = {
  /** Pfad zum Ordner oder vollständiger Dateipfad */
  path: string;
  /** Optionales Dateinamen-Pattern (unterstützt glob patterns wie *.pdf, invoice-*.pdf) */
  pattern?: string;
};

/**
 * Prüft ob eine Datei oder ein Pattern existiert.
 * Gibt true zurück wenn die Datei existiert, false wenn nicht.
 *
 * @example
 * // Prüfe ob eine spezifische Datei existiert
 * { "path": "./documents/amazon/2024/invoice-123.pdf" }
 *
 * @example
 * // Prüfe ob eine Datei mit Pattern existiert
 * { "path": "./documents/amazon/2024", "pattern": "amazon-invoice-123-*.pdf" }
 */
@Action('fileExists', {
  displayName: 'File Exists',
  icon: 'FileSearch',
  description: 'Check if a file exists at a path',
  color: 'teal',
  category: 'utility',
})
export class FileExistsAction extends BaseAction<FileExistsParams> {
  async run(): Promise<boolean> {
    const { path: filePath, pattern } = this.params;

    try {
      if (pattern) {
        // Nutze glob für Pattern-Matching
        const searchPath = path.join(filePath, pattern).replace(/\\/g, '/');
        this.logger.debug(`🔍 Searching for pattern: ${searchPath}`);

        const matches = await glob.glob(searchPath);
        const exists = matches.length > 0;

        if (exists) {
          this.logger.debug(
            `📄 Found ${matches.length} file(s) matching pattern`,
          );
        } else {
          this.logger.debug(`📄 No files found matching pattern`);
        }

        return exists;
      } else {
        // Direkter Dateipfad
        const exists = fs.existsSync(filePath);
        this.logger.debug(
          `📄 File ${exists ? 'exists' : 'does not exist'}: ${filePath}`,
        );
        return exists;
      }
    } catch (ex) {
      this.logger.error(`❌ FileExists error: ${ex.message}`);
      return false;
    }
  }
}

export default FileExistsAction;
