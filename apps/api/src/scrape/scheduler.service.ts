import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ScrapeService } from './scrape.service';
import { CronExpressionParser } from 'cron-parser';

interface ScheduledJob {
  scrapeId: string;
  cronExpression: string;
  timezone: string;
  timeout: NodeJS.Timeout | null;
}

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private jobs: Map<string, ScheduledJob> = new Map();
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    private databaseService: DatabaseService,
    private scrapeService: ScrapeService,
  ) {}

  async onModuleInit() {
    this.logger.log('🕐 Scheduler service initializing...');
    await this.loadSchedules();
    this.startScheduleChecker();
  }

  onModuleDestroy() {
    this.stopAll();
  }

  /**
   * Load all enabled schedules from database
   */
  async loadSchedules(): Promise<void> {
    try {
      const schedules = await this.databaseService.getEnabledSchedules();
      this.logger.log(`📅 Found ${schedules.length} enabled schedule(s)`);

      for (const schedule of schedules) {
        if (schedule.cronExpression) {
          await this.scheduleJob(
            schedule.scrapeId,
            schedule.cronExpression,
            schedule.timezone,
          );
        }
      }
    } catch (error) {
      this.logger.error(`❌ Failed to load schedules: ${error.message}`);
    }
  }

  /**
   * Schedule a job for a scrape
   */
  async scheduleJob(
    scrapeId: string,
    cronExpression: string,
    timezone: string = 'Europe/Berlin',
  ): Promise<void> {
    // Remove existing job if any
    this.removeJob(scrapeId);

    try {
      const nextRun = this.getNextRunTime(cronExpression, timezone);
      if (!nextRun) {
        this.logger.warn(
          `⚠️ Invalid cron expression for ${scrapeId}: ${cronExpression}`,
        );
        return;
      }

      const job: ScheduledJob = {
        scrapeId,
        cronExpression,
        timezone,
        timeout: null,
      };

      this.jobs.set(scrapeId, job);
      this.scheduleNextRun(job);

      // Update next run in database
      await this.databaseService.updateNextScheduledRun(scrapeId, nextRun);

      this.logger.log(
        `✅ Scheduled ${scrapeId}: ${cronExpression} (next: ${nextRun.toLocaleString('de-DE')})`,
      );
    } catch (error) {
      this.logger.error(`❌ Failed to schedule ${scrapeId}: ${error.message}`);
    }
  }

  /**
   * Remove a scheduled job
   */
  removeJob(scrapeId: string): void {
    const job = this.jobs.get(scrapeId);
    if (job?.timeout) {
      clearTimeout(job.timeout);
    }
    this.jobs.delete(scrapeId);
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    this.logger.log('🛑 Stopping all scheduled jobs...');
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    for (const [scrapeId] of this.jobs) {
      this.removeJob(scrapeId);
    }
  }

  /**
   * Get next run time for a cron expression
   */
  getNextRunTime(
    cronExpression: string,
    timezone: string = 'Europe/Berlin',
  ): Date | null {
    try {
      const interval = CronExpressionParser.parse(cronExpression, {
        tz: timezone,
        currentDate: new Date(),
      });
      return interval.next().toDate();
    } catch {
      return null;
    }
  }

  /**
   * Schedule the next run for a job
   */
  private scheduleNextRun(job: ScheduledJob): void {
    const nextRun = this.getNextRunTime(job.cronExpression, job.timezone);
    if (!nextRun) return;

    const now = new Date();
    const delay = nextRun.getTime() - now.getTime();

    // Maximal 24 Stunden im Voraus planen (setInterval hat Limits)
    const maxDelay = 24 * 60 * 60 * 1000;
    const actualDelay = Math.min(delay, maxDelay);

    if (job.timeout) {
      clearTimeout(job.timeout);
    }

    job.timeout = setTimeout(async () => {
      if (delay <= maxDelay) {
        // Zeit für den Run
        await this.executeScheduledRun(job);
      }
      // Nächsten Run planen
      this.scheduleNextRun(job);
    }, actualDelay);
  }

  /**
   * Execute a scheduled run
   */
  private async executeScheduledRun(job: ScheduledJob): Promise<void> {
    this.logger.log(`🚀 Executing scheduled run for ${job.scrapeId}`);

    try {
      // Update last scheduled run
      await this.databaseService.updateLastScheduledRun(job.scrapeId);

      // Generate unique run ID
      const runId = `scheduled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Execute the scrape with 'scheduled' trigger
      await this.scrapeService.scrape(
        job.scrapeId,
        runId,
        undefined,
        'scheduled',
      );

      // Update next run time
      const nextRun = this.getNextRunTime(job.cronExpression, job.timezone);
      await this.databaseService.updateNextScheduledRun(job.scrapeId, nextRun);

      this.logger.log(`✅ Scheduled run completed for ${job.scrapeId}`);
    } catch (error) {
      this.logger.error(
        `❌ Scheduled run failed for ${job.scrapeId}: ${error.message}`,
      );
    }
  }

  /**
   * Periodically check and reschedule jobs (handles server restarts, etc.)
   */
  private startScheduleChecker(): void {
    // Alle 5 Minuten prüfen
    this.checkInterval = setInterval(
      async () => {
        await this.syncSchedules();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Sync schedules from database
   */
  async syncSchedules(): Promise<void> {
    const schedules = await this.databaseService.getEnabledSchedules();
    const enabledIds = new Set(schedules.map((s) => s.scrapeId));

    // Entferne Jobs die nicht mehr enabled sind
    for (const [scrapeId] of this.jobs) {
      if (!enabledIds.has(scrapeId)) {
        this.removeJob(scrapeId);
        this.logger.log(`🗑️ Removed disabled schedule: ${scrapeId}`);
      }
    }

    // Füge/aktualisiere enabled Jobs
    for (const schedule of schedules) {
      if (schedule.cronExpression) {
        const existing = this.jobs.get(schedule.scrapeId);
        if (!existing || existing.cronExpression !== schedule.cronExpression) {
          await this.scheduleJob(
            schedule.scrapeId,
            schedule.cronExpression,
            schedule.timezone,
          );
        }
      }
    }
  }

  /**
   * Get status of all scheduled jobs
   */
  getStatus(): {
    scrapeId: string;
    cronExpression: string;
    nextRun: Date | null;
  }[] {
    return Array.from(this.jobs.values()).map((job) => ({
      scrapeId: job.scrapeId,
      cronExpression: job.cronExpression,
      nextRun: this.getNextRunTime(job.cronExpression, job.timezone),
    }));
  }
}
