import {
  Component,
  EventEmitter,
  Output,
  signal,
  computed,
  effect,
  inject,
  OnInit,
  DestroyRef,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CronBuilderComponent } from '../cron-builder/cron-builder';
import { ScrapeSchedule } from '@scrape-dojo/shared';
import { ScrapeService } from '../../services/scrape.service';
import {
  ModalComponent,
  ToggleComponent,
  ButtonComponent,
  SpinnerComponent,
  AlertComponent,
} from '../shared';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import 'iconify-icon';

@Component({
  selector: 'app-schedule-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    CronBuilderComponent,
    ModalComponent,
    ToggleComponent,
    ButtonComponent,
    SpinnerComponent,
    AlertComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './schedule-modal.html',
  styleUrls: ['./schedule-modal.scss'],
})
export class ScheduleModalComponent implements OnInit {
  private scrapeService = inject(ScrapeService);
  private transloco = inject(TranslocoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  @Output() saved = new EventEmitter<ScrapeSchedule>();

  isOpen = signal(true); // Always true for auxiliary route
  scrapeId = signal<string | null>(null);
  scrapeName = signal('');

  ngOnInit(): void {
    // Load scrapeId from route params
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params['scrapeId'];
        if (id) {
          this.scrapeId.set(id);
          this.loadSchedule(id);
        }
      });
  }

  // Form state
  manualEnabled = signal(true);
  scheduleEnabled = signal(false);
  cronExpression = signal('0 9 * * *');
  timezone = signal('Europe/Berlin');

  // UI state
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  // Schedule info
  lastScheduledRun = signal<number | null>(null);
  nextScheduledRun = signal<number | null>(null);

  // Computed
  isValid = computed(() => {
    // Mindestens eine Option muss aktiviert sein
    if (!this.manualEnabled() && !this.scheduleEnabled()) {
      return false;
    }
    // Wenn Schedule aktiviert, muss Cron-Ausdruck vorhanden sein
    if (this.scheduleEnabled() && !this.cronExpression()) {
      return false;
    }
    return true;
  });

  hasChanges = signal(false);

  private originalState: {
    manualEnabled: boolean;
    scheduleEnabled: boolean;
    cronExpression: string;
    timezone: string;
  } | null = null;

  constructor() {
    // Track changes
    effect(() => {
      const manual = this.manualEnabled();
      const schedule = this.scheduleEnabled();
      const cron = this.cronExpression();
      const tz = this.timezone();

      if (this.originalState) {
        this.hasChanges.set(
          manual !== this.originalState.manualEnabled ||
            schedule !== this.originalState.scheduleEnabled ||
            cron !== this.originalState.cronExpression ||
            tz !== this.originalState.timezone,
        );
      }
    });
  }

  private async loadSchedule(scrapeId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const schedule = await firstValueFrom(
        this.scrapeService.getSchedule(scrapeId),
      );

      if (schedule) {
        this.manualEnabled.set(schedule.manualEnabled);
        this.scheduleEnabled.set(schedule.scheduleEnabled);
        this.cronExpression.set(schedule.cronExpression || '0 9 * * *');
        this.timezone.set(schedule.timezone || 'Europe/Berlin');
        this.lastScheduledRun.set(schedule.lastScheduledRun);
        this.nextScheduledRun.set(schedule.nextScheduledRun);

        this.originalState = {
          manualEnabled: schedule.manualEnabled,
          scheduleEnabled: schedule.scheduleEnabled,
          cronExpression: schedule.cronExpression || '0 9 * * *',
          timezone: schedule.timezone || 'Europe/Berlin',
        };
        this.hasChanges.set(false);
      }
    } catch (err: any) {
      console.error('Error loading schedule:', err);
      this.error.set(
        err.message || this.transloco.translate('common.load_failed'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  onCronExpressionChange(expression: string): void {
    this.cronExpression.set(expression);
  }

  async save(): Promise<void> {
    const scrapeId = this.scrapeId();
    if (!scrapeId || !this.isValid() || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);

    try {
      const schedule = await firstValueFrom(
        this.scrapeService.updateSchedule(scrapeId, {
          manualEnabled: this.manualEnabled(),
          scheduleEnabled: this.scheduleEnabled(),
          cronExpression: this.scheduleEnabled() ? this.cronExpression() : null,
          timezone: this.timezone(),
        }),
      );

      if (schedule) {
        this.saved.emit(schedule);
        this.close();
      }
    } catch (err: any) {
      this.error.set(
        err.message || this.transloco.translate('common.save_failed'),
      );
    } finally {
      this.saving.set(false);
    }
  }

  close(): void {
    this.router.navigate([{ outlets: { modal: null } }]);
  }

  formatDateTime(timestamp: number | null): string {
    if (!timestamp) return '—';
    const lang = this.transloco.getActiveLang();
    const locale = lang === 'de' ? 'de-DE' : 'en-US';
    return new Date(timestamp).toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
