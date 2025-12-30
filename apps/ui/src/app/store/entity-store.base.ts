import { signal, Signal, computed } from '@angular/core';
import { ScrapeEvent } from '@scrape-dojo/shared';

/**
 * Basis-Interface für Entities mit ID
 */
export interface Entity {
  id: string;
}

/**
 * Konfiguration für Entity-Store
 */
export interface EntityStoreConfig<T extends Entity> {
  /** Name des Stores für Logging */
  storeName: string;
  /** API-Endpoint zum Laden (z.B. '/scrapes') */
  loadEndpoint?: string;
  /** Funktion zum Laden der Entities */
  loadFn?: () => Promise<T[]>;
  /** SSE Event-Types, die dieser Store verarbeitet */
  eventTypes?: string[];
}

/**
 * Generischer Entity-Store mit Signals
 * Verwaltet eine Collection von Entities mit automatischer API-Anbindung
 */
export abstract class EntityStore<T extends Entity> {
  protected _entities = signal<T[]>([]);
  protected _loading = signal(false);
  protected _error = signal<string | null>(null);

  // Public readonly signals
  readonly entities = this._entities.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals
  readonly count = computed(() => this._entities().length);
  readonly isEmpty = computed(() => this._entities().length === 0);

  constructor(protected config: EntityStoreConfig<T>) {
    console.log(`📦 ${config.storeName} initialized`);
  }

  /**
   * Alle Entities vom Server laden
   */
  async load(): Promise<void> {
    if (!this.config.loadFn) {
      console.warn(`⚠️ ${this.config.storeName}: No loadFn configured`);
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const entities = await this.config.loadFn();
      this._entities.set(entities);
      console.log(`✅ ${this.config.storeName} loaded: ${entities.length} items`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this._error.set(errorMsg);
      console.error(`❌ ${this.config.storeName} load failed:`, errorMsg);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Entity nach ID finden
   */
  getById(id: string): Signal<T | undefined> {
    return computed(() => this._entities().find(e => e.id === id));
  }

  /**
   * Entities filtern
   */
  filter(predicate: (entity: T) => boolean): Signal<T[]> {
    return computed(() => this._entities().filter(predicate));
  }

  /**
   * Entity hinzufügen
   */
  add(entity: T): void {
    this._entities.update(entities => [entity, ...entities]);
    console.log(`➕ ${this.config.storeName}: Added ${entity.id}`);
  }

  /**
   * Entity aktualisieren
   */
  update(id: string, updates: Partial<T>): void {
    this._entities.update(entities =>
      entities.map(e => e.id === id ? { ...e, ...updates } : e)
    );
    console.log(`🔄 ${this.config.storeName}: Updated ${id}`);
  }

  /**
   * Entity mit Custom-Updater aktualisieren
   */
  updateWith(id: string, updater: (entity: T) => T): void {
    this._entities.update(entities =>
      entities.map(e => e.id === id ? updater(e) : e)
    );
    console.log(`🔄 ${this.config.storeName}: Updated ${id} (custom)`);
  }

  /**
   * Entity entfernen
   */
  remove(id: string): void {
    this._entities.update(entities => entities.filter(e => e.id !== id));
    console.log(`🗑️ ${this.config.storeName}: Removed ${id}`);
  }

  /**
   * Alle Entities entfernen
   */
  clear(): void {
    this._entities.set([]);
    console.log(`🧹 ${this.config.storeName}: Cleared`);
  }

  /**
   * SSE Event verarbeiten
   * Wird von konkreten Stores überschrieben
   */
  handleEvent(event: ScrapeEvent): void {
    // Override in subclass
  }

  /**
   * Prüft ob dieser Store für ein Event zuständig ist
   */
  canHandleEvent(event: ScrapeEvent): boolean {
    return this.config.eventTypes?.includes(event.type) ?? false;
  }
}
