import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';
import { getValueFromPath } from './_helpers/get-value-from-path.helper';
import { BreakLoopError } from '../errors/break-loop.error';

export type SkipIfParams = {
  /** Key in previousData dessen Wert geprüft wird */
  condition: string;
  /** Wenn true, wird die Aktion ausgeführt wenn condition truthy ist */
  skipIfTrue?: boolean;
  /** Wenn true, wird die Aktion ausgeführt wenn condition falsy ist */
  skipIfFalse?: boolean;
  /** Wenn true, wird die gesamte Loop abgebrochen statt nur die Iteration zu überspringen */
  breakLoop?: boolean;
  /** Anzahl der Loop-Ebenen die abgebrochen werden sollen (default: 1). Nur relevant wenn breakLoop=true */
  breakLevels?: number;
  /** Optionale Nachricht die geloggt wird beim Überspringen/Abbrechen */
  message?: string;
};

/**
 * Setzt ein Flag, das von der Loop-Action geprüft werden kann um zur nächsten Iteration zu springen
 * oder die gesamte Loop abzubrechen.
 *
 * @example
 * // Überspringe Iteration wenn Datei bereits existiert
 * { "condition": "fileExists", "skipIfTrue": true, "message": "Datei existiert bereits" }
 *
 * @example
 * // Breche Loop ab wenn Datei existiert (für inkrementelles Scraping)
 * { "condition": "fileExists", "skipIfTrue": true, "breakLoop": true, "message": "Bereits heruntergeladen" }
 *
 * @example
 * // Breche 2 Loop-Ebenen ab (z.B. orderLoop UND pageLoop)
 * { "condition": "fileExists", "skipIfTrue": true, "breakLoop": true, "breakLevels": 2 }
 */
@Action('skipIf', {
  displayName: 'Skip If',
  icon: 'SkipForward',
  description: 'Skip remaining actions if condition is met',
  color: 'rose',
  category: 'flow',
})
export class SkipIfAction extends BaseAction<SkipIfParams> {
  async run(): Promise<boolean> {
    const {
      condition,
      breakLoop = false,
      breakLevels = 1,
      message,
    } = this.params;

    // Wenn skipIfFalse explizit gesetzt ist, setze skipIfTrue auf false (und umgekehrt)
    // Das verhindert, dass beide true sind wenn nur einer gesetzt wurde
    const skipIfFalse = this.params.skipIfFalse ?? false;
    const skipIfTrue = this.params.skipIfTrue ?? (skipIfFalse ? false : true);

    // Hole den Wert aus previousData oder data
    let conditionValue = this.previousData.get(condition);

    // Falls nicht in previousData, versuche in data (für currentData.xxx Pfade)
    if (conditionValue === undefined) {
      conditionValue = getValueFromPath(this.data, condition);
    }

    const isTruthy = Boolean(conditionValue);
    const shouldAct = (skipIfTrue && isTruthy) || (skipIfFalse && !isTruthy);

    if (shouldAct) {
      if (breakLoop) {
        const logMessage =
          message ||
          `🛑 Breaking loop: condition "${condition}" = ${conditionValue}`;
        this.logger.log(logMessage);
        // Wirf BreakLoop Error mit Anzahl der Ebenen
        throw new BreakLoopError(breakLevels);
      } else {
        const logMessage =
          message ||
          `⏭️ Skipping: condition "${condition}" = ${conditionValue}`;
        this.logger.log(logMessage);

        // Setze ein Flag in data, das von der Loop geprüft werden kann
        if (this.data) {
          this.data.skipCurrentIteration = true;
        }
      }
    } else {
      this.logger.debug(
        `➡️ Continuing: condition "${condition}" = ${conditionValue}`,
      );
    }

    return shouldAct;
  }
}

export default SkipIfAction;
