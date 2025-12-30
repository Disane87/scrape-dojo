import { Injectable, Scope, Logger } from '@nestjs/common';
import { ScrapeEventsService, LogLevel } from '../scrape/scrape-events.service';

/**
 * Zentraler Logger-Service für die gesamte Anwendung
 * - Kombiniert NestJS Logger mit Event-Emission
 * - Unterstützt dynamische Kontexte
 * - Injectable als Singleton oder Transient
 */
@Injectable({ scope: Scope.TRANSIENT })
export class ScrapeLogger {
    private nestLogger: Logger;
    private currentContext: string = 'App';
    private eventsService?: ScrapeEventsService;
    private scrapeId?: string;
    private runId?: string;
    private indentLevel: number = 0;

    constructor() {
        this.nestLogger = new Logger(this.currentContext);
    }

    /**
     * Setzt die Einrückungstiefe (für Loop-Hierarchien)
     */
    setIndentLevel(level: number): void {
        this.indentLevel = level;
    }

    /**
     * Erhöht die Einrückungstiefe
     */
    indent(): void {
        this.indentLevel++;
    }

    /**
     * Verringert die Einrückungstiefe
     */
    outdent(): void {
        if (this.indentLevel > 0) {
            this.indentLevel--;
        }
    }

    /**
     * Setzt den Kontext für den Logger
     */
    setContext(context: string): void {
        this.currentContext = context;
        this.updateLoggerContext();
    }

    /**
     * Setzt die Event-Service-Konfiguration für Event-Emission
     */
    setEventContext(eventsService?: ScrapeEventsService, scrapeId?: string, runId?: string): void {
        this.eventsService = eventsService;
        this.scrapeId = scrapeId;
        this.runId = runId;
        this.updateLoggerContext();
    }

    /**
     * Aktualisiert den Logger-Context mit Workflow-Info
     */
    private updateLoggerContext(): void {
        const contextParts = [this.currentContext];
        
        if (this.scrapeId) {
            contextParts.push(this.scrapeId);
        } else {
            contextParts.push('SYS');
        }
        
        this.nestLogger = new Logger(contextParts.join('|'));
    }

    /**
     * Interne Methode zum Loggen und Event-Emittieren
     */
    private emitLog(level: LogLevel, message: string): void {
        // Füge Einrückung hinzu basierend auf Loop-Tiefe
        const indent = '  '.repeat(this.indentLevel);
        const formattedMessage = indent + message;
        
        // NestJS Logger aufrufen
        switch (level) {
            case 'error':
                this.nestLogger.error(formattedMessage);
                break;
            case 'warn':
                this.nestLogger.warn(formattedMessage);
                break;
            case 'debug':
                this.nestLogger.debug(formattedMessage);
                break;
            case 'verbose':
                this.nestLogger.verbose(formattedMessage);
                break;
            default:
                this.nestLogger.log(formattedMessage);
        }

        // Event emittieren wenn Service und scrapeId verfügbar
        if (this.eventsService && this.scrapeId) {
            this.eventsService.emit({
                type: 'log',
                scrapeId: this.scrapeId,
                runId: this.runId,
                message,
                logLevel: level,
                logContext: this.currentContext
            });
        }
    }

    // Public Logger-Methoden
    log(message: string): void {
        this.emitLog('log', message);
    }

    error(message: string, stack?: string, context?: string): void {
        this.emitLog('error', message);
        if (stack) {
            this.nestLogger.error(stack);
        }
    }

    warn(message: string): void {
        this.emitLog('warn', message);
    }

    debug(message: string): void {
        this.emitLog('debug', message);
    }

    verbose(message: string): void {
        this.emitLog('verbose', message);
    }

    scrape(message: string): void {
        this.emitLog('log', message);
    }
}
