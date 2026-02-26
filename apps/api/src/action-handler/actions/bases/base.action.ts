import { Page } from "puppeteer";
import { ScrapeAction } from "../../../scrape/types/scrape-action.interface";
import { ActionName } from "../actions.mapping";
import { PreviousData } from "../../types/previous-data.type";
import { ActionHandlerService } from "../../action-handler.service";
import Handlebars from "../_helpers/handlebars.helper";
import { ScrapeActionData } from "../../../scrape/types/scrape-action-data.interface";
import { PuppeteerService } from "../../../puppeteer/puppeteer.service";
import { ScrapeLogger } from "../../../_logger/scrape-logger.service";

export abstract class BaseAction<TParams extends Record<string, any>> implements ScrapeAction<TParams> {
    protected readonly logger: ScrapeLogger;
    protected page: Page;

    protected scrapeAction: ScrapeAction<TParams>;
    readonly originalParams: TParams; // Original, unveränderte Parameter

    protected previousData: PreviousData;


    protected readonly puppeteerService: PuppeteerService;

    protected storedData: object = {};
    protected variables: Record<string, string> = {};
    params: TParams; // Dynamisch aufgelöste Parameter, jetzt schreibbar

    data: ScrapeActionData = {
        currentData: {},
        storedData: {}
    };

    constructor(
        page: Page,
        previousData: PreviousData,
        scrapeAction: ScrapeAction<TParams>,
        actionHandlerService: ActionHandlerService,
        puppeteerService: PuppeteerService,
        data?: ScrapeActionData,
        storedData?: object,
        variables?: Record<string, string>
    ) {
        this.page = page;
        this.name = scrapeAction.name;
        this.previousData = previousData;
        this.storedData = storedData;
        this.variables = variables || {};
        this.scrapeAction = scrapeAction;
        this.puppeteerService = puppeteerService;

        this.originalParams = { ...scrapeAction.params }; // Kopiere die Original-Parameter
        this.params = { ...scrapeAction.params }; // Initiale Kopie der Parameter

        if (data) {
            this.data = data;
        }

        // ScrapeLogger mit Event-Support erstellen
        const logContext = this.name ? `${this.constructor.name}|${this.name}` : this.constructor.name;
        this.logger = new ScrapeLogger();
        this.logger.setContext(logContext);
        this.logger.setEventContext(
            this.data?.scrapeEventsService,
            this.data?.scrapeId,
            this.data?.runId
        );
        this.logger.debug(`⭐️ Action initialized`);

        // Build handlebars context once (lazy, only if needed)
        let handlebarsContext: any = null;
        const getHandlebarsContext = () => {
            if (!handlebarsContext) {
                handlebarsContext = {
                    previousData: Object.fromEntries(previousData),
                    currentData: this.data?.currentData || {},
                    storedData: this.storedData,
                    variables: this.variables,
                };
            }
            return handlebarsContext;
        };

        for (const [key, value] of Object.entries(this.params)) {
            if (typeof value === "string") {
                // Skip template parameter - it should be rendered later with the actual data context
                if (key === 'template') {
                    continue;
                }

                // Skip strings without any template syntax
                if (!value.includes('{{')) {
                    continue;
                }

                const ctx = getHandlebarsContext();

                // Prüfe, ob der Wert eine direkte Referenz ist (z.B. "{{ previousData.xyz }}")
                const directRefMatch = value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
                if (directRefMatch) {
                    const path = directRefMatch[1].trim();
                    const resolvedValue = this.resolvePathInContext(path, ctx);

                    if (resolvedValue !== undefined) {
                        (this.params as any)[key] = resolvedValue;
                        continue;
                    }
                }

                const templateResult = Handlebars.compile(value)(ctx);

                if (typeof templateResult === "string") {
                    const lowerResult = templateResult.toLowerCase();
                    if (lowerResult === "true" || lowerResult === "false") {
                        (this.params as any)[key] = lowerResult === "true";
                    } else {
                        (this.params as any)[key] = templateResult;
                    }
                } else {
                    (this.params as any)[key] = Boolean(templateResult);
                }
            }
        }

    }

    name: string;
    action: ActionName;

    /**
     * Löst einen Pfad wie "previousData.xyz" oder "currentData.abc.def" im Handlebars-Context auf
     */
    private resolvePathInContext(path: string, context: any): any {
        const parts = path.split('.');
        let current = context;
        
        for (const part of parts) {
            if (current === undefined || current === null) {
                return undefined;
            }
            current = current[part];
        }
        
        return current;
    }

    // Methode zur dynamischen Auflösung der Parameter
    abstract run(): Promise<any>;
}
