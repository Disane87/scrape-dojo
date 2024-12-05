import { Page } from "puppeteer";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { ScrapeAction } from "src/scrape/types/scrape-action.interface";
import { ActionHandlerService } from "../action-handler.service";
import { Action } from "../_decorators/action.decorator";
import { ScrapeActionData } from "src/scrape/types/scrape-action-data.interface";
import { PuppeteerService } from "src/puppeteer/puppeteer.service";

import * as fs from 'fs';
import * as path from 'path';

// Typdefinition für die Parameter der LoopAction
export type LoopActionParams = {
    elementKey: string; // Schlüssel, um Elemente aus dem vorherigen Resultat zu beziehen
    actions: Array<ScrapeAction<unknown>>; // Aktionen, die für jedes Element ausgeführt werden
    reverse: boolean; // Optional: Elemente in umgekehrter Reihenfolge durchlaufen
}

@Action('loop')
export class LoopAction extends BaseAction<LoopActionParams> {
    constructor(
        page: Page,
        previousData: PreviousData,
        scrapeAction: ScrapeAction<LoopActionParams>,
        protected actionsHandlerService: ActionHandlerService,
        protected puppeteerService: PuppeteerService,
        data?: ScrapeActionData,
        storedData?: ScrapeActionData
    ) {
        super(page, previousData, scrapeAction, actionsHandlerService, puppeteerService, data, storedData);
    }

    async run(): Promise<void> {
        // Hole die Elemente aus dem actionMap mithilfe des angegebenen Schlüssels
        let elements: unknown[] = this.previousData.get(this.params.elementKey);
        if (!elements || elements.length === 0) {
            this.logger.warn(`No elements found for key: ${this.params.elementKey}`);
            return;
        }

        if (!Array.isArray(elements)) {
            this.logger.warn(`Elements for key ${this.params.elementKey} are not an array`);
            elements = [elements];
        }

        if(this.params.reverse == true) {   
            elements = elements.reverse();
            this.logger.log(`🔙 Looping in reversed order`);
        }

        // Iteriere durch die Elemente und führe die angegebenen Aktionen aus
        for (const element of elements) {

            this.logger.log(`Element: ${element}`);
            const content = await this.page.evaluate((el: HTMLElement) => el.innerHTML, element);

            if (!this.params.actions) {
                this.logger.warn(`No actions provided for loop`);
                return;
            }
            this.logger.log(`Starting loop`);

            // Führe jede Aktion für das aktuelle Element aus
            for (const actionConfig of this.params.actions) {
                // this.currentLoopElement = element as object;
                this.logger.log(`Executing action: ${actionConfig.action} on ${element}`);

                // // previousData.set(`loop-${this.name}`, element);
                // this.data = {
                //     currentData: {
                //         [this.name]: element
                //         ...this.data?.currentData, // Verwende den Spread-Operator korrekt
                //       [this.name]: element
                //     },
                //   };


                this.data.currentData[this.name] = { value: element, index: elements.indexOf(element) };
                // this.data.storedData[this.name] = {
                //     [element as string]: {}
                //   };

                // Verwende actionsHandlerService, um die Aktion auszuführen, und übergebe actionMap

                try{
                    const ret = await this.actionsHandlerService.handleAction(
                        actionConfig,
                        this.previousData,
                        this.data,
                        this.storedData
                    );

                     // Logge das Ergebnis, wenn vorhanden
                    if (ret !== undefined && ret !== null) {
                        this.logger.log(`Action "${actionConfig.action}" returned: ${ret}`);
                        this.previousData.set(actionConfig.name, ret);
                    }
    
                } catch(error) {
                    if (error.message === 'BreakLoop') {
                        this.logger.warn(`Breaking loop "${this.name}"`);
                        throw error;
                    }
                    this.logger.error(`Error executing action: ${actionConfig.action}`);
                    throw new Error(error);

                }
            
                this.data.currentData[this.name] = null;
            }

            this.logger.log(`Loop completed`);
        }
        return;
    }
}

export default LoopAction;
