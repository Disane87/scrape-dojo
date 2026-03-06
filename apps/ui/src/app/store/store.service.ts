import { Injectable, effect, inject } from '@angular/core';
import { ScrapeEventsService } from '../services/scrape-events.service';
import { ScrapesStore } from './scrapes.store';
import { RunsStore } from './runs.store';
import { VariablesStore } from './variables.store';
import { AuthService } from '../auth/services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Zentraler Store-Manager
 * Koordiniert alle Entity-Stores und SSE-Events
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private eventsService = inject(ScrapeEventsService);
  private authService = inject(AuthService);

  private hasInitialized = false;
  private isInitializing = false;

  // Entity Stores
  readonly scrapes = inject(ScrapesStore);
  readonly runs = inject(RunsStore);
  readonly variables = inject(VariablesStore);

  constructor() {
    // SSE-Events an alle Stores verteilen
    this.eventsService.events$
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.handleEvent(event));

    // React to login/logout without requiring a full page reload.
    effect(() => {
      const sessionValidated = this.authService.isSessionValidated();

      if (sessionValidated) {
        // Start SSE globally once we have a token.
        this.eventsService.connect();
        void this.initialize();
        return;
      }

      // Logged out: stop SSE and clear stores.
      this.eventsService.disconnect();
      this.clear();
      this.hasInitialized = false;
      this.isInitializing = false;
    });

    console.log('🏪 StoreService initialized');
  }

  /**
   * Alle Stores initialisieren
   * Nur wenn User eingeloggt ist!
   */
  async initialize(): Promise<void> {
    if (this.hasInitialized || this.isInitializing) {
      return;
    }

    // Skip initialization until the stored session has been validated.
    if (!this.authService.isSessionValidated()) {
      console.log('⏭️ Skipping store initialization - session not validated');
      return;
    }

    console.log('🚀 Initializing stores...');

    this.isInitializing = true;

    try {
      await Promise.all([
        this.scrapes.load(),
        this.runs.load(),
        this.variables.load(),
      ]);

      console.log('✅ All stores initialized');
      this.hasInitialized = true;
    } catch (error) {
      console.error('❌ Store initialization failed:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * SSE-Event an zuständige Stores verteilen
   */
  private handleEvent(event: any): void {
    // An Scrapes Store
    if (this.scrapes.canHandleEvent(event)) {
      this.scrapes.handleEvent(event);
    }

    // An Runs Store
    if (this.runs.canHandleEvent(event)) {
      this.runs.handleEvent(event);
    }

    // An Variables Store
    if (this.variables.canHandleEvent(event)) {
      this.variables.handleEvent(event);
    }
  }

  /**
   * Alle Stores neu laden
   */
  async reload(): Promise<void> {
    await Promise.all([this.scrapes.load(), this.runs.load()]);
  }

  /**
   * Alle Stores leeren
   */
  clear(): void {
    this.scrapes.clear();
    this.runs.clear();
    this.variables.clear();
  }
}

/**
 * Factory für APP_INITIALIZER
 */
export function initializeStore(
  storeService: StoreService,
): () => Promise<void> {
  return () => storeService.initialize();
}
