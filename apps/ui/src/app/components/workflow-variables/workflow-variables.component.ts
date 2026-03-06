import {
  Component,
  computed,
  inject,
  input,
  signal,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { StoreService } from '../../store/store.service';
import { VariableListItem } from '@scrape-dojo/shared';
import {
  ButtonComponent,
  IconButtonComponent,
  ModalComponent,
  AlertComponent,
  EmptyStateComponent,
} from '../shared';
import 'iconify-icon';

@Component({
  selector: 'app-workflow-variables',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    ButtonComponent,
    IconButtonComponent,
    ModalComponent,
    AlertComponent,
    EmptyStateComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './workflow-variables.component.html',
  styleUrl: './workflow-variables.component.scss',
})
export class WorkflowVariablesComponent {
  readonly store = inject(StoreService);
  private transloco = inject(TranslocoService);
  readonly workflowId = input.required<string>();

  // UI State
  readonly showDialog = signal(false);
  readonly editingVariable = signal<VariableListItem | null>(null);
  readonly formError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deletingId = signal<string | null>(null);

  readonly formData = signal<{
    name: string;
    value: string;
    description?: string;
  }>({
    name: '',
    value: '',
    description: '',
  });

  // Computed
  readonly workflowVariables = computed(() =>
    this.store.variables.getByWorkflow(this.workflowId()),
  );

  readonly workflowDefinitions = computed(() =>
    this.store.variables.getWorkflowDefinitions(this.workflowId()),
  );

  hasVariableInDB(varName: string): boolean {
    return this.workflowVariables().some((v) => v.name === varName);
  }

  createFromDefinition(varDef: any): void {
    this.editingVariable.set(null);
    this.formData.set({
      name: varDef.name,
      value: String(varDef.default ?? ''),
      description: varDef.description || '',
    });
    this.showDialog.set(true);
  }

  openCreateDialog(): void {
    this.editingVariable.set(null);
    this.formError.set(null);
    this.formData.set({
      name: '',
      value: '',
      description: '',
    });
    this.showDialog.set(true);
  }

  editVariable(variable: VariableListItem): void {
    this.editingVariable.set(variable);
    this.formError.set(null);
    this.formData.set({
      name: variable.name,
      value: variable.value,
      description: variable.description,
    });
    this.showDialog.set(true);
  }

  updateFormData(field: string, value: any): void {
    this.formData.update((current) => ({ ...current, [field]: value }));
  }

  confirmDelete(id: string): void {
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  async deleteVariable(id: string): Promise<void> {
    try {
      await this.store.variables.deleteVariable(id);
      // Store direkt aktualisieren statt Reload
      this.store.variables.remove(id);
      this.deletingId.set(null);
    } catch (error: any) {
      console.error('Failed to delete variable:', error);
    }
  }

  async saveVariable(): Promise<void> {
    const data = this.formData();

    if (!data.name?.trim()) {
      this.formError.set(this.transloco.translate('validation.name_required'));
      return;
    }

    if (!data.value?.trim()) {
      this.formError.set(this.transloco.translate('validation.value_required'));
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    try {
      if (this.editingVariable()) {
        const updated = await this.store.variables.updateVariable(
          this.editingVariable()!.id,
          {
            value: data.value.trim(),
            description: data.description?.trim(),
          },
        );
        console.log('Variable updated:', updated);
        // Store direkt aktualisieren statt kompletten Reload
        this.store.variables.update(updated.id, updated);
      } else {
        const created = await this.store.variables.create({
          name: data.name.trim(),
          value: data.value.trim(),
          description: data.description?.trim(),
          scope: 'workflow',
          workflowId: this.workflowId(),
        });
        console.log('Variable created:', created);
        // Neue Variable direkt zum Store hinzufügen
        this.store.variables.add(created as any);
      }

      this.closeDialog();
    } catch (error: any) {
      console.error('Save variable error:', error);
      this.formError.set(
        error.message || this.transloco.translate('common.save_failed'),
      );
    } finally {
      this.saving.set(false);
    }
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.editingVariable.set(null);
    this.formError.set(null);
  }

  /**
   * Findet die Secret-Referenz für eine Variable aus den Workflow-Definitionen
   */
  getSecretRef(variableName: string): string | undefined {
    const definition = this.workflowDefinitions().find(
      (d) => d.name === variableName,
    );
    return definition?.secretRef;
  }

  formatDate(timestamp: number): string {
    const lang = this.translocoService.getActiveLang();
    const locale = lang === 'de' ? 'de-DE' : 'en-US';
    return new Date(timestamp).toLocaleString(locale);
  }

  private translocoService = inject(TranslocoService);
}
