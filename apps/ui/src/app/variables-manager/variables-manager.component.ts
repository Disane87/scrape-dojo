import {
  Component,
  inject,
  signal,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreService } from '../store/store.service';
import { VariableListItem } from '@scrape-dojo/shared';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import {
  ButtonComponent,
  IconButtonComponent,
  ModalComponent,
  AlertComponent,
  EmptyStateComponent,
} from '../components/shared';
import 'iconify-icon';

@Component({
  selector: 'app-variables-manager',
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
  templateUrl: './variables-manager.component.html',
  styleUrl: './variables-manager.component.scss',
})
export class VariablesManagerComponent implements OnInit {
  readonly store = inject(StoreService);
  private transloco = inject(TranslocoService);
  private router = inject(Router);

  // Modal state for auxiliary route
  readonly showModal = signal(true);

  // UI State
  readonly showDialog = signal(false);
  readonly editingVariable = signal<VariableListItem | null>(null);
  readonly formError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deletingId = signal<string | null>(null);

  ngOnInit(): void {
    // Load variables when modal opens
    this.store.variables.load();
  }

  closeModal(): void {
    this.router.navigate([{ outlets: { modal: null } }]);
  }

  readonly formData = signal<{
    name: string;
    value: string;
    description?: string;
  }>({
    name: '',
    value: '',
    description: '',
  });

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
      await this.store.variables.load();
      this.deletingId.set(null);
    } catch (error) {
      console.error('Failed to delete variable:', error);
      this.formError.set(this.transloco.translate('common.delete_failed'));
    }
  }

  async saveVariable(): Promise<void> {
    const data = this.formData();

    // Validation
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
        // Update
        await this.store.variables.updateVariable(this.editingVariable()!.id, {
          value: data.value.trim(),
          description: data.description?.trim(),
        });
      } else {
        // Create (immer global)
        await this.store.variables.create({
          name: data.name.trim(),
          value: data.value.trim(),
          description: data.description?.trim(),
          scope: 'global',
          workflowId: undefined,
        });
      }

      await this.store.variables.load();
      this.closeDialog();
    } catch (error) {
      console.error('Failed to save variable:', error);
      this.formError.set(
        error instanceof Error
          ? error.message
          : this.transloco.translate('common.save_failed'),
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
   * Findet die Secret-Referenz für eine globale Variable aus allen Workflow-Definitionen
   */
  getSecretRefForVariable(variableName: string): string | undefined {
    // Suche in allen Workflows nach einer Definition mit dieser Variable
    for (const scrape of this.store.scrapes.entities()) {
      const definitions = this.store.variables.getWorkflowDefinitions(
        scrape.id,
      );
      const definition = definitions.find((d) => d.name === variableName);
      if (definition?.secretRef) {
        return definition.secretRef;
      }
    }
    return undefined;
  }

  formatDate(timestamp: number): string {
    const lang = this.translocoService.getActiveLang();
    const locale = lang === 'de' ? 'de-DE' : 'en-US';
    return new Date(timestamp).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private translocoService = inject(TranslocoService);
}
