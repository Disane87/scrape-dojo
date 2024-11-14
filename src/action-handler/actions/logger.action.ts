import { Action } from "../decorators/action.decorator";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { LogLevel } from "@nestjs/common";

export type ExtractActionParams = {
    message: string;
    level: LogLevel;
}

@Action('logger')
export class LoggerAction extends BaseAction<ExtractActionParams> {

    // Verwende den `params`-Typ aus `BaseAction` ohne ihn erneut zu definieren
    async run(previousData: PreviousData): Promise<void> {
        super.run(previousData);
        
        if (['log', 'error', 'warn', 'debug', 'verbose'].includes(this.params.level)) {
            // Dynamischer Aufruf der entsprechenden Logger-Methode
            (this.logger as any)[this.params.level](this.params.message);
        } else {
            // Log-Level ist ungültig, Ausgabe einer Warnung
            this.logger.warn(`Invalid log level: ${this.params.level}`);
        }
    }
}

export default LoggerAction;
