import { Injectable, Logger } from '@nestjs/common';
import { Scrape } from '../types/scrape.interface';
import { VariablesService } from '../../variables/variables.service';
import { SecretsService } from '../../secrets/secrets.service';

@Injectable()
export class ScrapeVariablesSyncService {
  private readonly logger = new Logger(ScrapeVariablesSyncService.name);

  constructor(
    private readonly variablesService: VariablesService,
    private readonly secretsService: SecretsService,
  ) {}

  /**
   * Synchronisiert Workflow-Variablen aus den Definitionen in die Datenbank
   */
  async syncWorkflowVariables(scrapes: Scrape[]): Promise<void> {
    const uniqueWorkflows = this.getUniqueWorkflows(scrapes);
    let syncedCount = 0;
    let skippedCount = 0;

    for (const scrape of uniqueWorkflows.values()) {
      if (!this.hasVariables(scrape)) {
        continue;
      }

      const existingVarMap = await this.getExistingVariablesMap(scrape.id);

      for (const varDef of scrape.metadata.variables) {
        try {
          if (existingVarMap.has(varDef.name.toLowerCase())) {
            skippedCount++;
            continue;
          }

          const { isSecret, secretId } = await this.resolveSecretRef(
            varDef.secretRef,
            scrape.id,
            varDef.name,
          );

          await this.variablesService.create({
            name: varDef.name,
            value: String(varDef.default ?? ''),
            description: varDef.description || `Auto-synced from ${scrape.id}`,
            scope: 'workflow',
            workflowId: scrape.id,
            isSecret,
            secretId,
          });

          syncedCount++;
          this.logger.debug(
            `🔄 Synced variable ${varDef.name} for workflow ${scrape.id}`,
          );
        } catch (error) {
          this.logger.warn(
            `⚠️ Failed to sync variable ${varDef.name} for ${scrape.id}: ${error.message}`,
          );
        }
      }
    }

    if (syncedCount > 0) {
      this.logger.log(
        `✅ Synced ${syncedCount} workflow variables (${skippedCount} already existed)`,
      );
    }
  }

  /**
   * Synchronisiert Secrets aus Workflow-Definitionen in die Datenbank
   */
  async syncWorkflowSecrets(scrapes: Scrape[]): Promise<void> {
    const uniqueWorkflows = this.getUniqueWorkflows(scrapes);
    let syncedCount = 0;
    let skippedCount = 0;

    for (const scrape of uniqueWorkflows.values()) {
      if (!this.hasVariables(scrape)) {
        continue;
      }

      for (const varDef of scrape.metadata.variables) {
        if (!varDef.secretRef) {
          continue;
        }

        try {
          const existingSecret = await this.secretsService.getSecretByName(
            varDef.secretRef,
          );

          if (existingSecret) {
            skippedCount++;
            continue;
          }

          await this.secretsService.createSecret(
            varDef.secretRef,
            '',
            `Auto-created from workflow ${scrape.id} for variable ${varDef.name}`,
          );

          syncedCount++;
          this.logger.debug(
            `🔐 Created placeholder secret '${varDef.secretRef}' for workflow ${scrape.id}`,
          );
        } catch (error) {
          this.logger.warn(
            `⚠️ Failed to sync secret ${varDef.secretRef} for ${scrape.id}: ${error.message}`,
          );
        }
      }
    }

    if (syncedCount > 0) {
      this.logger.log(
        `🔐 Synced ${syncedCount} secrets (${skippedCount} already existed)`,
      );
    }
  }

  /**
   * Dedupliziert Workflows nach ID
   */
  private getUniqueWorkflows(scrapes: Scrape[]): Map<string, Scrape> {
    const uniqueWorkflows = new Map<string, Scrape>();
    for (const scrape of scrapes) {
      uniqueWorkflows.set(scrape.id, scrape);
    }
    return uniqueWorkflows;
  }

  /**
   * Prüft ob ein Scrape Variablen-Definitionen hat
   */
  private hasVariables(scrape: Scrape): boolean {
    return scrape.metadata?.variables && scrape.metadata.variables.length > 0;
  }

  /**
   * Holt existierende Variablen als Map (name lowercased)
   */
  private async getExistingVariablesMap(
    workflowId: string,
  ): Promise<Map<string, any>> {
    const existingVars = await this.variablesService.getByWorkflow(workflowId);
    const map = new Map<string, any>();

    for (const v of existingVars) {
      map.set(v.name.toLowerCase(), v);
    }

    return map;
  }

  /**
   * Löst secretRef auf und erstellt ggf. Placeholder-Secret
   */
  private async resolveSecretRef(
    secretRef: string | undefined,
    workflowId: string,
    varName: string,
  ): Promise<{ isSecret: boolean; secretId?: string }> {
    if (!secretRef) {
      return { isSecret: false };
    }

    const allSecrets = await this.secretsService.listSecrets();
    let secret = allSecrets.find(
      (s) => s.name.toLowerCase() === secretRef.toLowerCase(),
    );

    if (!secret) {
      const created = await this.secretsService.createSecret(
        secretRef,
        '',
        `Auto-created from workflow ${workflowId} for variable ${varName}`,
      );
      secret = created;
      this.logger.debug(
        `🔐 Created placeholder secret '${secretRef}' for workflow ${workflowId}`,
      );
    } else {
      this.logger.debug(
        `🔐 Found existing secret '${secret.name}' for workflow ${workflowId}`,
      );
    }

    return {
      isSecret: true,
      secretId: secret.id,
    };
  }
}
