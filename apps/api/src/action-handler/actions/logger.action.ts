import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";
import { LogLevel } from "@nestjs/common";
import { Action } from "../_decorators/action.decorator";

export type ExtractActionParams = {
    message: string;
    level: LogLevel;
}

@Action('logger', {
    displayName: 'Logger',
    icon: 'FileText',
    description: 'Log a message to the console',
    color: 'slate',
    category: 'utility'
})
export class LoggerAction extends BaseAction<ExtractActionParams> {

    // Verwende den `params`-Typ aus `BaseAction` ohne ihn erneut zu definieren
    async run(): Promise<void> {

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
