import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Scrape } from '../types/scrape.interface';
import { RunTrigger } from '../../database/entities';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ScrapeValidationService {
  private readonly logger = new Logger(ScrapeValidationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Validiert ob ein Scrape ausgeführt werden kann
   */
  async validateScrape(scrape: Scrape, trigger: RunTrigger): Promise<void> {
    this.checkIfDisabled(scrape);
    this.checkTriggerAllowed(scrape, trigger);
    await this.checkRequiredSecrets(scrape);
  }

  /**
   * Prüft ob Scrape deaktiviert ist
   */
  private checkIfDisabled(scrape: Scrape): void {
    if (scrape.metadata?.disabled) {
      this.logger.warn(
        `🚫 Scrape "${scrape.id}" is disabled and cannot be run`,
      );
      throw new Error(`Scrape "${scrape.id}" is disabled`);
    }
  }

  /**
   * Prüft ob der Trigger-Typ erlaubt ist
   */
  private checkTriggerAllowed(scrape: Scrape, trigger: RunTrigger): void {
    const allowedTriggers = scrape.metadata?.triggers?.map((t) => t.type) || [];

    // Wenn keine Triggers definiert sind, ist der Scrape implizit inaktiv
    if (allowedTriggers.length === 0) {
      this.logger.warn(`🚫 Scrape "${scrape.id}" has no triggers configured`);
      throw new Error(
        `Scrape "${scrape.id}" has no triggers configured. Add at least one trigger to the metadata.`,
      );
    }

    const mappedTrigger = this.mapTriggerType(trigger);

    if (!allowedTriggers.includes(mappedTrigger as any)) {
      this.logger.warn(
        `🚫 Trigger type "${trigger}" not allowed for scrape "${scrape.id}". Allowed: ${allowedTriggers.join(', ')}`,
      );
      throw new Error(
        `Trigger type "${trigger}" is not configured for scrape "${scrape.id}". Allowed triggers: ${allowedTriggers.join(', ')}`,
      );
    }
  }

  /**
   * Prüft ob alle erforderlichen Secrets existieren
   */
  private async checkRequiredSecrets(scrape: Scrape): Promise<void> {
    const requiredSecrets = (scrape.metadata?.variables || [])
      .filter((v) => v.required && v.secretRef)
      .map((v) => v.secretRef!);

    if (requiredSecrets.length === 0) {
      return;
    }

    const allSecrets = await this.databaseService.getAllSecrets();
    const existingSecretNames = allSecrets.map((s) => s.name);
    const missingSecrets = requiredSecrets.filter(
      (name) => !existingSecretNames.includes(name),
    );

    if (missingSecrets.length > 0) {
      this.logger.error(
        `❌ Scrape "${scrape.id}" requires missing secrets: ${missingSecrets.join(', ')}`,
      );
      throw new BadRequestException(
        `Missing required secrets: ${missingSecrets.join(', ')}. Please create them in the Secrets Manager before running this scrape.`,
      );
    }

    this.logger.log(
      `✅ All required secrets exist for scrape "${scrape.id}": ${requiredSecrets.join(', ')}`,
    );
  }

  /**
   * Mappt RunTrigger zu TriggerType
   * 'scheduled' -> 'cron', andere werden direkt übernommen
   */
  private mapTriggerType(trigger: RunTrigger): string {
    const triggerTypeMapping: Record<string, string> = {
      scheduled: 'cron',
      manual: 'manual',
      api: 'api',
    };

    return triggerTypeMapping[trigger] || trigger;
  }
}
