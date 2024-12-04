import { Logger } from "@nestjs/common";
import { Page } from "puppeteer";
import { ScrapeAction } from "src/scrape/types/scrape-action.interface";
import { ActionName } from "../actions.mapping";

import { PreviousData } from "src/action-handler/types/previous-data.type";
import { ActionHandlerService } from "src/action-handler/action-handler.service";
import Handlebars from "../_helpers/handlebars.helper";
import { ScrapeActionData } from "src/scrape/types/scrape-action-data.interface";
import { PuppeteerService } from "src/puppeteer/puppeteer.service";

export abstract class BaseAction<TParams extends Record<string, any>> implements ScrapeAction<TParams> {
    protected readonly logger: Logger;
    protected page: Page;

    protected scrapeAction: ScrapeAction<TParams>;
    readonly originalParams: TParams; // Original, unveränderte Parameter

    protected previousData: PreviousData;


    protected readonly puppeteerService: PuppeteerService;

    protected storedData: object;
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
        storedData?: object
    ) {
        this.page = page;
        this.name = scrapeAction.name;
        this.previousData = previousData;
        this.storedData = storedData;
        this.scrapeAction = scrapeAction;
        this.puppeteerService = puppeteerService;

        this.originalParams = { ...scrapeAction.params }; // Kopiere die Original-Parameter
        this.params = { ...scrapeAction.params }; // Initiale Kopie der Parameter

        if (data) {
            this.data = data;
        }

        this.logger = new Logger(this.name ? `${this.constructor.name}|${this.name}` : this.constructor.name);
        this.logger.log(`⭐️ Action ${this.constructor.name} created`);

        // this.params = this.compileDeep(this.originalParams, previousActions, this.data, this.logger);
        for (const [key, value] of Object.entries(this.params)) {
            if (typeof value === "string") {
                this.logger.log(`Parameter ${key}: ${value}`);
                const previousDataObject = Object.fromEntries(previousData);
        
                // Kompilieren des Templates und Ausführen
                const templateResult = Handlebars.compile(value)({
                    previousData: previousDataObject,
                    ...this.data,
                    storedData: this.storedData,
                });
        
                // Prüfung, ob die Rückgabe true/false ist und ggf. Konvertierung
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

    // Methode zur dynamischen Auflösung der Parameter
    abstract run(): Promise<any>;

    // Rekursive Funktion zur Kompilierung der Parameter
    // compileDeep(
    //     data: any,
    //     previousData: any,
    //     currentData: any,
    //     storedData: any,
    //     logger?: Logger
    // ): TParams {
    //     if (typeof data === "object" && data !== null) {
    //         // Falls das aktuelle `data` ein Objekt oder Array ist, rekursiv über alle Schlüssel/Werte iterieren
    //         const compiledObject: any = Array.isArray(data) ? [] : {};
    //         Object.entries(data).forEach(([key, value]) => {
    //             if (logger) {
    //                 logger.debug(`Compiling parameter ${key}: ${value}`);
    //             }
    //             compiledObject[key] = this.compileDeep(value, previousData, currentData, storedData, logger);
    //         });
    //         return compiledObject;
    //     } else if (typeof data === "string") {
    //         // Falls `data` ein String ist, versuche, ihn als Handlebars-Template zu kompilieren
    //         return Handlebars.compile(data)({
    //             previousData,
    //             storedData,
    //             ...currentData,
    //         }) as TParams[keyof TParams];
    //     } else {
    //         // Falls `data` ein primitiver Wert (z.B. number, boolean) ist, gib ihn direkt zurück
    //         return data;
    //     }
    // }

}
