import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';
import { ScrapeEventsService, LogLevel } from '../scrape/scrape-events.service';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { promises as fsPromises } from 'fs';
import { join } from 'path';

/**
 * Custom Logger der Logs sowohl in die Konsole als auch an die UI sendet
 * und in rotierenden Log-Dateien speichert
 */
@Injectable({ scope: Scope.TRANSIENT })
export class EventLogger extends ConsoleLogger {
    private static eventsService: ScrapeEventsService | null = null;
    private static logFilePath: string;
    private static logsDir = join(process.cwd(), 'logs');
    private static maxLogLines = 1000;
    private static maxLogFiles = 10;
    private static maxLogBytes = Number(process.env.SCRAPE_DOJO_LOG_MAX_BYTES ?? 5_000_000);
    private static initialized = false;
    private static trimTimer: NodeJS.Timeout | null = null;

    /**
     * Wird vom AppModule aufgerufen, um den EventsService zu setzen
     */
    static setEventsService(service: ScrapeEventsService) {
        EventLogger.eventsService = service;
        
        // Initialisiere Log-Rotation beim ersten Aufruf
        if (!EventLogger.initialized) {
            EventLogger.initializeLogRotation();
            EventLogger.initialized = true;
        }
    }

    /**
     * Initialisiert Log-Rotation: Erstellt neue Log-Datei und räumt alte auf
     */
    private static initializeLogRotation() {
        // Logs-Verzeichnis erstellen
        if (!existsSync(EventLogger.logsDir)) {
            mkdirSync(EventLogger.logsDir, { recursive: true });
        }

        // Erstelle neue Log-Datei mit Timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        EventLogger.logFilePath = join(EventLogger.logsDir, `server-${timestamp}.log`);

        // Alte Log-Dateien aufräumen
        EventLogger.cleanupOldLogFiles();

        console.log(`📝 Writing logs to: ${EventLogger.logFilePath}`);
    }

    /**
     * Räumt alte Log-Dateien auf (behält nur die neuesten maxLogFiles)
     */
    private static cleanupOldLogFiles() {
        try {
            const fs = require('fs');
            const files = fs.readdirSync(EventLogger.logsDir)
                .filter((f: string) => f.startsWith('server-') && f.endsWith('.log'))
                .map((f: string) => ({
                    name: f,
                    path: join(EventLogger.logsDir, f),
                    time: fs.statSync(join(EventLogger.logsDir, f)).mtime.getTime()
                }))
                .sort((a: any, b: any) => b.time - a.time);

            if (files.length > EventLogger.maxLogFiles) {
                const filesToDelete = files.slice(EventLogger.maxLogFiles);
                filesToDelete.forEach((file: any) => {
                    fs.unlinkSync(file.path);
                });
                console.log(`🧹 Cleaned up ${filesToDelete.length} old log file(s)`);
            }
        } catch (err) {
            console.warn(`⚠️ Could not cleanup old log files: ${err}`);
        }
    }

    /**
     * Schreibt Log in Datei
     */
    private static writeToFile(level: LogLevel, message: string, context: string) {
        if (!EventLogger.logFilePath) return;

        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                level,
                context,
                message
            };
            const logLine = JSON.stringify(logEntry) + '\n';
            // Async schreiben, um den Event-Loop nicht zu blockieren.
            void fsPromises.appendFile(EventLogger.logFilePath, logLine, 'utf-8').catch(() => {
                // Fehler ignorieren um Endlosschleifen zu vermeiden
            });

            // Rotation/Trimming nur gelegentlich und nur wenn Datei groß wird.
            EventLogger.scheduleTrimIfNeeded();
        } catch (err) {
            // Fehler ignorieren um Endlosschleifen zu vermeiden
        }
    }

    /**
     * Debounced: prüft/trimmt die Log-Datei nur gelegentlich.
     */
    private static scheduleTrimIfNeeded() {
        if (EventLogger.trimTimer) return;

        EventLogger.trimTimer = setTimeout(() => {
            EventLogger.trimTimer = null;
            void EventLogger.trimIfNeeded();
        }, 1000);
    }

    private static async trimIfNeeded() {
        try {
            if (!EventLogger.logFilePath) return;

            const stat = await fsPromises.stat(EventLogger.logFilePath).catch(() => null);
            if (!stat) return;

            const maxBytes = Number.isFinite(EventLogger.maxLogBytes) ? EventLogger.maxLogBytes : 5_000_000;
            if (stat.size <= maxBytes) return;

            // Trim anhand der letzten maxLogLines (nur wenn Datei wirklich groß ist)
            const content = await fsPromises.readFile(EventLogger.logFilePath, 'utf-8');
            const lines = content.trim().split('\n');
            if (lines.length > EventLogger.maxLogLines) {
                const newContent = lines.slice(-EventLogger.maxLogLines).join('\n') + '\n';
                await fsPromises.writeFile(EventLogger.logFilePath, newContent, 'utf-8');
            }
        } catch {
            // Fehler ignorieren
        }
    }

    /**
     * Gibt den Pfad zur aktuellen Log-Datei zurück
     */
    static getCurrentLogFilePath(): string | null {
        return EventLogger.logFilePath || null;
    }

    /**
     * Gibt den Pfad zum Logs-Verzeichnis zurück
     */
    static getLogsDir(): string {
        return EventLogger.logsDir;
    }

    /**
     * Liest Logs aus der aktuellen Log-Datei (nur aktuelle Session)
     */
    static readLogs(limit = 500): Array<{ timestamp: string; level: string; context: string; message: string }> {
        try {
            // Stelle sicher, dass die Log-Rotation initialisiert ist
            if (!EventLogger.initialized) {
                EventLogger.initializeLogRotation();
                EventLogger.initialized = true;
            }

            if (!EventLogger.logFilePath || !existsSync(EventLogger.logFilePath)) {
                return [];
            }

            const content = readFileSync(EventLogger.logFilePath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.length > 0);
            const recentLines = lines.slice(-limit);

            return recentLines.map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            }).filter(Boolean);
        } catch (err) {
            return [];
        }
    }

    /**
     * Löscht die aktuelle Log-Datei
     */
    static clearLogs() {
        try {
            if (EventLogger.logFilePath && existsSync(EventLogger.logFilePath)) {
                writeFileSync(EventLogger.logFilePath, '', 'utf-8');
            }
        } catch (err) {
            // Fehler ignorieren
        }
    }

    log(message: unknown, context?: string) {
        super.log(message, context);
        this.emitLogEvent('log', message, context);
    }

    error(message: unknown, stack?: string, context?: string) {
        super.error(message, stack, context);
        this.emitLogEvent('error', message, context || stack);
    }

    warn(message: unknown, context?: string) {
        super.warn(message, context);
        this.emitLogEvent('warn', message, context);
    }

    debug(message: unknown, context?: string) {
        super.debug(message, context);
        this.emitLogEvent('debug', message, context);
    }

    verbose(message: unknown, context?: string) {
        super.verbose(message, context);
        this.emitLogEvent('verbose', message, context);
    }

    private emitLogEvent(level: LogLevel, message: unknown, context?: string) {
        const logContext = context || this.context || 'App';
        const logMessage = String(message);

        // In Datei schreiben
        EventLogger.writeToFile(level, logMessage, logContext);

        // An EventsService senden (für SSE)
        if (EventLogger.eventsService) {
            EventLogger.eventsService.emitLog(level, logMessage, logContext);
        }
    }
}
