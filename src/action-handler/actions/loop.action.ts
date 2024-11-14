import { Page } from "puppeteer";
import { Action } from "../decorators/action.decorator";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { ScrapeAction } from "src/scrape/types/scrape-action.interface";
import { ActionHandlerService } from "../action-handler.service";

// Typdefinition für die Parameter der LoopAction
export type LoopActionParams = {
    elementKey: string; // Schlüssel, um Elemente aus dem vorherigen Resultat zu beziehen
    actions: Array<ScrapeAction<unknown>>; // Aktionen, die für jedes Element ausgeführt werden
}

@Action('loop')
export class LoopAction extends BaseAction<LoopActionParams> {
    constructor(page: Page, scrapeAction: ScrapeAction<LoopActionParams>, private actionsHandlerService: ActionHandlerService) {
        super(page, scrapeAction, actionsHandlerService);
    }

    async run(previousData: PreviousData): Promise<void> {
        // super.run(previousData);
        // Hole die Elemente aus dem actionMap mithilfe des angegebenen Schlüssels
        let elements: unknown[] = previousData.get(this.params.elementKey);
        if (!elements || elements.length === 0) {
            this.logger.warn(`No elements found for key: ${this.params.elementKey}`);
            return;
        }

        if(!Array.isArray(elements)) {
            this.logger.warn(`Elements for key ${this.params.elementKey} are not an array`);
            elements = [elements];
        }

        // Iteriere durch die Elemente und führe die angegebenen Aktionen aus
        for (const element of elements) {

            this.logger.log(`Element: ${element}`);

            if(!this.params.actions) {
                this.logger.warn(`No actions provided for loop`);
                return;
            }

            // Führe jede Aktion für das aktuelle Element aus
            for (const actionConfig of this.params.actions) {
                // this.currentLoopElement = element as object;
                this.logger.log(`Executing action: ${actionConfig.action} on ${element}`);

                // previousData.set(`loop-${this.name}`, element);

                // Verwende actionsHandlerService, um die Aktion auszuführen, und übergebe actionMap
                const ret = await this.actionsHandlerService.handleAction(
                    actionConfig,
                    previousData,

                    { currentData: element }
                );
                

                // Logge das Ergebnis, wenn vorhanden
                if (ret !== undefined && ret !== null) {
                    // this.logger.log(`Action "${actionConfig.action}" returned: ${ret}`);
                }
            }
        }

        return;
    }
}

export default LoopAction;
