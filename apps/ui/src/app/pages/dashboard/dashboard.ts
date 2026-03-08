import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ScrapeService } from '../../services/scrape.service';
import { ScrapeEventsService } from '../../services/scrape-events.service';
import { NotificationService } from '../../services/notification.service';
import { StoreService } from '../../store/store.service';
import {
  ScrapeEvent,
  RunHistoryItem,
  Scrape,
  OtpRequest,
  RunStepItem,
  RunActionItem,
  ScrapeSchedule,
} from '@scrape-dojo/shared';
import { Subject, takeUntil } from 'rxjs';
import { TranslocoModule } from '@jsverse/transloco';
import { JsonEditorComponent } from '../../components/json-editor/json-editor';
import { LogViewerComponent } from '../../components/log-viewer/log-viewer';
import { TopNavComponent } from '../../components/top-nav/top-nav';
import { WorkflowSidebarComponent } from '../../components/workflow-sidebar/workflow-sidebar';
import {
  WorkflowHeaderComponent,
  TabType,
} from '../../components/workflow-header/workflow-header';
import {
  WorkflowHistoryComponent,
  StatusFilter,
} from '../../components/workflow-history/workflow-history';
import { WorkflowVisualizerComponent } from '../../components/workflow-visualizer/workflow-visualizer';
import { RunDebugViewComponent } from '../../components/run-debug-view/run-debug-view';
import { OtpModalComponent } from '../../components/otp-modal/otp-modal';
import {
  WorkflowVariable,
  RunDialogResult,
} from '../../components/run-dialog/run-dialog';
import { WorkflowVariablesComponent } from '../../components/workflow-variables/workflow-variables.component';
import { NotificationModalComponent } from '../../components/notification-modal/notification-modal';
import {
  VersionBumpDialogComponent,
  VersionBumpResult,
} from '../../components/version-bump-dialog/version-bump-dialog';
import {
  WorkflowMetadataFormComponent,
  MetadataChange,
} from '../../components/workflow-metadata-form/workflow-metadata-form';
import { environment } from '../../../environments/environment';
import 'iconify-icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    JsonEditorComponent,
    LogViewerComponent,
    TopNavComponent,
    WorkflowSidebarComponent,
    WorkflowHeaderComponent,
    WorkflowHistoryComponent,
    WorkflowVisualizerComponent,
    RunDebugViewComponent,
    OtpModalComponent,
    WorkflowVariablesComponent,
    NotificationModalComponent,
    VersionBumpDialogComponent,
    WorkflowMetadataFormComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private scrapeService = inject(ScrapeService);
  private eventsService = inject(ScrapeEventsService);
  private notificationService = inject(NotificationService);
  private store = inject(StoreService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();
  private readonly LOG_PANEL_STORAGE_KEY = 'scrape-dojo-log-panel';

  // Daten kommen aus den zentralen Stores
  scrapes = this.store.scrapes.entities;
  runHistory = this.store.runs.entities;
  selectedScrape = signal<string | null>(null);
  selectedScrapeDefinition = signal<Scrape | null>(null);
  liveOutput = signal<ScrapeEvent[]>([]);
  serverLogs = signal<ScrapeEvent[]>([]);
  isRunning = signal(false);
  activeTab = signal<TabType>('history');
  statusFilter = signal<StatusFilter>('all');
  showServerLogs = signal(true);
  serverLogsHeight = signal(200);

  // OTP Modal data (modal opened via router)
  otpRequest = signal<OtpRequest | null>(null);
  otpCode = signal('');

  // Run Dialog data (modal opened via router)
  runDialogVariables = signal<WorkflowVariable[]>([]);

  // Schedule Modal data (modal opened via router)
  currentSchedule = signal<ScrapeSchedule | null>(null);

  // Selected Run Details
  selectedRunId = signal<string | null>(null);

  // App info
  appVersion = environment.version;
  gitCommit = environment.gitCommit;

  // Schema for JSON editor validation
  schema = signal<any>(null);

  // Version bump dialog state
  showVersionBump = signal(false);
  pendingWorkflowData = signal<any>(null);

  // Metadata form state (pending changes before save)
  pendingMetadata = signal<MetadataChange | null>(null);

  // Steps data for JSON editor (extracted from definition)
  editorSteps = computed(() => {
    const def = this.selectedScrapeDefinition();
    return def?.steps || [];
  });

  // Whether the currently selected workflow is editable (custom)
  isCustomWorkflow = computed(() => {
    const scrapeId = this.selectedScrape();
    if (!scrapeId) return false;
    const scrape = this.scrapes().find((s) => s.id === scrapeId);
    return scrape?.source === 'custom';
  });

  // Computed values
  // Aufgelöste Metadaten aus der scrapes-Liste (mit Author-Info)
  selectedScrapeMetadata = computed(() => {
    const scrapeId = this.selectedScrape();
    if (!scrapeId) return undefined;
    const scrape = this.scrapes().find((s) => s.id === scrapeId);
    return scrape?.metadata;
  });

  // Schedule-Status für aktuellen Scrape
  scheduleEnabled = computed(
    () => this.currentSchedule()?.scheduleEnabled ?? false,
  );
  nextScheduledRun = computed(
    () => this.currentSchedule()?.nextScheduledRun ?? null,
  );

  // Workflow-spezifische Logs (gefiltert nach aktuellem Run)
  workflowLogs = computed(() => {
    const runId = this.selectedRunId();
    if (!runId) return [];
    return this.serverLogs().filter((log) => log.runId === runId);
  });

  filteredHistory = computed(() => {
    const filter = this.statusFilter();
    const currentScrapeId = this.selectedScrape();
    const history = this.runHistory();

    // Erst nach Scrape filtern
    let filtered = currentScrapeId
      ? history.filter((item) => item.scrapeId === currentScrapeId)
      : history;

    // Dann nach Status filtern
    if (filter !== 'all') {
      filtered = filtered.filter((item) => item.status === filter);
    }

    return filtered;
  });

  // Selected Run für Debug View
  selectedRun = computed(() => {
    const runId = this.selectedRunId();
    if (!runId) return null;
    return this.runHistory().find((run) => run.id === runId) || null;
  });

  ngOnInit(): void {
    this.loadLogPanelState();
    // Scrapes werden jetzt beim App-Start geladen via AppDataService
    this.loadStoredLogs();
    this.loadRunHistory();
    this.loadSchema();

    this.eventsService.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => this.handleEvent(event));

    // Route-Parameter auswerten
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['jobId']) {
        const currentJobId = this.selectedScrape();
        if (currentJobId !== params['jobId']) {
          this.selectScrapeFromRoute(params['jobId']);
        }
      }
      if (params['tab']) {
        this.setActiveTab(params['tab'] as TabType);
      }
      if (params['runId']) {
        this.selectedRunId.set(params['runId']);
      } else {
        this.selectedRunId.set(null);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStoredLogs(): void {
    this.scrapeService
      .getLogs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (logs) => {
          this.serverLogs.set(logs);
        },
        error: (err) => console.warn('Failed to load stored logs:', err),
      });
  }

  private loadRunHistory(): void {
    // Wird bereits beim App-Start geladen, hier nichts zu tun
    // Falls explizites Neuladen gewünscht: this.store.runs.load();
  }

  private loadLogPanelState(): void {
    try {
      const saved = localStorage.getItem(this.LOG_PANEL_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        this.showServerLogs.set(state.open ?? true);
        this.serverLogsHeight.set(state.height ?? 200);
      }
    } catch (e) {
      console.warn('Failed to load log panel state:', e);
    }
  }

  saveLogPanelState(): void {
    try {
      localStorage.setItem(
        this.LOG_PANEL_STORAGE_KEY,
        JSON.stringify({
          open: this.showServerLogs(),
          height: this.serverLogsHeight(),
        }),
      );
    } catch (e) {
      console.warn('Failed to save log panel state:', e);
    }
  }

  /** Scrapes neu laden (z.B. nach Änderungen) */
  reloadScrapes(): void {
    this.store.scrapes.load();
  }

  selectScrape(id: string): void {
    const currentTab = this.activeTab();

    this.selectedScrape.set(id);
    this.loadScrapeDefinition(id);
    this.loadSchedule(id);
    // Live-Output leeren beim Job-Wechsel
    this.liveOutput.set([]);
    this.selectedRunId.set(null);

    // URL aktualisieren mit aktuellem Tab
    this.navigateToJob(id, currentTab);
  }

  private selectScrapeFromRoute(id: string): void {
    this.selectedScrape.set(id);
    this.loadScrapeDefinition(id);
    this.loadSchedule(id);
    this.liveOutput.set([]);
  }

  private navigateToJob(
    jobId: string,
    tab?: TabType,
    runId?: string | null,
  ): void {
    const parts = ['/jobs', jobId];

    if (tab && tab !== 'history') {
      parts.push(tab);
    }

    if (runId) {
      parts.push('runs', runId);
    }

    this.router.navigate(parts, { replaceUrl: false });
  }

  private loadSchedule(id: string): void {
    this.scrapeService
      .getSchedule(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (schedule) => this.currentSchedule.set(schedule),
        error: () => this.currentSchedule.set(null),
      });
  }

  openScheduleModal(): void {
    const id = this.selectedScrape();
    if (id) {
      this.router.navigate([{ outlets: { modal: ['schedule', id] } }]);
    }
  }

  onScheduleModalClosed(): void {
    this.router.navigate([{ outlets: { modal: null } }]);
  }

  onScheduleSaved(schedule: ScrapeSchedule): void {
    this.currentSchedule.set(schedule);
    this.router.navigate([{ outlets: { modal: null } }]);
  }

  onDeleteRun(runId: string): void {
    // Wenn der gelöschte Run gerade ausgewählt ist, Selection aufheben
    if (this.selectedRunId() === runId) {
      this.selectedRunId.set(null);
    }

    // Run auf dem Server löschen
    this.scrapeService
      .deleteRun(runId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Run aus dem Store entfernen
          this.store.runs.remove(runId);
        },
        error: (err) => console.error('Failed to delete run:', err),
      });
  }

  onDeleteAllRuns(): void {
    const currentScrapeId = this.selectedScrape();
    if (!currentScrapeId) return;

    // Alle Runs des Scrapes auf dem Server löschen
    this.scrapeService
      .deleteRunsByScrapeId(currentScrapeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Selection aufheben
          this.selectedRunId.set(null);
          // Runs des aktuellen Scrapes aus dem Store entfernen
          const runsToDelete = this.store.runs
            .entities()
            .filter((r) => r.scrapeId === currentScrapeId);
          runsToDelete.forEach((r) => this.store.runs.remove(r.id));
        },
        error: (err) => console.error('Failed to delete runs:', err),
      });
  }

  loadScrapeDefinition(id: string): void {
    this.scrapeService
      .getScrapeDefinition(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (definition) => this.selectedScrapeDefinition.set(definition),
        error: (err) => console.error('Failed to load definition:', err),
      });
  }

  runScrape(): void {
    const id = this.selectedScrape();
    const definition = this.selectedScrapeDefinition();
    if (!id || this.isRunning()) return;

    console.log('🚀 runScrape called for:', id);
    console.log('📋 Definition:', definition);

    // Prüfe ob Variablen definiert sind
    const variables = definition?.metadata?.variables || [];
    console.log('📊 Variables found:', variables);

    if (variables.length > 0) {
      // Zeige Run-Dialog für Variablen-Eingabe via Auxiliary Route
      // Übergebe Variablen via Router State
      this.router.navigate([{ outlets: { modal: ['run', id] } }], {
        state: {
          variables,
          workflowName: definition.metadata?.description || id,
        },
      });
      return;
    }

    // Keine Variablen - direkt starten
    this.executeRun(id, definition);
  }

  onRunDialogClosed(result: RunDialogResult): void {
    // Close modal via router
    this.router.navigate([{ outlets: { modal: null } }]);

    if (result.confirmed) {
      const id = this.selectedScrape();
      const definition = this.selectedScrapeDefinition();
      if (id && definition) {
        this.executeRun(id, definition, result.variables);
      }
    }
  }

  private executeRun(
    id: string,
    definition: Scrape | null,
    variables?: Record<string, any>,
  ): void {
    this.isRunning.set(true);
    this.liveOutput.set([]);
    // Auto-Navigation zum Live-Log deaktiviert - Benutzer bleibt auf aktuellem Tab
    // this.activeTab.set('output');

    // Generiere eine eindeutige Run-ID
    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Steps aus der Definition initialisieren
    const steps: RunStepItem[] =
      definition?.steps.map((step) => ({
        name: step.name,
        status: 'pending' as const,
        actions: this.initializeActionsRecursive(step.actions),
      })) || [];

    const runItem: RunHistoryItem = {
      id: runId,
      scrapeId: id,
      status: 'running',
      startTime: Date.now(),
      steps,
    };
    this.store.runs.add(runItem);
    this.selectedRunId.set(runItem.id);

    // Übergebe die runId und Variablen an den Server
    this.scrapeService
      .runScrape(id, runId, variables)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isRunning.set(false);
          this.store.runs.update(runId, {
            status: response.success
              ? ('success' as const)
              : ('failed' as const),
            endTime: Date.now(),
          });
        },
        error: (err) => {
          this.isRunning.set(false);
          this.store.runs.update(runId, {
            status: 'failed' as const,
            endTime: Date.now(),
            error: err.message,
          });
        },
      });
  }

  stopScrape(): void {
    if (!this.isRunning()) return;

    this.scrapeService
      .stopScrape()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isRunning.set(false);
          const runId = this.selectedRunId();
          if (runId) {
            this.store.runs.update(runId, {
              status: 'failed' as const,
              endTime: Date.now(),
              error: 'Stopped by user',
            });
          }
        },
        error: (err) => {
          console.error('Failed to stop scrape:', err);
        },
      });
  }

  /**
   * Verarbeitet NUR UI-spezifische SSE-Events.
   * Daten-Events (Steps, Actions, Loops) werden vom Store verarbeitet!
   */
  private handleEvent(event: ScrapeEvent): void {
    const currentScrapeId = this.selectedScrape();
    const isCurrentScrape = event.scrapeId === currentScrapeId;

    // ========== UI-ONLY EVENTS (nicht im Store) ==========

    // Server-Logs (für Log-Panel)
    if (event.type === 'log') {
      this.serverLogs.update((logs) => [...logs, event].slice(-500));
      return;
    }

    // OTP-Request Modal
    if (event.type === 'otp-required' && event.message && isCurrentScrape) {
      try {
        this.otpRequest.set(JSON.parse(event.message) as OtpRequest);
        this.otpCode.set('');
      } catch (e) {
        console.error('Failed to parse OTP request:', e);
      }
      return;
    }

    // Browser-Notifications
    if (event.type === 'notification' && (event as any).notification) {
      const notif = (event as any).notification;
      this.notificationService.showFromBackend({
        notificationId: notif.notificationId,
        scrapeId: event.scrapeId || 'unknown',
        runId: event.runId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        iconUrl: notif.iconUrl,
        browserNotification: notif.browserNotification,
        autoDismiss: notif.autoDismiss,
      });
      return;
    }

    // Config-Reload (Scrapes neu laden)
    if (event.type === 'config-reload') {
      console.log('🔄 Config files changed, reloading stores...');
      this.store.reload();
      this.notificationService.showFromBackend({
        notificationId: `config-reload-${Date.now()}`,
        scrapeId: '__system__',
        type: 'info',
        title: 'Workflows aktualisiert',
        message: 'Die Workflow-Konfigurationen wurden neu geladen.',
        autoDismiss: 3000,
      });
      return;
    }

    // Live-Output für aktuell ausgewählten Scrape
    if (isCurrentScrape) {
      this.liveOutput.update((output) => [...output, event]);
    }

    // ALLE ANDEREN EVENTS (Steps, Actions, Loops, Errors) → Store kümmert sich!
  }

  // ========== OTP METHODS ==========

  onOtpSubmit(data: { requestId: string; code: string }): void {
    this.scrapeService
      .submitOtp(data.requestId, data.code)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.otpRequest.set(null);
          this.otpCode.set('');
        },
        error: (err) => console.error('Failed to submit OTP:', err),
      });
  }

  submitOtp(): void {
    const request = this.otpRequest();
    const code = this.otpCode();
    if (!request || !code || code.length < 4) return;

    this.scrapeService
      .submitOtp(request.requestId, code)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.otpRequest.set(null);
          this.otpCode.set('');
        },
        error: (err) => console.error('Failed to submit OTP:', err),
      });
  }

  onOtpAlternativeClicked(data: { requestId: string; selector: string }): void {
    this.scrapeService
      .executeOtpAction(data.requestId, data.selector)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.error('Failed to execute OTP action:', err),
      });
  }

  closeOtpModal(): void {
    this.otpRequest.set(null);
    this.otpCode.set('');
  }

  // Run Details
  onRunSelected(runId: string): void {
    const newRunId = this.selectedRunId() === runId ? null : runId;
    this.selectedRunId.set(newRunId);

    // URL aktualisieren
    const jobId = this.selectedScrape();
    const currentTab = this.activeTab();
    if (jobId) {
      this.navigateToJob(jobId, currentTab, newRunId);
    }
  }

  setActiveTab(tab: TabType): void {
    this.activeTab.set(tab);

    // URL aktualisieren
    const jobId = this.selectedScrape();
    if (jobId) {
      const runId = tab === 'history' ? this.selectedRunId() : null;
      this.navigateToJob(jobId, tab, runId);
    }
  }

  getSelectedRun(): RunHistoryItem | undefined {
    const runId = this.selectedRunId();
    return this.runHistory().find((r) => r.id === runId);
  }

  clearServerLogs(): void {
    this.serverLogs.set([]);
    // Auch auf dem Server löschen
    this.scrapeService
      .clearLogs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.warn('Failed to clear server logs:', err),
      });
  }

  toggleServerLogs(): void {
    this.showServerLogs.update((show) => !show);
    this.saveLogPanelState();
  }

  onServerLogsHeightChange(height: number): void {
    this.serverLogsHeight.set(height);
    this.saveLogPanelState();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'running':
        return 'text-dojo-warning';
      case 'success':
        return 'text-dojo-success';
      case 'failed':
        return 'text-dojo-danger';
      default:
        return 'text-dojo-text-muted';
    }
  }

  // ============ Workflow CRUD ============

  private loadSchema(): void {
    this.scrapeService
      .getSchema()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (schema) => this.schema.set(schema),
        error: (err) => console.warn('Failed to load schema:', err),
      });
  }

  onMetadataChange(change: MetadataChange): void {
    this.pendingMetadata.set(change);
  }

  onWorkflowSave(steps: any): void {
    const id = this.selectedScrape();
    if (!id || !this.isCustomWorkflow()) return;

    // Merge metadata (from form or current definition) with steps from editor
    const def = this.selectedScrapeDefinition();
    const metaChange = this.pendingMetadata();
    const merged = {
      ...def,
      id: metaChange?.id || id,
      metadata: metaChange?.metadata || def?.metadata || {},
      steps,
    };

    // Store pending data and show version bump dialog
    this.pendingWorkflowData.set(merged);
    this.showVersionBump.set(true);
  }

  /** Get current version from the selected workflow definition */
  currentWorkflowVersion = computed(() => {
    const def = this.selectedScrapeDefinition();
    return def?.metadata?.version || '0.0.0';
  });

  onVersionBumpResult(result: VersionBumpResult): void {
    this.showVersionBump.set(false);

    if (!result.confirmed) {
      this.pendingWorkflowData.set(null);
      return;
    }

    const id = this.selectedScrape();
    const data = this.pendingWorkflowData();
    if (!id || !data) return;

    // Apply new version to the workflow data
    if (data.metadata) {
      data.metadata.version = result.newVersion;
    } else {
      data.metadata = { version: result.newVersion };
    }

    this.scrapeService
      .updateScrape(id, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          this.selectedScrapeDefinition.set(data);
          await this.store.scrapes.load();
          this.pendingWorkflowData.set(null);
        },
        error: (err) => console.error('Failed to save workflow:', err),
      });
  }

  onWorkflowExport(): void {
    const id = this.selectedScrape();
    if (!id) return;

    this.scrapeService
      .exportScrape(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${id}.jsonc`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (err) => console.error('Failed to export workflow:', err),
      });
  }

  onWorkflowDelete(): void {
    const id = this.selectedScrape();
    if (!id || !this.isCustomWorkflow()) return;

    this.scrapeService
      .deleteScrape(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          // Clear selection immediately to prevent stale requests
          this.selectedScrape.set(null);
          this.selectedScrapeDefinition.set(null);
          this.router.navigate(['/']);
          // Reload after navigation to avoid fetching deleted scrape
          await this.store.scrapes.load();
        },
        error: (err) => console.error('Failed to delete workflow:', err),
      });
  }

  onWorkflowImport(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      // Send raw content to API for JSONC parsing (supports comments)
      this.scrapeService
        .importScrape({ content })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: async (result) => {
            if (result.imported.length > 0) {
              // Reload scrapes, then select the first imported workflow
              await this.store.scrapes.load();
              this.selectScrape(result.imported[0]);
            }
            if (result.conflicts.length > 0) {
              this.notificationService.showFromBackend({
                notificationId: `import-conflict-${Date.now()}`,
                scrapeId: '__system__',
                type: 'warning',
                title: 'Import: Konflikte',
                message: `Workflows bereits vorhanden: ${result.conflicts.join(', ')}`,
                autoDismiss: 5000,
              });
            }
          },
          error: (err) => {
            const message =
              err.error?.message || err.message || 'Import fehlgeschlagen';
            this.notificationService.showFromBackend({
              notificationId: `import-error-${Date.now()}`,
              scrapeId: '__system__',
              type: 'error',
              title: 'Import fehlgeschlagen',
              message,
              autoDismiss: 5000,
            });
          },
        });
    };
    reader.readAsText(file);
  }

  openCreateWorkflow(): void {
    this.router.navigate([{ outlets: { modal: ['workflow-editor'] } }]);
  }

  /**
   * Rekursive Initialisierung der Actions inkl. verschachtelter Loop-Actions
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private initializeActionsRecursive(actions: any[]): RunActionItem[] {
    return actions.map((action) => {
      const baseAction: RunActionItem = {
        name: action.name,
        actionType: action.action,
        status: 'pending' as const,
      };

      // Bei Loop-Actions: Initialisiere Loop-Felder und extrahiere verschachtelte Actions
      if (action.action === 'loop') {
        const nestedActions = action.params?.actions || [];
        return {
          ...baseAction,
          loopIterations: [],
          loopTotal: 0,
          loopCurrent: 0,
          // Speichere die verschachtelten Actions für spätere Verwendung
          nestedActions: this.initializeActionsRecursive(nestedActions),
        };
      }

      return baseAction;
    });
  }
}
