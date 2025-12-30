import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  computed,
  inject,
  OnInit,
  OnChanges,
  SimpleChanges,
  CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecretsService } from '../../services/secrets.service';
import { StoreService } from '../../store/store.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import 'iconify-icon';

export interface WorkflowVariable {
  name: string;
  label: string;
  type: 'string' | 'password' | 'number' | 'boolean' | 'email' | 'url' | 'select';
  required?: boolean;
  default?: any;
  defaultValue?: any; // Alias für default (verwendet in Workflow-Definitionen)
  description?: string;
  secretRef?: string;
  options?: { value: string; label: string }[];
}

export interface RunDialogResult {
  confirmed: boolean;
  variables?: Record<string, any>;
}

@Component({
  selector: 'app-run-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './run-dialog.html',
  styleUrls: ['./run-dialog.scss'],
})
export class RunDialogComponent implements OnInit, OnChanges {
  private secretsService = inject(SecretsService);
  private store = inject(StoreService);
  private transloco = inject(TranslocoService);

  @Input() isOpen = false;
  @Input() workflowId = '';
  @Input() workflowName = '';
  @Input() variables: WorkflowVariable[] = [];

  @Output() closed = new EventEmitter<RunDialogResult>();

  // Form state
  variableValues = signal<Record<string, any>>({});
  secrets = signal<{ id: string; name: string }[]>([]);
  secretLookup = signal<Record<string, string>>({});
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);

  // Computed
  hasRequiredVariables = computed(() => this.variables.some((v) => v.required && !v.secretRef));

  requiredVariablesCount = computed(() =>
    this.variables.filter((v) => v.required && !v.secretRef).length
  );

  canSubmit = computed(() => {
    const values = this.variableValues();
    return this.variables
      .filter((v) => v.required && !v.secretRef)
      .every((v) => {
        const val = values[v.name];
        return val !== undefined && val !== null && val !== '';
      });
  });

  constructor() {
  }

  ngOnInit() {
    this.loadSecrets();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Variablen neu laden wenn Dialog geöffnet wird
    if (changes['isOpen'] && this.isOpen && this.workflowId && this.variables.length > 0) {
      console.log('🔄 Dialog opened, loading variables for workflow:', this.workflowId);
      this.loadAndMergeVariables();
    }
  }

  /**
   * Lädt DB-Variablen und merged sie mit den Workflow-Definitionen
   */
  private loadAndMergeVariables() {
    // Hole DB-Variablen für diesen Workflow
    const dbVariables = this.store.variables.getByWorkflow(this.workflowId);
    console.log('📊 DB Variables for workflow:', this.workflowId, dbVariables);
    console.log('📋 Workflow definitions:', this.variables);

    // Initialisiere Werte mit defaults aus Definitionen
    const values: Record<string, any> = {};
    for (const v of this.variables) {
      // Prüfe ob es eine DB-Variable mit diesem Namen gibt
      const dbVar = dbVariables.find(dv => dv.name === v.name);

      if (dbVar) {
        // Verwende Wert aus DB (konvertiere je nach Typ)
        if (v.type === 'boolean') {
          values[v.name] = dbVar.value === 'true' || dbVar.value === 'True';
          console.log(`✅ ${v.name}: Using DB value (boolean)`, values[v.name]);
        } else if (v.type === 'number') {
          values[v.name] = Number(dbVar.value);
          console.log(`✅ ${v.name}: Using DB value (number)`, values[v.name]);
        } else {
          values[v.name] = dbVar.value;
          console.log(`✅ ${v.name}: Using DB value (string)`, values[v.name]);
        }
      } else if (v.defaultValue !== undefined) {
        // Verwende defaultValue aus Workflow-Definition
        console.log(`📌 ${v.name}: Using defaultValue from workflow`, v.defaultValue);
        values[v.name] = v.defaultValue;
      } else if (v.default !== undefined) {
        // Fallback: Verwende default aus Definition (alte Syntax)
        console.log(`📌 ${v.name}: Using default`, v.default);
        values[v.name] = v.default;
      } else if (v.type === 'boolean') {
        values[v.name] = false;
      } else if (v.type === 'number') {
        values[v.name] = 0;
      } else {
        values[v.name] = '';
      }
    }
    console.log('💾 Final variable values:', values);
    this.variableValues.set(values);
  }

  async loadSecrets() {
    this.loading.set(true);
    try {
      const secrets = await this.secretsService.getSecrets();
      this.secrets.set(secrets);

      // Build lookup for secretRef
      const lookup: Record<string, string> = {};
      for (const v of this.variables) {
        if (v.secretRef) {
          const secret = secrets.find((s) => s.name === v.secretRef);
          if (secret) {
            lookup[v.name] = `🔐 ${secret.name}`;
          }
        }
      }
      this.secretLookup.set(lookup);
    } catch (err: any) {
      console.error('Failed to load secrets:', err);
    } finally {
      this.loading.set(false);
    }
  }

  updateValue(name: string, value: any) {
    // Konvertiere number-Typen zu echten Numbers
    const variable = this.variables.find(v => v.name === name);
    let convertedValue = value;

    if (variable?.type === 'number') {
      // Wenn leer, setze auf undefined statt 0
      convertedValue = value === '' || value === null || value === undefined ? undefined : Number(value);
    }

    this.variableValues.update((v) => ({ ...v, [name]: convertedValue }));
  }

  getPlaceholder(variable: WorkflowVariable): string {
    if (variable.secretRef) {
      return `${this.transloco.translate('workflow.run_dialog.uses_secret')}: ${variable.secretRef}`;
    }
    switch (variable.type) {
      case 'email':
        return 'example@email.com';
      case 'url':
        return 'https://example.com';
      case 'password':
        return '••••••••';
      case 'number':
        return '0';
      default:
        return '';
    }
  }

  getInputType(type: string): string {
    switch (type) {
      case 'password':
        return 'password';
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      case 'number':
        return 'number';
      default:
        return 'text';
    }
  }

  cancel() {
    this.closed.emit({ confirmed: false });
  }

  async submit() {
    if (!this.canSubmit()) {
      this.error.set(this.transloco.translate('validation.fill_required_fields'));
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      // Filter out secret-linked variables (they will be resolved server-side)
      // Filter out undefined/null/empty values (use defaults on server)
      const values: Record<string, any> = {};
      for (const v of this.variables) {
        if (!v.secretRef) {
          const val = this.variableValues()[v.name];
          // Nur setzen wenn Wert vorhanden (nicht undefined/null/leer)
          // Für Booleans und Numbers auch 0/false erlauben
          if (v.type === 'boolean' || v.type === 'number') {
            if (val !== undefined && val !== null) {
              values[v.name] = val;
            }
          } else {
            // Für Strings: Nur setzen wenn nicht leer
            if (val !== undefined && val !== null && val !== '') {
              values[v.name] = val;
            }
          }
        }
      }

      console.log('🚀 Submitting run with variables:', values);

      this.closed.emit({
        confirmed: true,
        variables: values,
      });
    } catch (err: any) {
      this.error.set(err.message || 'Unbekannter Fehler');
    } finally {
      this.submitting.set(false);
    }
  }
}
