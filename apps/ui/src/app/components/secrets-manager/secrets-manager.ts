import { Component, inject, signal, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecretsService } from '../../services/secrets.service';
import { SecretListItem } from '@scrape-dojo/shared';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import {
  ButtonComponent,
  IconButtonComponent,
  SpinnerComponent,
  BadgeComponent,
  ModalComponent,
  AlertComponent,
  EmptyStateComponent,
} from '../shared';
import 'iconify-icon';

@Component({
  selector: 'app-secrets-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    ButtonComponent,
    IconButtonComponent,
    SpinnerComponent,
    BadgeComponent,
    ModalComponent,
    AlertComponent,
    EmptyStateComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './secrets-manager.html',
  styleUrl: './secrets-manager.scss'
})
export class SecretsManagerComponent implements OnInit {
  private secretsService = inject(SecretsService);
  private transloco = inject(TranslocoService);

  secrets = this.secretsService.secrets;
  loading = this.secretsService.loading;
  error = this.secretsService.error;

  // Modal state
  showModal = signal(false);
  editingSecret = signal<SecretListItem | null>(null);

  // Form fields
  formName = signal('');
  formValue = signal('');
  formDescription = signal('');
  formError = signal<string | null>(null);
  saving = signal(false);

  // Delete confirmation
  deletingId = signal<string | null>(null);

  ngOnInit() {
    this.loadSecrets();
  }

  async loadSecrets() {
    try {
      await this.secretsService.loadSecrets();
    } catch (e) {
      console.error('Failed to load secrets:', e);
    }
  }

  openCreateModal() {
    this.editingSecret.set(null);
    this.formName.set('');
    this.formValue.set('');
    this.formDescription.set('');
    this.formError.set(null);
    this.showModal.set(true);
  }

  openEditModal(secret: SecretListItem) {
    this.editingSecret.set(secret);
    this.formName.set(secret.name);
    this.formValue.set(''); // Don't pre-fill value for security
    this.formDescription.set(secret.description || '');
    this.formError.set(null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingSecret.set(null);
    this.formError.set(null);
  }

  async saveSecret() {
    const name = this.formName().trim();
    const value = this.formValue();
    const description = this.formDescription().trim() || undefined;

    if (!name) {
      this.formError.set(this.transloco.translate('validation.name_required'));
      return;
    }

    const editing = this.editingSecret();
    if (!editing && !value) {
      this.formError.set(this.transloco.translate('validation.value_required'));
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    try {
      if (editing) {
        // Update - only include value if it was changed
        const updates: { name?: string; value?: string; description?: string } = { name, description };
        if (value) {
          updates.value = value;
        }
        await this.secretsService.updateSecret(editing.id, updates);
      } else {
        // Create
        await this.secretsService.createSecret(name, value, description);
      }
      this.closeModal();
    } catch (e) {
      this.formError.set(e instanceof Error ? e.message : this.transloco.translate('common.save_failed'));
    } finally {
      this.saving.set(false);
    }
  }

  confirmDelete(id: string) {
    this.deletingId.set(id);
  }

  cancelDelete() {
    this.deletingId.set(null);
  }

  async deleteSecret(id: string) {
    try {
      await this.secretsService.deleteSecret(id);
      this.deletingId.set(null);
    } catch (e) {
      console.error('Failed to delete secret:', e);
    }
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
