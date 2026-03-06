import {
  Component,
  input,
  output,
  signal,
  computed,
  ViewChild,
  ElementRef,
  effect,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrapeEvent, LogLevel, ScrapeEventType } from '@scrape-dojo/shared';
import { TranslocoModule } from '@jsverse/transloco';
import 'iconify-icon';

export type LogFilterMode = 'all' | 'workflow';
export type LogDisplayMode = 'logs-only' | 'all-events';

@Component({
  selector: 'app-log-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './log-viewer.html',
  styleUrl: './log-viewer.scss',
})
export class LogViewerComponent {
  // Signal Inputs
  logs = input<ScrapeEvent[]>([]);
  title = input('Logs');
  filterMode = input<LogFilterMode>('all');
  /** 'logs-only' zeigt nur log-Events, 'all-events' zeigt alle Event-Typen (step-start, action-complete, etc.) */
  displayMode = input<LogDisplayMode>('logs-only');
  scrapeId = input<string | undefined>(undefined);
  runId = input<string | undefined>(undefined);
  height = input(200);
  showHeader = input(true);
  collapsible = input(true);
  initiallyExpanded = input(true);
  autoScroll = input(true);
  /** Zeigt "Live" Badge wenn true */
  isLive = input(false);

  // Outputs
  heightChange = output<number>();
  expandedChange = output<boolean>();
  clear = output<void>();

  @ViewChild('logsContainer') logsContainer?: ElementRef<HTMLDivElement>;

  // State
  isExpanded = signal(true);
  isResizing = signal(false);
  selectedLevels = signal<Set<LogLevel>>(
    new Set(['log', 'error', 'warn', 'debug', 'verbose']),
  );
  currentHeight = signal(200); // Internal height for resize
  autoScrollPaused = signal(false); // User can manually pause auto-scroll
  private shouldAutoScroll = true;

  // Grouping State
  groupByContext = signal(false); // Toggle für Gruppierung nach Context
  collapsedGroups = signal<Set<string>>(new Set()); // Collapsed context groups

  // Available log levels
  readonly logLevels: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

  // Helper für Template: Object.keys
  readonly Object = Object;

  // Filtered logs - computed based on signal inputs
  filteredLogs = computed(() => {
    let filtered = this.logs();

    // Filter by scrapeId if in workflow mode
    if (this.filterMode() === 'workflow' && this.scrapeId()) {
      filtered = filtered.filter((log) => log.scrapeId === this.scrapeId());
    }

    // Filter by runId if provided
    if (this.runId()) {
      filtered = filtered.filter((log) => log.runId === this.runId());
    }

    // In logs-only mode, only show log events
    if (this.displayMode() === 'logs-only') {
      filtered = filtered.filter((log) => log.type === 'log');
    }

    // Filter by selected log levels (nur für log-Events)
    const levels = this.selectedLevels();
    if (levels.size < this.logLevels.length) {
      filtered = filtered.filter((log) => {
        // Nur log-type Events haben logLevel
        if (log.type !== 'log') return true;
        return levels.has(log.logLevel || 'log');
      });
    }

    return filtered;
  });

  // Grouped logs - gruppiert nach logContext in zeitlichen Blöcken
  // Logs werden nur gruppiert wenn sie zeitlich nah beieinander sind (max 5 Sekunden Abstand)
  groupedLogs = computed(() => {
    if (!this.groupByContext()) {
      return null; // Keine Gruppierung
    }

    const logs = this.filteredLogs();
    const groups: Array<{
      id: string;
      context: string;
      logs: ScrapeEvent[];
      hasErrors: boolean;
      hasWarnings: boolean;
      startTime: number;
    }> = [];

    // Maximaler Zeitabstand in ms für eine Gruppe (5 Sekunden)
    const MAX_TIME_GAP = 5000;

    let currentGroup: {
      id: string;
      context: string;
      logs: ScrapeEvent[];
      startTime: number;
    } | null = null;

    for (const log of logs) {
      const context = log.logContext || log.scrapeId || 'System';
      const timestamp = log.timestamp || 0;

      // Prüfe ob wir eine neue Gruppe starten müssen
      const shouldStartNewGroup =
        !currentGroup ||
        currentGroup.context !== context ||
        timestamp -
          (currentGroup.logs[currentGroup.logs.length - 1]?.timestamp || 0) >
          MAX_TIME_GAP;

      if (shouldStartNewGroup) {
        // Starte neue Gruppe
        currentGroup = {
          id: `${context}-${timestamp}`,
          context,
          logs: [log],
          startTime: timestamp,
        };
        groups.push({
          ...currentGroup,
          hasErrors: log.logLevel === 'error',
          hasWarnings: log.logLevel === 'warn',
        });
      } else {
        // Füge zur aktuellen Gruppe hinzu
        currentGroup!.logs.push(log);
        // Update Fehler/Warn-Status der Gruppe
        const lastGroup = groups[groups.length - 1];
        if (log.logLevel === 'error') lastGroup.hasErrors = true;
        if (log.logLevel === 'warn') lastGroup.hasWarnings = true;
      }
    }

    return groups;
  });

  constructor() {
    // Initialize isExpanded from initiallyExpanded
    effect(
      () => {
        const initial = this.initiallyExpanded();
        this.isExpanded.set(initial);
      },
      { allowSignalWrites: true },
    );

    // Sync height input to internal currentHeight
    effect(
      () => {
        const h = this.height();
        this.currentHeight.set(h);
      },
      { allowSignalWrites: true },
    );

    // Auto-scroll when logs change
    effect(() => {
      const logs = this.logs();
      const paused = this.autoScrollPaused();
      // Aktiviere auto-scroll wieder bei neuen Logs (außer wenn manuell pausiert)
      if (logs.length > 0 && this.autoScroll() && !paused) {
        this.shouldAutoScroll = true;
        this.scrollToBottom();
      }
    });
  }

  toggleAutoScroll(): void {
    this.autoScrollPaused.update((v) => !v);
    // Wenn wieder aktiviert, sofort nach unten scrollen
    if (!this.autoScrollPaused()) {
      this.shouldAutoScroll = true;
      this.scrollToBottom();
    }
  }

  toggleExpanded(): void {
    if (!this.collapsible()) return;
    this.isExpanded.update((v) => !v);
    this.expandedChange.emit(this.isExpanded());
  }

  toggleGrouping(): void {
    this.groupByContext.update((v) => !v);
    // Collapse-Zustand zurücksetzen wenn Gruppierung deaktiviert wird
    if (!this.groupByContext()) {
      this.collapsedGroups.set(new Set());
    }
  }

  toggleGroup(groupId: string): void {
    this.collapsedGroups.update((groups) => {
      const newGroups = new Set(groups);
      if (newGroups.has(groupId)) {
        newGroups.delete(groupId);
      } else {
        newGroups.add(groupId);
      }
      return newGroups;
    });
  }

  isGroupCollapsed(groupId: string): boolean {
    return this.collapsedGroups().has(groupId);
  }

  collapseAllGroups(): void {
    const groups = this.groupedLogs();
    if (groups) {
      this.collapsedGroups.set(new Set(groups.map((g) => g.id)));
    }
  }

  expandAllGroups(): void {
    this.collapsedGroups.set(new Set());
  }

  toggleLevel(level: LogLevel): void {
    this.selectedLevels.update((levels) => {
      const newLevels = new Set(levels);
      if (newLevels.has(level)) {
        newLevels.delete(level);
      } else {
        newLevels.add(level);
      }
      return newLevels;
    });
  }

  selectAllLevels(): void {
    this.selectedLevels.set(new Set(this.logLevels));
  }

  selectOnlyErrors(): void {
    this.selectedLevels.set(new Set(['error', 'warn']));
  }

  isLevelSelected(level: LogLevel): boolean {
    return this.selectedLevels().has(level);
  }

  onScroll(event: Event): void {
    const container = event.target as HTMLElement;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      50;
    this.shouldAutoScroll = isAtBottom;
  }

  scrollToBottom(): void {
    if (!this.shouldAutoScroll || this.autoScrollPaused()) return;

    setTimeout(() => {
      const container = this.logsContainer?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing.set(true);

    const startY = event.clientY;
    const startHeight = this.currentHeight();

    const onMouseMove = (e: MouseEvent) => {
      const delta = startY - e.clientY;
      const newHeight = Math.min(
        Math.max(100, startHeight + delta),
        window.innerHeight - 100,
      );
      this.currentHeight.set(newHeight);
      this.heightChange.emit(newHeight);
    };

    const onMouseUp = () => {
      this.isResizing.set(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  onClear(): void {
    this.clear.emit();
  }

  getLogLevelColor(level?: LogLevel): string {
    switch (level) {
      case 'error':
        return 'bg-dojo-danger/20 text-dojo-danger';
      case 'warn':
        return 'bg-dojo-warning/20 text-dojo-warning';
      case 'debug':
        return 'bg-dojo-text-muted/20 text-dojo-text-muted';
      case 'verbose':
        return 'bg-dojo-text-subtle/20 text-dojo-text-subtle';
      case 'log':
      default:
        return 'bg-dojo-accent/20 text-dojo-accent';
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLogLevelIcon(level?: LogLevel): string {
    return '●';
  }

  getLogLevelIconColor(level?: LogLevel): string {
    switch (level) {
      case 'error':
        return 'text-dojo-danger';
      case 'warn':
        return 'text-dojo-warning';
      case 'debug':
        return 'text-dojo-text-muted';
      case 'verbose':
        return 'text-dojo-text-subtle';
      case 'log':
      default:
        return 'text-dojo-accent';
    }
  }

  getLevelBadgeClass(level: LogLevel): string {
    const base =
      'px-1.5 py-0.5 text-xs rounded cursor-pointer transition-all border';
    const selected = this.isLevelSelected(level);

    switch (level) {
      case 'error':
        return `${base} border-dojo-danger text-dojo-danger ${selected ? 'bg-dojo-danger/10' : 'opacity-40'}`;
      case 'warn':
        return `${base} border-dojo-warning text-dojo-warning ${selected ? 'bg-dojo-warning/10' : 'opacity-40'}`;
      case 'debug':
        return `${base} border-dojo-text-muted text-dojo-text-muted ${selected ? 'bg-dojo-text-muted/10' : 'opacity-40'}`;
      case 'verbose':
        return `${base} border-dojo-text-subtle text-dojo-text-subtle ${selected ? 'bg-dojo-text-subtle/10' : 'opacity-40'}`;
      case 'log':
      default:
        return `${base} border-dojo-accent text-dojo-accent ${selected ? 'bg-dojo-accent/10' : 'opacity-40'}`;
    }
  }

  // Event Type Helpers (für all-events mode)
  getEventIcon(type: ScrapeEventType): string {
    switch (type) {
      case 'step-start':
        return '▶️';
      case 'step-complete':
        return '✅';
      case 'step-status':
        return '�';
      case 'action-start':
        return '⏳';
      case 'action-complete':
        return '✔️';
      case 'action-status':
        return '⚡';
      case 'scrape-start':
        return '🚀';
      case 'scrape-complete':
        return '🎉';
      case 'scrape-end':
        return '🏁';
      case 'error':
        return '❌';
      case 'loop-iteration':
        return '🔁';
      case 'log':
        return '📝';
      default:
        return '📌';
    }
  }

  formatEventType(type: ScrapeEventType): string {
    switch (type) {
      case 'step-status':
        return 'step';
      case 'action-status':
        return 'action';
      case 'loop-iteration':
        return 'loop';
      case 'scrape-start':
        return 'start';
      case 'scrape-end':
        return 'end';
      case 'scrape-complete':
        return 'complete';
      default:
        return type;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'running':
        return 'bg-dojo-accent/20 text-dojo-accent';
      case 'completed':
        return 'bg-dojo-success/20 text-dojo-success';
      case 'success':
        return 'bg-dojo-success/20 text-dojo-success';
      case 'error':
        return 'bg-dojo-danger/20 text-dojo-danger';
      case 'failed':
        return 'bg-dojo-danger/20 text-dojo-danger';
      case 'pending':
        return 'bg-dojo-border text-dojo-text-muted';
      case 'skipped':
        return 'bg-dojo-text-subtle/20 text-dojo-text-subtle';
      default:
        return 'bg-dojo-border text-dojo-text-muted';
    }
  }

  getEventTypeColor(type: ScrapeEventType): string {
    switch (type) {
      case 'error':
        return 'bg-dojo-danger/20 text-dojo-danger';
      case 'step-start':
        return 'bg-dojo-accent/20 text-dojo-accent';
      case 'step-complete':
        return 'bg-dojo-success/20 text-dojo-success';
      case 'step-status':
        return 'bg-dojo-accent/20 text-dojo-accent';
      case 'action-start':
        return 'bg-dojo-purple/20 text-dojo-purple';
      case 'action-complete':
        return 'bg-dojo-success/20 text-dojo-success';
      case 'action-status':
        return 'bg-dojo-purple/20 text-dojo-purple';
      case 'scrape-start':
        return 'bg-dojo-orange/20 text-dojo-orange';
      case 'scrape-complete':
        return 'bg-dojo-success/20 text-dojo-success';
      case 'scrape-end':
        return 'bg-dojo-success/20 text-dojo-success';
      case 'loop-iteration':
        return 'bg-dojo-purple/20 text-dojo-purple';
      default:
        return 'bg-dojo-border text-dojo-text-muted';
    }
  }

  getEventBorderColor(event: ScrapeEvent): string {
    if (event.type === 'error' || event.logLevel === 'error')
      return 'border-dojo-danger bg-dojo-danger/5';
    if (event.logLevel === 'warn')
      return 'border-dojo-warning bg-dojo-warning/5';
    if (event.type === 'step-status') return 'border-dojo-accent/50';
    if (event.type === 'action-status') return 'border-dojo-purple/50';
    if (event.type === 'loop-iteration') return 'border-dojo-purple/30';
    if (event.type === 'scrape-start') return 'border-dojo-orange';
    if (event.type === 'scrape-complete' || event.type === 'scrape-end')
      return 'border-dojo-success';
    if (event.type === 'log') return 'border-dojo-border';
    return 'border-transparent';
  }
}
