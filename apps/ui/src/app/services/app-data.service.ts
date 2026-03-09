import { Injectable, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ActionMetadataMap } from '@scrape-dojo/shared';
import { RunsStore } from '../store/runs.store';
import { AuthService } from '../auth/services/auth.service';

/**
 * Service für statische Action-Metadata.
 * Lädt Action-Informationen (Icons, Farben, Beschreibungen) beim App-Start.
 *
 * HINWEIS: Scrapes werden jetzt über ScrapesStore verwaltet!
 */
@Injectable({ providedIn: 'root' })
export class AppDataService {
  private http = inject(HttpClient);
  private runsStore = inject(RunsStore);
  private authService = inject(AuthService);

  // ============ State ============
  private _initialized = signal(false);
  private _actionMetadata = signal<ActionMetadataMap>({});

  // ============ Public Accessors ============
  readonly initialized = this._initialized.asReadonly();
  readonly actionMetadata = this._actionMetadata.asReadonly();

  constructor() {
    // Re-run initialization after login without requiring full reload.
    effect(() => {
      const sessionValidated = this.authService.isSessionValidated();
      if (sessionValidated) {
        void this.initialize();
        return;
      }

      // Logged out: allow re-initialization on next login.
      this.reset();
    });
  }

  /**
   * Lädt Action-Metadata vom Server.
   * Nur wenn User eingeloggt ist!
   */
  async initialize(): Promise<void> {
    // Skip initialization until the stored session has been validated.
    if (!this.authService.isSessionValidated()) {
      return;
    }

    if (this._initialized()) {
      return;
    }

    try {
      const actionMetadata = await firstValueFrom(
        this.http.get<ActionMetadataMap>('/api/actions/metadata'),
      );

      this._actionMetadata.set(actionMetadata);
      this._initialized.set(true);

      // Lade Runs um laufende Jobs zu erkennen
      // Dies passiert asynchron im Hintergrund
      this.runsStore
        .load()
        .catch((err) =>
          console.error('Failed to load runs for reconnection:', err),
        );
    } catch (error) {
      console.error('Failed to load action metadata:', error);
      this._initialized.set(true);
    }
  }

  reset(): void {
    this._actionMetadata.set({});
    this._initialized.set(false);
  }

  /**
   * Action Metadata für einen Typ holen
   */
  getActionMetadata(actionType: string): ActionMetadataMap[string] | undefined {
    return this._actionMetadata()[actionType];
  }
}

/**
 * Factory für APP_INITIALIZER
 * Lädt Action-Metadata parallel zum Store
 */
export function initializeAppData(
  appDataService: AppDataService,
): () => Promise<void> {
  return () => appDataService.initialize();
}
