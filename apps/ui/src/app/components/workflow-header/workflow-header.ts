import {
  Component,
  computed,
  input,
  output,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrapeMetadataResolved } from '@scrape-dojo/shared';
import { ScrapeIconComponent } from '../scrape-icon/scrape-icon.component';
import { ButtonComponent } from '../shared/button/button';
import { TranslocoModule } from '@jsverse/transloco';
import 'iconify-icon';

export type TabType =
  | 'history'
  | 'definition'
  | 'visual'
  | 'output'
  | 'variables';

@Component({
  selector: 'app-workflow-header',
  standalone: true,
  imports: [
    CommonModule,
    ScrapeIconComponent,
    ButtonComponent,
    TranslocoModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './workflow-header.html',
})
export class WorkflowHeaderComponent {
  scrapeId = input.required<string>();
  metadata = input<ScrapeMetadataResolved | undefined>();
  isRunning = input<boolean>(false);
  activeTab = input.required<TabType>();
  activeTabChange = output<TabType>();
  historyCount = input<number>(0);
  liveOutputCount = input<number>(0);
  scheduleEnabled = input<boolean>(false);
  nextScheduledRun = input<number | null>(null);

  isCustom = input<boolean>(false);

  run = output<void>();
  stop = output<void>();
  openSchedule = output<void>();
  exportWorkflow = output<void>();
  deleteWorkflow = output<void>();

  /** Check if workflow is disabled (explicitly or no triggers) */
  isDisabled = computed(() => {
    const meta = this.metadata();
    if (meta?.disabled) return true;
    const triggers = meta?.triggers;
    return !triggers || triggers.length === 0;
  });

  /** Check if manual trigger is available */
  canRunManually = computed(() => {
    const meta = this.metadata();
    if (meta?.disabled) return false;
    const triggers = meta?.triggers;
    if (!triggers || triggers.length === 0) return false;
    return triggers.some((t) => t.type === 'manual');
  });

  /** Check if cron/schedule trigger is available */
  canSchedule = computed(() => {
    const meta = this.metadata();
    if (meta?.disabled) return false;
    const triggers = meta?.triggers;
    if (!triggers || triggers.length === 0) return false;
    return triggers.some((t) => t.type === 'cron');
  });

  /** Get tooltip for run button */
  getRunButtonTooltip = computed(() => {
    const meta = this.metadata();
    if (meta?.disabled) return 'Workflow ist deaktiviert';
    const triggers = meta?.triggers;
    if (!triggers || triggers.length === 0) return 'Kein Trigger konfiguriert';
    if (!triggers.some((t) => t.type === 'manual'))
      return 'Kein manueller Trigger konfiguriert';
    return 'Workflow ausführen';
  });

  /** Get tooltip for schedule button */
  getScheduleButtonTooltip = computed(() => {
    const meta = this.metadata();
    if (meta?.disabled) return 'Workflow ist deaktiviert';
    const triggers = meta?.triggers;
    if (!triggers || triggers.length === 0) return 'Kein Trigger konfiguriert';
    if (!triggers.some((t) => t.type === 'cron'))
      return 'Kein Cron-Trigger konfiguriert';
    if (this.scheduleEnabled() && this.nextScheduledRun()) {
      return 'Nächster Lauf: ' + this.formatNextRun();
    }
    return 'Automatisierung konfigurieren';
  });

  runScrape(): void {
    if (!this.canRunManually()) return;
    this.run.emit();
  }

  stopScrape(): void {
    this.stop.emit();
  }

  setTab(tab: TabType): void {
    this.activeTabChange.emit(tab);
  }

  openScheduleModal(): void {
    if (!this.canSchedule()) return;
    this.openSchedule.emit();
  }

  onExport(): void {
    this.exportWorkflow.emit();
  }

  onDelete(): void {
    this.deleteWorkflow.emit();
  }

  formatNextRun(): string {
    const next = this.nextScheduledRun();
    if (!next) return '';
    const date = new Date(next);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
