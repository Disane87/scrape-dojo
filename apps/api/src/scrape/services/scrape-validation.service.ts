import { Injectable, Logger } from '@nestjs/common';
import { Scrape } from '../types/scrape.interface';
import { RunTrigger } from '../../database/entities';

@Injectable()
export class ScrapeValidationService {
    private readonly logger = new Logger(ScrapeValidationService.name);

    /**
     * Validiert ob ein Scrape ausgeführt werden kann
     */
    validateScrape(scrape: Scrape, trigger: RunTrigger): void {
        this.checkIfDisabled(scrape);
        this.checkTriggerAllowed(scrape, trigger);
    }

    /**
     * Prüft ob Scrape deaktiviert ist
     */
    private checkIfDisabled(scrape: Scrape): void {
        if (scrape.metadata?.disabled) {
            this.logger.warn(`🚫 Scrape "${scrape.id}" is disabled and cannot be run`);
            throw new Error(`Scrape "${scrape.id}" is disabled`);
        }
    }

    /**
     * Prüft ob der Trigger-Typ erlaubt ist
     */
    private checkTriggerAllowed(scrape: Scrape, trigger: RunTrigger): void {
        const allowedTriggers = scrape.metadata?.triggers?.map(t => t.type) || [];

        // Wenn keine Triggers definiert sind, ist der Scrape implizit inaktiv
        if (allowedTriggers.length === 0) {
            this.logger.warn(`🚫 Scrape "${scrape.id}" has no triggers configured`);
            throw new Error(
                `Scrape "${scrape.id}" has no triggers configured. Add at least one trigger to the metadata.`
            );
        }

        const mappedTrigger = this.mapTriggerType(trigger);

        if (!allowedTriggers.includes(mappedTrigger as any)) {
            this.logger.warn(
                `🚫 Trigger type "${trigger}" not allowed for scrape "${scrape.id}". Allowed: ${allowedTriggers.join(', ')}`
            );
            throw new Error(
                `Trigger type "${trigger}" is not configured for scrape "${scrape.id}". Allowed triggers: ${allowedTriggers.join(', ')}`
            );
        }
    }

    /**
     * Mappt RunTrigger zu TriggerType
     * 'scheduled' -> 'cron', andere werden direkt übernommen
     */
    private mapTriggerType(trigger: RunTrigger): string {
        const triggerTypeMapping: Record<string, string> = {
            'scheduled': 'cron',
            'manual': 'manual',
            'api': 'api'
        };

        return triggerTypeMapping[trigger] || trigger;
    }
}
