import { Injectable, Logger } from '@nestjs/common';
import { VariablesService } from '../../variables/variables.service';

/**
 * Strategy für Variable Resolution
 * Löst Variablen aus verschiedenen Quellen auf und merged sie
 */
@Injectable()
export class VariableResolutionStrategy {
    private readonly logger = new Logger(VariableResolutionStrategy.name);

    constructor(private readonly variablesService: VariablesService) {}

    /**
     * Löst Variablen aus DB und Runtime auf
     * Runtime-Variablen überschreiben DB-Variablen
     */
    async resolve(
        scrapeId?: string,
        runVariables?: Record<string, any>
    ): Promise<Record<string, any>> {
        // Starte mit leerer Map
        const variablesMap: Record<string, any> = {};

        // Lade DB-Variablen falls scrapeId vorhanden
        if (scrapeId) {
            const dbVariablesMap = await this.variablesService.getAsMap(scrapeId);
            Object.assign(variablesMap, dbVariablesMap);
            this.logger.debug(`🗄️ Loaded ${Object.keys(dbVariablesMap).length} DB variables`);
        }

        // Runtime-Variablen überschreiben DB-Variablen
        if (runVariables && Object.keys(runVariables).length > 0) {
            Object.assign(variablesMap, runVariables);
            this.logger.debug(`✨ Applied ${Object.keys(runVariables).length} runtime variables (overriding DB values)`);
        }

        this.logger.debug(`🔧 Final variables map: ${JSON.stringify(variablesMap)}`);
        return variablesMap;
    }

    /**
     * Validiert ob alle erforderlichen Variablen vorhanden sind
     */
    validate(
        variablesMap: Record<string, any>,
        requiredVariables: string[]
    ): { valid: boolean; missing: string[] } {
        const missing: string[] = [];

        for (const required of requiredVariables) {
            if (!(required in variablesMap)) {
                missing.push(required);
            }
        }

        return {
            valid: missing.length === 0,
            missing
        };
    }
}
