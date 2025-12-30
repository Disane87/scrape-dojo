import { Injectable, Logger } from '@nestjs/common';
import { Scrape } from '../types/scrape.interface';
import { SecretsService } from '../../secrets/secrets.service';

@Injectable()
export class ScrapeSecretsResolverService {
    private readonly logger = new Logger(ScrapeSecretsResolverService.name);

    constructor(private readonly secretsService: SecretsService) { }

    /**
     * Löst Secrets aus Workflow-Variablen auf und speichert sie in previousData
     */
    async resolveSecretsForWorkflow(scrape: Scrape, previousData: Map<string, any>): Promise<void> {
        const variables = scrape.metadata?.variables;

        if (!this.hasVariables(variables)) {
            return;
        }

        for (const variable of variables) {
            const varKey = `var_${variable.name}`;

            // Skip wenn Variable bereits einen Wert hat (vom User eingegeben)
            if (this.hasExistingValue(previousData, varKey)) {
                this.logger.debug(`📝 Variable '${variable.name}' already has value from user input`);
                continue;
            }

            // Löse Secret auf, falls secretRef definiert ist
            if (variable.secretRef) {
                await this.resolveSecret(variable.secretRef, variable.name, varKey, previousData);
            }

            // Verwende Default-Wert, falls immer noch kein Wert gesetzt wurde
            this.applyDefaultValue(variable, varKey, previousData);
        }
    }

    /**
     * Prüft ob Variablen-Definitionen vorhanden sind
     */
    private hasVariables(variables: any): boolean {
        return variables && Array.isArray(variables) && variables.length > 0;
    }

    /**
     * Prüft ob Variable bereits einen Wert hat
     */
    private hasExistingValue(previousData: Map<string, any>, varKey: string): boolean {
        return previousData.has(varKey) && !!previousData.get(varKey);
    }

    /**
     * Löst ein Secret auf und speichert den Wert in previousData
     */
    private async resolveSecret(
        secretRef: string,
        variableName: string,
        varKey: string,
        previousData: Map<string, any>
    ): Promise<void> {
        try {
            const secret = await this.secretsService.getSecretByName(secretRef);

            if (!secret) {
                this.logger.warn(`⚠️ Secret '${secretRef}' not found for variable '${variableName}'`);
                return;
            }

            const secretValue = await this.secretsService.getSecretValue(secret.id);

            if (!secretValue) {
                this.logger.warn(`⚠️ Secret '${secretRef}' exists but has no value`);
                return;
            }

            previousData.set(varKey, secretValue);
            this.logger.debug(`🔐 Resolved secret '${secretRef}' → var_${variableName}`);
        } catch (error) {
            this.logger.error(`❌ Failed to resolve secret '${secretRef}': ${error.message}`);
        }
    }

    /**
     * Wendet Default-Wert an, falls vorhanden und noch kein Wert gesetzt
     */
    private applyDefaultValue(
        variable: any,
        varKey: string,
        previousData: Map<string, any>
    ): void {
        const hasNoValue = !previousData.has(varKey) || !previousData.get(varKey);
        const hasDefault = variable.default !== undefined;

        if (hasNoValue && hasDefault) {
            previousData.set(varKey, variable.default);
            this.logger.debug(`📋 Using default value for '${variable.name}'`);
        }
    }
}
