import { Page } from "puppeteer";
import { BaseAction } from "./bases/base.action";
import { Action } from "../_decorators/action.decorator";

import * as fs from 'fs';

export type DownloadActionParams = {
    url: string; // Die URL, die heruntergeladen werden soll
    path: string;
    filename: string;
}

@Action('download')
export class DownloadAction extends BaseAction<DownloadActionParams> {
    async run(): Promise<void> {
        const { url, path, filename } = this.params;

        try {

            const scrapePage = this.page;
            // Öffne eine neue Seite
            const pdfPage = await this.puppeteerService.browser.newPage();
            await pdfPage.goto(url);

            const fileReaderString = await pdfPage.evaluate(async (url) => {
                const response = await window.fetch(url, { mode: `no-cors` });
                const data = await response.blob();
                const reader = new FileReader();

                return new Promise<string>((resolve, reject) => {
                    reader.readAsBinaryString(data);
                    reader.onloadend = () => {
                        resolve(reader.result.toString());
                    };
                    reader.onerror = () => {
                        reject(reader.error);
                        return null;
                    };
                });
            }, url);

            const fileBuffer = Buffer.from(fileReaderString, 'binary');

            if (!fileBuffer) {
                this.logger.error(`Failed to create buffer from fileReader for url "${url}"`);
                return null;
            }

            if (!fs.existsSync(path)) {
                fs.mkdirSync(path, { recursive: true });
            }

            fs.writeFileSync(`${path}/${filename}`, fileBuffer);

            await pdfPage.close();

            this.page = scrapePage;
            // this.logger.info(`Navigated to URL: ${url}`);

            // // Setze den Status der Rechnung (simuliertes Beispiel)
            // const invoice = { status: InvoiceStatus.opened };

            // // Lese die Datei als String (Anpassung entsprechend der tatsächlichen Logik in fileHandler)
            // const fileReaderString = await this.fileHandler.getFileReaderString(pdfPage, url);
            // const fileBuffer = this.fileHandler.getFileBuffer(fileReaderString, invoice, order, url);

            // if (fileBuffer) {
            //     this.logger.debug(`Buffer exists`);
            //     this.logger.info(`Checking if folder exists. If not, create: ${this.options.fileDestinationFolder}`);

            //     // Hole die Pfade, um die Datei zu speichern
            //     const { destPluginFileFolder, pathNormalized } = this.fileHandler.getPaths(url, order, invoiceIndex);

            //     // Schreibe die Datei auf die Festplatte
            //     this.fileHandler.writeFile(destPluginFileFolder, pathNormalized, invoice, fileBuffer, order);

            //     this.logger.info(`File successfully written to: ${pathNormalized}`);
            // } else {
            //     this.logger.error(`Failed to generate file buffer from URL: ${url}`);
            // }

            // // Schließe die Seite nach dem Download
            // await pdfPage.close();
        } catch (error) {
            this.logger.error(`Error while downloading file from URL: ${url}. Error: ${error.message}`);
        }
    }
}

export default DownloadAction;
