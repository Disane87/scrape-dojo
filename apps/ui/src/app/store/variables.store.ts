import { Injectable, inject, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Variable,
  VariableListItem,
  VariableScope,
  WorkflowVariable,
} from '@scrape-dojo/shared';
import { EntityStore } from './entity-store.base';

/**
 * Variables Store - Entity Store für Variablen
 */
@Injectable({ providedIn: 'root' })
export class VariablesStore extends EntityStore<VariableListItem> {
  private http = inject(HttpClient);

  // Workflow-Variablen-Definitionen aus Workflow-Dateien
  readonly workflowDefinitions = signal<
    Array<{ workflowId: string; variables: WorkflowVariable[] }>
  >([]);

  // Computed Signals für gefilterte Listen
  readonly global = computed(() =>
    this.entities().filter((v) => v.scope === 'global'),
  );

  constructor() {
    super({
      storeName: 'Variables',
      loadFn: async () => {
        const variables = await firstValueFrom(
          this.http.get<VariableListItem[]>('/api/variables'),
        );
        // Lade auch Workflow-Definitionen
        this.loadWorkflowDefinitions();
        return variables;
      },
      eventTypes: [], // Keine SSE Events für Variablen
    });
  }

  /**
   * Lade Variablen-Definitionen aus Workflows
   */
  private async loadWorkflowDefinitions(): Promise<void> {
    try {
      const definitions = await firstValueFrom(
        this.http.get<
          Array<{ workflowId: string; variables: WorkflowVariable[] }>
        >('/api/variables/definitions'),
      );
      this.workflowDefinitions.set(definitions);
    } catch (error) {
      console.error('Failed to load workflow definitions:', error);
    }
  }

  /**
   * Workflow-spezifische Variablen abrufen (aus DB)
   */
  getByWorkflow(workflowId: string): VariableListItem[] {
    return this.entities().filter(
      (v) => v.scope === 'workflow' && v.workflowId === workflowId,
    );
  }

  /**
   * Workflow-Variablen-Definitionen für einen Workflow abrufen
   */
  getWorkflowDefinitions(workflowId: string): WorkflowVariable[] {
    const def = this.workflowDefinitions().find(
      (d) => d.workflowId === workflowId,
    );
    return def?.variables || [];
  }

  /**
   * Variable nach Name suchen (für Template-Rendering)
   * Workflow-scope hat Priorität über global
   */
  getByName(name: string, workflowId?: string): VariableListItem | undefined {
    if (workflowId) {
      const workflowVar = this.entities().find(
        (v) =>
          v.name === name &&
          v.scope === 'workflow' &&
          v.workflowId === workflowId,
      );
      if (workflowVar) return workflowVar;
    }

    return this.entities().find((v) => v.name === name && v.scope === 'global');
  }

  /**
   * Variable erstellen
   */
  async create(data: {
    name: string;
    value: string;
    description?: string;
    scope: VariableScope;
    workflowId?: string;
  }): Promise<Variable> {
    return firstValueFrom(this.http.post<Variable>('/api/variables', data));
  }

  /**
   * Variable aktualisieren
   */
  async updateVariable(
    id: string,
    updates: { value?: string; description?: string },
  ): Promise<Variable> {
    return firstValueFrom(
      this.http.put<Variable>(`/api/variables/${id}`, updates),
    );
  }

  /**
   * Variable löschen
   */
  async deleteVariable(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/variables/${id}`));
  }

  /**
   * SSE Events verarbeiten
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override canHandleEvent(event: any): boolean {
    return false; // Variablen haben keine SSE Events (nur CRUD über REST)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override handleEvent(event: any): void {
    // Keine SSE Events für Variablen
  }
}
