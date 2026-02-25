import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { watch, FSWatcher } from 'node:fs';
import { join } from 'path';
import { existsSync, statSync } from 'fs';
import type { Page } from 'puppeteer';

export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

export type ActionStatus = 'pending' | 'running' | 'completed' | 'error' | 'waiting' | 'skipped';

export interface ScrapeEvent {
    type: 'step-status' | 'action-status' | 'otp-required' | 'otp-received' | 'scrape-start' | 'scrape-end' | 'loop-iteration' | 'error' | 'reload' | 'log' | 'notification' | 'config-reload';
    scrapeId: string;
    runId?: string; // Eindeutige ID für jeden Scrape-Lauf
    stepName?: string;
    stepIndex?: number;
    actionName?: string;
    actionIndex?: number;
    actionType?: string;
    status?: ActionStatus;
    message?: string;
    error?: string;
    result?: unknown; // Ergebnis der Action
    loopName?: string;
    loopIndex?: number;
    loopTotal?: number;
    loopValue?: string;
    /** Pfad zu verschachtelten Loops: [{name: 'pageLoop', index: 0}, {name: 'pdfLoop', index: 3}] */
    loopPath?: Array<{ name: string; index: number }>;
    timestamp: number;
    // Log-spezifische Felder
    logLevel?: LogLevel;
    logContext?: string;
    // Notification-spezifische Felder
    notification?: NotificationData;
    /** Variablen-Informationen beim Scrape-Start */
    variables?: {
        /** Variablen aus dem Run-Dialog */
        runtime?: Record<string, any>;
        /** Variablen aus der Datenbank */
        database?: Record<string, any>;
        /** Finales gemergtes Resultat (runtime überschreibt database) */
        final?: Record<string, any>;
    };
}

export interface OtpAlternative {
    id: string;
    label: string;
    selector: string;
    icon?: string;
}

export interface OtpRequest {
    scrapeId: string;
    requestId: string;
    message: string;
    selector: string;
    alternatives?: OtpAlternative[];
}

export interface NotificationData {
    notificationId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    iconUrl?: string;
    browserNotification?: boolean;
    autoDismiss?: number;
}

@Injectable()
export class ScrapeEventsService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ScrapeEventsService.name);

    private eventSubject = new Subject<ScrapeEvent>();

    private pendingOtpRequests = new Map<string, { resolve: (code: string) => void; page: Page; alternatives?: OtpAlternative[] }>();
    private fileWatchers: FSWatcher[] = [];
    private reloadDebounce: NodeJS.Timeout | null = null;

    // In-Memory Buffer für Workflow-Events (für Reload-Persistenz)
    private workflowEventsBuffer: ScrapeEvent[] = [];
    private readonly maxWorkflowEvents = 1000;

    // Log-Level Filter für SSE-Stream (debug und verbose werden nicht gestreamt)
    private readonly streamLogLevels: LogLevel[] = ['log', 'warn', 'error'];

    onModuleInit() {
        // Nur im Development-Modus aktivieren
        if (process.env.SCRAPE_DOJO_NODE_ENV !== 'production') {
            this.startFileWatcher();
        }
    }

    onModuleDestroy() {
        this.fileWatchers.forEach(watcher => watcher.close());
        this.fileWatchers = [];
    }

    /**
     * File-Watcher für HMR-ähnliches Live-Reload
     */
    private startFileWatcher() {
        const watchPaths = [
            join(process.cwd(), 'config', 'sites'),
        ];

        this.logger.log(`👀 Starting file watcher for HMR...`);

        // Verzeichnisse überwachen (rekursiv)
        for (const watchPath of watchPaths) {
            if (existsSync(watchPath) && statSync(watchPath).isDirectory()) {
                try {
                    const watcher = watch(watchPath, { recursive: true }, (eventType, filename) => {
                        if (filename) {
                            const fullPath = join(watchPath, filename);
                            this.logger.debug(`📝 File ${eventType}: ${fullPath}`);
                            this.triggerReload(fullPath);
                        }
                    });
                    this.fileWatchers.push(watcher);
                    this.logger.log(`👀 Watching directory: ${watchPath}`);
                } catch (err) {
                    this.logger.warn(`⚠️ Could not watch ${watchPath}: ${err}`);
                }
            }
        }
    }

    /**
     * Trigger reload mit Debounce
     */
    private triggerReload(changedPath: string) {
        if (this.reloadDebounce) {
            clearTimeout(this.reloadDebounce);
        }

        this.reloadDebounce = setTimeout(() => {
            this.logger.log(`🔄 Triggering reload for: ${changedPath}`);
            this.emit({
                type: 'config-reload',
                scrapeId: '__system__',
                message: `Configuration changed: ${changedPath}`,
            });
        }, 300); // 300ms debounce
    }
    // SSE Connection Tracking
    private activeConnections = 0;
    private lastPingTime = 0;

    /**
     * Observable für alle Scrape-Events
     */
    getEvents(): Observable<ScrapeEvent> {
        return new Observable<ScrapeEvent>((subscriber) => {
            this.activeConnections++;
            this.logger.debug(`📡 SSE client connected. Active connections: ${this.activeConnections}`);

            const subscription = this.eventSubject.asObservable().subscribe(subscriber);

            // Cleanup when client disconnects
            return () => {
                this.activeConnections = Math.max(0, this.activeConnections - 1);
                this.logger.debug(`📡 SSE client disconnected. Active connections: ${this.activeConnections}`);
                subscription.unsubscribe();
            };
        });
    }

    /**
     * Ping zur SSE-Verbindungsprüfung - sendet ein Heartbeat-Event
     */
    pingConnections(): { activeConnections: number; lastPingTime: number } {
        this.lastPingTime = Date.now();

        // Sende Ping-Event an alle Clients
        this.eventSubject.next({
            type: 'log',
            scrapeId: '__system__',
            message: 'ping',
            logLevel: 'debug',
            timestamp: this.lastPingTime
        });

        return {
            activeConnections: this.activeConnections,
            lastPingTime: this.lastPingTime
        };
    }

    /**
     * SSE-Status abrufen
     */
    getConnectionStatus(): { activeConnections: number; lastPingTime: number } {
        return {
            activeConnections: this.activeConnections,
            lastPingTime: this.lastPingTime
        };
    }

    /**
     * Emit eines Events
     */
    emit(event: Omit<ScrapeEvent, 'timestamp'>) {
        const fullEvent: ScrapeEvent = {
            ...event,
            timestamp: Date.now()
        };

        // Log-Events: debug/verbose nicht an SSE-Stream senden (EventLogger schreibt bereits in Datei)
        if (event.type === 'log' && event.logLevel && !this.streamLogLevels.includes(event.logLevel)) {
            return;
        }

        // Workflow-Events im Buffer speichern (für Reload-Persistenz)
        if (event.type !== 'log') {
            this.workflowEventsBuffer.push(fullEvent);
            // Buffer-Größe begrenzen
            if (this.workflowEventsBuffer.length > this.maxWorkflowEvents) {
                this.workflowEventsBuffer.shift();
            }
            this.logger.debug(`📡 Event: ${event.type} - ${event.status || event.message || ''}`);
        }
        this.eventSubject.next(fullEvent);
    }

    /**
     * Log-Event emittieren (wird vom EventLogger aufgerufen)
     */
    emitLog(level: LogLevel, message: string, context: string) {
        const logEvent: ScrapeEvent = {
            type: 'log',
            scrapeId: '',
            message,
            logLevel: level,
            logContext: context,
            timestamp: Date.now()
        };

        // An SSE-Clients senden (EventLogger hat bereits in Datei geschrieben)
        this.eventSubject.next(logEvent);
    }



    /**
     * Gespeicherte Logs aus Datei lesen (delegiert an EventLogger)
     * @deprecated Verwendet EventLogger.readLogs() intern
     */
    getStoredLogs(limit = 500): ScrapeEvent[] {
        // EventLogger verwendet ein anderes Format - konvertiere zu ScrapeEvent
        const EventLogger = require('../_logger/event-logger').EventLogger;
        const logs = EventLogger.readLogs(limit);
        
        return logs.map((log: { timestamp: string; level: string; context: string; message: string }) => ({
            type: 'log' as const,
            scrapeId: '',
            message: log.message,
            logLevel: log.level as LogLevel,
            logContext: log.context,
            timestamp: new Date(log.timestamp).getTime()
        }));
    }

    /**
     * Alle gespeicherten Logs löschen (delegiert an EventLogger)
     */
    clearStoredLogs() {
        const EventLogger = require('../_logger/event-logger').EventLogger;
        EventLogger.clearLogs();
    }

    /**
     * Gespeicherte Workflow-Events aus Buffer lesen
     * Diese Events bleiben bis zum Server-Neustart erhalten
     */
    getWorkflowEvents(limit = 500): ScrapeEvent[] {
        const events = this.workflowEventsBuffer.slice(-limit);
        return events;
    }

    /**
     * Workflow-Events Buffer leeren
     */
    clearWorkflowEvents() {
        this.workflowEventsBuffer = [];
    }

    /**
     * Workflow-Events für einen bestimmten Run löschen
     */
    clearWorkflowEventsForRun(runId: string) {
        const before = this.workflowEventsBuffer.length;
        this.workflowEventsBuffer = this.workflowEventsBuffer.filter(e => e.runId !== runId);
        const after = this.workflowEventsBuffer.length;
        this.logger.debug(`🗑️ Cleared ${before - after} workflow events for run: ${runId}`);
    }

    /**
     * Workflow-Events für einen bestimmten Scrape löschen
     */
    clearWorkflowEventsForScrape(scrapeId: string) {
        const before = this.workflowEventsBuffer.length;
        this.workflowEventsBuffer = this.workflowEventsBuffer.filter(e => e.scrapeId !== scrapeId);
        const after = this.workflowEventsBuffer.length;
        this.logger.debug(`🗑️ Cleared ${before - after} workflow events for scrape: ${scrapeId}`);
    }

    /**
     * Scrape gestartet
     */
    scrapeStarted(scrapeId: string, runId?: string, variables?: { runtime?: Record<string, any>; database?: Record<string, any>; final?: Record<string, any> }) {
        this.emit({
            type: 'scrape-start',
            scrapeId,
            runId,
            message: `Scrape "${scrapeId}" gestartet`,
            variables
        });
    }

    /**
     * Scrape beendet
     */
    scrapeEnded(scrapeId: string, success: boolean, error?: string, runId?: string) {
        this.emit({
            type: 'scrape-end',
            scrapeId,
            runId,
            status: success ? 'completed' : 'error',
            message: success ? `Scrape "${scrapeId}" abgeschlossen` : `Scrape "${scrapeId}" fehlgeschlagen`,
            error
        });
    }

    /**
     * Step-Status aktualisieren
     */
    updateStepStatus(scrapeId: string, stepName: string, stepIndex: number, status: ActionStatus, runId?: string) {
        this.emit({
            type: 'step-status',
            scrapeId,
            runId,
            stepName,
            stepIndex,
            status
        });
    }

    /**
     * Action-Status aktualisieren
     */
    updateActionStatus(
        scrapeId: string,
        stepName: string,
        stepIndex: number,
        actionName: string,
        actionIndex: number,
        actionType: string,
        status: ActionStatus,
        error?: string,
        runId?: string,
        result?: unknown
    ) {
        this.emit({
            type: 'action-status',
            scrapeId,
            runId,
            stepName,
            stepIndex,
            actionName,
            actionIndex,
            actionType,
            status,
            error,
            result
        });
    }

    /**
     * Loop-Iteration aktualisieren
     */
    updateLoopIteration(
        scrapeId: string,
        loopName: string,
        loopIndex: number,
        loopTotal: number,
        loopValue?: string,
        runId?: string,
        loopPath?: Array<{ name: string; index: number }>,
        status: 'running' | 'completed' | 'error' = 'running'
    ) {
        this.emit({
            type: 'loop-iteration',
            scrapeId,
            runId,
            loopName,
            loopIndex,
            loopTotal,
            loopValue,
            loopPath,  // Sende den Parent-Loop-Pfad für verschachtelte Loops
            status,
            message: `🔄 Loop "${loopName}": ${loopIndex + 1}/${loopTotal}${loopPath?.length ? ` (nested in ${loopPath.map(p => p.name).join(' > ')})` : ''} [${status}]`
        });
    }

    /**
     * OTP anfordern - gibt ein Promise zurück das mit dem Code resolved
     */
    async requestOtp(scrapeId: string, message: string, selector: string, runId?: string, page?: Page, alternatives?: OtpAlternative[]): Promise<string> {
        const requestId = `otp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        this.logger.log(`🔐 OTP angefordert: ${requestId}`);

        return new Promise((resolve) => {
            // Speichere den Resolver + Page-Referenz
            this.pendingOtpRequests.set(requestId, { resolve, page, alternatives });

            // Emit das Event
            this.emit({
                type: 'otp-required',
                scrapeId,
                runId,
                message: JSON.stringify({
                    requestId,
                    message,
                    selector,
                    alternatives
                } as OtpRequest)
            });
        });
    }

    /**
     * OTP-Code empfangen (von der UI)
     */
    submitOtp(requestId: string, code: string) {
        this.logger.log(`🔑 OTP empfangen für Request: ${requestId}`);

        const pending = this.pendingOtpRequests.get(requestId);
        if (pending) {
            pending.resolve(code);
            this.pendingOtpRequests.delete(requestId);

            this.emit({
                type: 'otp-received',
                scrapeId: '',
                message: `OTP-Code empfangen`
            });
        } else {
            this.logger.warn(`⚠️ Kein ausstehender OTP-Request für ID: ${requestId}`);
        }
    }

    /**
     * OTP-Alternative ausführen (z.B. WhatsApp-Button klicken)
     */
    async executeOtpAction(requestId: string, selector: string): Promise<boolean> {
        const pending = this.pendingOtpRequests.get(requestId);
        if (!pending?.page) {
            this.logger.warn(`⚠️ Kein ausstehender OTP-Request oder keine Page für ID: ${requestId}`);
            return false;
        }

        try {
            this.logger.log(`🔘 Klicke OTP-Alternative: ${selector}`);
            await pending.page.click(selector);
            this.logger.log(`✅ OTP-Alternative geklickt: ${selector}`);
            return true;
        } catch (error) {
            this.logger.error(`❌ Fehler beim Klicken der OTP-Alternative: ${error.message}`);
            return false;
        }
    }

    /**
     * Send a notification to the frontend
     */
    async sendNotification(
        scrapeId: string,
        runId: string | undefined,
        options: {
            type: 'info' | 'success' | 'warning' | 'error';
            title: string;
            message: string;
            browserNotification?: boolean;
            autoDismiss?: number;
            iconUrl?: string;
        }
    ): Promise<void> {
        const notificationId = `notify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        this.logger.log(`🔔 Sending notification: ${options.title} (${notificationId})`);

        const notification: NotificationData = {
            notificationId,
            type: options.type,
            title: options.title,
            message: options.message,
            iconUrl: options.iconUrl,
            browserNotification: options.browserNotification ?? false,
            autoDismiss: options.autoDismiss ?? 5000
        };

        this.emit({
            type: 'notification',
            scrapeId,
            runId,
            notification,
            message: `${options.type.toUpperCase()}: ${options.title}`
        });
    }
}
