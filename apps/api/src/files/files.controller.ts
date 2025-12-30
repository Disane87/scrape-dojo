import { Controller, Post, Body, Logger, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('files')
export class FilesController {
    private readonly logger = new Logger(FilesController.name);

    @Post('download')
    async downloadFile(@Body('path') filePath: string, @Res() res: Response): Promise<void> {
        try {
            this.logger.log(`📥 Downloading file: ${filePath}`);

            // Konvertiere relativen Pfad in absoluten Pfad
            const absolutePath = path.isAbsolute(filePath) 
                ? filePath 
                : path.resolve(process.cwd(), filePath);

            this.logger.debug(`Resolved absolute path: ${absolutePath}`);

            // Sicherheitscheck: Stelle sicher, dass der Pfad existiert
            if (!fs.existsSync(absolutePath)) {
                this.logger.warn(`❌ File not found: ${absolutePath}`);
                res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'File not found' });
                return;
            }

            // Sicherheitscheck: Stelle sicher, dass es eine Datei ist
            const stats = fs.statSync(absolutePath);
            if (!stats.isFile()) {
                this.logger.warn(`❌ Path is not a file: ${absolutePath}`);
                res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Path is not a file' });
                return;
            }

            // Extrahiere nur den Dateinamen
            const fileName = path.basename(absolutePath);

            // Sende die Datei als Download (res.download setzt automatisch Content-Disposition)
            res.download(absolutePath, fileName, (err) => {
                if (err) {
                    this.logger.error(`❌ Error sending file: ${err.message}`);
                    if (!res.headersSent) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message });
                    }
                } else {
                    this.logger.log(`✅ File downloaded successfully: ${fileName}`);
                }
            });
        } catch (error) {
            this.logger.error(`❌ Error downloading file: ${error.message}`);
            if (!res.headersSent) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
            }
        }
    }
}
