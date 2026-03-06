import { Page } from 'puppeteer';
import { BaseAction } from './bases/base.action';
import * as fs from 'fs';
import { Action } from '../_decorators/action.decorator';

@Action('screenshot', {
  displayName: 'Screenshot',
  icon: 'Camera',
  description: 'Take a screenshot of the page or element',
  color: 'indigo',
  category: 'utility',
})
export class ScreenshotAction extends BaseAction<VideoDecoder> {
  async run(): Promise<string> {
    if (!fs.existsSync('./screenshots')) {
      fs.mkdirSync('./screenshots', { recursive: true });
      this.logger.log('Screenshot directory created successfully.');
    } else {
      this.logger.log('Screenshot directory already exists.');
    }

    const filename = `./screenshots/${await this.generateFilename(this.page)}.png`;
    await this.page.screenshot({ path: filename });
    return filename;
  }

  async generateFilename(page: Page): Promise<string> {
    // Hole den Seitentitel
    let title = await page.title();

    // Normalisiere den Titel, indem du ungültige Zeichen entfernst und durch einen Bindestrich ersetzt
    title = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    // Erstelle einen Zeitstempel im Format "YYYYMMDD-HHmmss"
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    // Kombiniere den Titel und den Zeitstempel zu einem Dateinamen
    const filename = `${timestamp}-${title}`;

    return filename;
  }
}

export default ScreenshotAction;
