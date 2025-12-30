import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ScrapeListItem, ScrapeEvent } from '@scrape-dojo/shared';
import { ScrapeService } from '../services/scrape.service';
import { EntityStore } from './entity-store.base';

/**
 * Store für Scrape-Definitionen
 * Verwaltet die Liste aller verfügbaren Workflows
 */
@Injectable({ providedIn: 'root' })
export class ScrapesStore extends EntityStore<ScrapeListItem> {
  private scrapeService = inject(ScrapeService);
  protected logger = console;

  constructor() {
    super({
      storeName: 'Scrapes',
      loadFn: () => firstValueFrom(this.scrapeService.getScrapes()),
      eventTypes: ['scrape-start', 'scrape-end', 'scrape-complete', 'config-reload']
    });
  }

  /**
   * SSE Event verarbeiten
   */
  override handleEvent(event: ScrapeEvent): void {
    switch (event.type) {
      case 'scrape-start':
        this.handleScrapeStart(event);
        break;

      case 'scrape-end':
      case 'scrape-complete':
        this.handleScrapeEnd(event);
        break;

      case 'config-reload':
        this.handleConfigReload();
        break;
    }
  }

  /**
   * Config-Reload: Scrapes neu laden
   */
  private handleConfigReload(): void {
    this.logger.log('🔄 Configuration changed, reloading scrapes...');
    this.load();
  }

  /**
   * Scrape-Start: Status auf "running" setzen
   */
  private handleScrapeStart(event: ScrapeEvent): void {
    if (!event.scrapeId) return;

    this.update(event.scrapeId, {
      lastRun: {
        status: 'running',
        startTime: Date.now()
      }
    } as Partial<ScrapeListItem>);
  }

  /**
   * Scrape-End: lastRun aktualisieren
   * Hier sollten wir eigentlich den Run vom RunsStore holen
   */
  private handleScrapeEnd(event: ScrapeEvent): void {
    if (!event.scrapeId) return;

    // Der finale Status kommt vom Backend via reload der Run-History
    // Hier nur als "completed" markieren, der echte Status kommt später
    this.update(event.scrapeId, {
      lastRun: {
        status: event.error ? 'failed' : 'completed',
        startTime: event.timestamp || Date.now(),
        endTime: Date.now()
      }
    } as Partial<ScrapeListItem>);
  }

  /**
   * Scrape mit LastRun aus RunHistory aktualisieren
   */
  updateLastRunFromHistory(scrapeId: string, lastRun: ScrapeListItem['lastRun']): void {
    this.update(scrapeId, { lastRun } as Partial<ScrapeListItem>);
  }
}
