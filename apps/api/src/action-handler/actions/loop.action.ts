import { Page } from 'puppeteer';
import { BaseAction } from './bases/base.action';
import { PreviousData } from '../types/previous-data.type';
import { ScrapeAction } from '../../scrape/types/scrape-action.interface';
import { ActionHandlerService } from '../action-handler.service';
import { Action } from '../_decorators/action.decorator';
import { ScrapeActionData } from '../../scrape/types/scrape-action-data.interface';
import { PuppeteerService } from '../../puppeteer/puppeteer.service';
import { BreakLoopError } from '../errors/break-loop.error';

export type LoopActionParams = {
  elementKey: string;
  actions: Array<ScrapeAction<unknown>>;
  reverse: boolean;
};

@Action('loop', {
  displayName: 'Loop',
  icon: 'Repeat',
  description: 'Iterate over a list of elements or values',
  color: 'amber',
  category: 'flow',
})
export class LoopAction extends BaseAction<LoopActionParams> {
  constructor(
    page: Page,
    previousData: PreviousData,
    scrapeAction: ScrapeAction<LoopActionParams>,
    protected actionsHandlerService: ActionHandlerService,
    protected puppeteerService: PuppeteerService,
    data?: ScrapeActionData,
    storedData?: ScrapeActionData,
  ) {
    super(
      page,
      previousData,
      scrapeAction,
      actionsHandlerService,
      puppeteerService,
      data,
      storedData,
    );
  }

  async run(): Promise<any> {
    // Hole die Elemente aus dem actionMap mithilfe des angegebenen Schlüssels
    let elements: unknown[] = this.previousData.get(this.params.elementKey);
    if (!elements || elements.length === 0) {
      this.logger.warn(`No elements found for key: ${this.params.elementKey}`);
      return { iterations: [], total: 0 };
    }

    if (!Array.isArray(elements)) {
      this.logger.warn(
        `Elements for key ${this.params.elementKey} are not an array`,
      );
      elements = [elements];
    }

    if (this.params.reverse == true) {
      elements = elements.reverse();
      this.logger.log(`🔙 Looping in reversed order`);
    }

    // Hole scrapeEventsService, scrapeId und runId für Live-Updates
    const scrapeEventsService = this.data?.scrapeEventsService;
    const scrapeId = this.data?.scrapeId;
    const runId = this.data?.runId;

    // Speichere den aktuellen loopPath (vor dieser Loop)
    const parentLoopPath = this.data?.loopPath ? [...this.data.loopPath] : [];

    // Array zum Speichern der Loop-Iterationsdaten
    const iterations: Array<{
      index: number;
      value: unknown;
      status: string;
      childActions: Array<{
        name: string;
        actionType?: string;
        status: string;
        result?: any;
        error?: string;
      }>;
    }> = [];

    // Iteriere durch die Elemente und führe die angegebenen Aktionen aus
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const iterationData = {
        index: i,
        value: element,
        status: 'running',
        childActions: [] as Array<{
          name: string;
          actionType?: string;
          status: string;
          result?: any;
          error?: string;
        }>,
      };

      // Aktualisiere den loopPath für diese Iteration
      const currentLoopPath = [
        ...parentLoopPath,
        { name: this.name, index: i },
      ];
      this.data.loopPath = currentLoopPath;

      // Emit Loop-Iteration Event
      if (scrapeEventsService && scrapeId) {
        const loopValue =
          typeof element === 'string' || typeof element === 'number'
            ? String(element)
            : `Element ${i + 1}`;
        scrapeEventsService.updateLoopIteration(
          scrapeId,
          this.name,
          i,
          elements.length,
          loopValue,
          runId,
          parentLoopPath, // Sende den Parent-Loop-Pfad
        );
      }

      // Setze Einrückungstiefe basierend auf Loop-Pfad
      this.logger.setIndentLevel(currentLoopPath.length - 1);
      this.logger.log(
        `🔄 Loop "${this.name}": Iteration ${i + 1}/${elements.length}`,
      );

      if (!this.params.actions) {
        this.logger.warn(`No actions provided for loop`);
        return;
      }

      this.logger.indent();

      for (const actionConfig of this.params.actions) {
        this.data.currentData[this.name] = { value: element, index: i };

        try {
          const ret = await this.actionsHandlerService.handleAction(
            actionConfig,
            this.previousData,
            this.data,
            this.storedData,
          );

          // Sammle Child-Action Daten (lightweight - keine result-Kopie)
          iterationData.childActions.push({
            name: actionConfig.name,
            actionType: actionConfig.action,
            status: 'completed',
          });

          // Prüfe ob skipCurrentIteration gesetzt wurde (von skipIf Action)
          if (this.data.skipCurrentIteration) {
            this.logger.debug(
              `⏭️ Skipping remaining actions in iteration ${i + 1}`,
            );
            this.data.skipCurrentIteration = false; // Reset für nächste Iteration
            break; // Breche die innere Schleife ab (Actions), gehe zur nächsten Iteration
          }

          // Speichere Ergebnis in previousData
          if (ret !== undefined && ret !== null) {
            this.previousData.set(actionConfig.name, ret);
          }
        } catch (error) {
          // Sammle Child-Action Error
          const errorMessage =
            error instanceof Error
              ? error.message
              : typeof error === 'string'
                ? error
                : JSON.stringify(error);

          iterationData.childActions.push({
            name: actionConfig.name,
            actionType: actionConfig.action,
            status: 'failed',
            error: errorMessage,
            result: null,
          });

          if (error instanceof BreakLoopError) {
            if (error.breakLevels > 1) {
              // Reduziere die Ebenen und wirf weiter an äußere Loop
              this.logger.warn(
                `🛑 Breaking loop "${this.name}" (${error.breakLevels - 1} more levels to break)`,
              );
              iterationData.status = 'broken';
              iterations.push(iterationData);
              throw new BreakLoopError(error.breakLevels - 1);
            } else {
              // Letzte Ebene - beende nur diese Loop
              this.logger.warn(`🛑 Breaking loop "${this.name}"`);
              iterationData.status = 'broken';
              iterations.push(iterationData);
              return { iterations, total: elements.length, current: i + 1 };
            }
          }

          // Bei allen anderen Fehlern: Iteration als failed markieren und zurückgeben
          this.logger.error(
            `Error executing action "${actionConfig.action}": ${errorMessage}`,
          );
          iterationData.status = 'failed';
          iterations.push(iterationData);

          // Gebe Loop-Daten zurück bevor Error geworfen wird, damit sie gespeichert werden
          // Der Error wird dann vom Caller behandelt
          throw error;
        }
      }

      iterationData.status = 'completed';
      iterations.push(iterationData);

      // Emit Loop-Iteration Completed Event
      if (scrapeEventsService && scrapeId) {
        const loopValue =
          typeof element === 'string' || typeof element === 'number'
            ? String(element)
            : `Element ${i + 1}`;
        scrapeEventsService.updateLoopIteration(
          scrapeId,
          this.name,
          i,
          elements.length,
          loopValue,
          runId,
          parentLoopPath,
          'completed',
        );
      }

      this.logger.outdent();
    }

    // Setze den loopPath zurück auf den Zustand vor dieser Loop
    this.data.loopPath = parentLoopPath;

    this.logger.log(
      `✅ Loop "${this.name}" completed all ${elements.length} iterations`,
    );
    return { iterations, total: elements.length, current: elements.length };
  }
}

export default LoopAction;
