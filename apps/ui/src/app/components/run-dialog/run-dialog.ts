import {
  Component,
  EventEmitter,
  Output,
  signal,
  computed,
  inject,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SecretsService } from '../../services/secrets.service';
import { ScrapeService } from '../../services/scrape.service';
import { StoreService } from '../../store/store.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SecretListItem, RunHistoryItem } from '@scrape-dojo/shared';
import 'iconify-icon';

export interface WorkflowVariable {
  name: string;
  label: string;
  type:
    | 'string'
    | 'password'
    | 'number'
    | 'boolean'
    | 'email'
    | 'url'
    | 'select';
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
export class RunDialogComponent implements OnInit {
  private secretsService = inject(SecretsService);
  private scrapeService = inject(ScrapeService);
  private store = inject(StoreService);
  private transloco = inject(TranslocoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  @Output() closed = new EventEmitter<RunDialogResult>();

  isOpen = signal(true); // Always true for auxiliary route
  workflowId = signal('');
  workflowName = signal('');
  variables = signal<WorkflowVariable[]>([]);

  // Form state
  variableValues = signal<Record<string, any>>({});
  secrets = signal<SecretListItem[]>([]);
  secretLookup = signal<Record<string, string>>({});
  missingSecrets = signal<string[]>([]);
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);

  // Computed
  hasRequiredVariables = computed(() =>
    this.variables().some((v) => v.required && !v.secretRef),
  );

  requiredVariablesCount = computed(
    () => this.variables().filter((v) => v.required && !v.secretRef).length,
  );

  canSubmit = computed(() => {
    const values = this.variableValues();
    const missingSecretsCount = this.missingSecrets().length;

    // Prüfe ob fehlende required Secrets vorhanden sind
    if (missingSecretsCount > 0) {
      return false;
    }

    // Prüfe normale (nicht-secret) required Variablen
    return this.variables()
      .filter((v) => v.required && !v.secretRef)
      .every((v) => {
        const val = values[v.name];
        return val !== undefined && val !== null && val !== '';
      });
  });

  /**
   * Prüft ob ein Secret fehlt oder leer ist
   */
  isSecretMissing(variable: WorkflowVariable): boolean {
    if (!variable.secretRef) return false;
    const missingSecrets = this.missingSecrets();
    return missingSecrets.includes(variable.secretRef);
  }

  constructor() {}

  ngOnInit() {
    // Load workflowId from route params and variables from Router state
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params['workflowId'];
        if (id) {
          this.workflowId.set(id);

          // Load variables from Router state (passed from Dashboard)
          // Note: getCurrentNavigation() is null after navigation completes, use window.history.state
          const state = window.history.state as any;
          console.log('🔍 Router state:', state);

          if (state?.variables) {
            console.log(
              '📋 Loading variables from router state:',
              state.variables,
            );
            this.variables.set(state.variables);
            this.workflowName.set(state.workflowName || id);

            // Now load and merge with DB variables
            this.loadAndMergeVariables();
            this.loadSecrets();
          } else {
            console.warn('⚠️ No variables in router state');
          }
        }
      });
  }

  /**
   * Lädt DB-Variablen und merged sie mit den Workflow-Definitionen
   */
  private loadAndMergeVariables() {
    const id = this.workflowId();
    const vars = this.variables();

    if (!id || vars.length === 0) return;

    // Hole DB-Variablen für diesen Workflow
    const dbVariables = this.store.variables.getByWorkflow(id);
    console.log('📊 DB Variables for workflow:', id, dbVariables);
    console.log('📋 Workflow definitions:', vars);

    // Initialisiere Werte mit defaults aus Definitionen
    const values: Record<string, any> = {};
    for (const v of vars) {
      // Prüfe ob es eine DB-Variable mit diesem Namen gibt
      const dbVar = dbVariables.find((dv) => dv.name === v.name);

      if (dbVar) {
        // Verwende Wert aus DB (konvertiere je nach Typ)
        if (v.type === 'boolean') {
          values[v.name] = dbVar.value === 'true' || dbVar.value === 'True';
        } else if (v.type === 'number') {
          values[v.name] = Number(dbVar.value);
        } else {
          values[v.name] = dbVar.value;
        }
      } else if (v.defaultValue !== undefined) {
        // Verwende defaultValue aus Workflow-Definition
        values[v.name] = v.defaultValue;
      } else if (v.default !== undefined) {
        // Fallback: Verwende default aus Definition (alte Syntax)
        values[v.name] = v.default;
      } else if (v.type === 'boolean') {
        values[v.name] = false;
      } else if (v.type === 'number') {
        values[v.name] = 0;
      } else {
        values[v.name] = '';
      }
    }
    this.variableValues.set(values);
  }

  async loadSecrets() {
    this.loading.set(true);
    const vars = this.variables();

    try {
      const secrets = await this.secretsService.getSecrets();
      this.secrets.set(secrets);

      // Build lookup for secretRef and check for missing/empty required secrets
      const lookup: Record<string, string> = {};
      const missingSecrets: string[] = [];

      for (const v of vars) {
        if (v.secretRef) {
          const secret = secrets.find((s) => s.name === v.secretRef);

          if (!secret) {
            // Secret nicht gefunden - markiere als fehlend
            console.warn(`⚠️ Secret not found: ${v.secretRef}`);
            lookup[v.name] = `⚠️ Missing: ${v.secretRef}`;
            if (v.required) {
              missingSecrets.push(v.secretRef);
            }
          } else if (secret.isEmpty) {
            // Secret existiert aber ist leer
            console.warn(`⚠️ Secret is empty: ${secret.name}`, secret);
            lookup[v.name] = `⚠️ Empty: ${secret.name}`;
            if (v.required) {
              missingSecrets.push(v.secretRef);
            }
          } else {
            // Secret OK
            lookup[v.name] = `🔐 ${secret.name}`;
          }
        }
      }

      this.secretLookup.set(lookup);
      this.missingSecrets.set(missingSecrets);

      // Log missing required secrets
      if (missingSecrets.length > 0) {
        console.warn('⚠️ Missing required secrets:', missingSecrets);
      }
    } catch (err: any) {
      console.error('Failed to load secrets:', err);
    } finally {
      this.loading.set(false);
    }
  }

  updateValue(name: string, value: any) {
    // Konvertiere number-Typen zu echten Numbers
    const variable = this.variables().find((v) => v.name === name);
    let convertedValue = value;

    if (variable?.type === 'number') {
      // Wenn leer, setze auf undefined statt 0
      convertedValue =
        value === '' || value === null || value === undefined
          ? undefined
          : Number(value);
    }

    this.variableValues.update((v) => ({ ...v, [name]: convertedValue }));
  }

  getPlaceholder(variable: WorkflowVariable): string {
    if (variable.secretRef) {
      const secret = this.secrets().find((s) => s.name === variable.secretRef);
      if (!secret) {
        return `⚠️ Secret "${variable.secretRef}" not found - create it first!`;
      }
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
    // Close modal via router
    this.router.navigate([{ outlets: { modal: null } }]);
    this.closed.emit({ confirmed: false });
  }

  navigateToSecrets() {
    // Close dialog first
    this.cancel();
    // Navigate to modal outlet
    this.router.navigate([{ outlets: { modal: ['secrets'] } }]);
  }

  /**
   * Navigiert zum Secrets-Manager Modal und fokussiert auf ein bestimmtes Secret
   */
  navigateToSecret(secretName: string | undefined) {
    if (!secretName) return;

    // Close dialog first
    this.cancel();

    // Navigate to modal outlet with secret name
    this.router.navigate([
      { outlets: { modal: ['secrets', 'create', secretName] } },
    ]);
  }

  async submit() {
    if (!this.canSubmit()) {
      this.error.set(
        this.transloco.translate('validation.fill_required_fields'),
      );
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      // Filter out secret-linked variables (they will be resolved server-side)
      // Filter out undefined/null/empty values (use defaults on server)
      const values: Record<string, any> = {};
      for (const v of this.variables()) {
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

      // Generate a unique run ID
      const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const scrapeId = this.workflowId();

      // Add run to the store immediately so the UI shows it
      const runItem: RunHistoryItem = {
        id: runId,
        scrapeId,
        status: 'running',
        startTime: Date.now(),
        steps: [],
      };
      this.store.runs.add(runItem);

      // Close modal via router
      this.router.navigate([{ outlets: { modal: null } }]);

      // Execute the API call
      this.scrapeService.runScrape(scrapeId, runId, values).subscribe({
        next: (response) => {
          this.store.runs.update(runId, {
            status: response.success
              ? ('success' as const)
              : ('failed' as const),
            endTime: Date.now(),
          });
        },
        error: (err) => {
          this.store.runs.update(runId, {
            status: 'failed' as const,
            endTime: Date.now(),
            error: err.message,
          });
        },
      });

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
