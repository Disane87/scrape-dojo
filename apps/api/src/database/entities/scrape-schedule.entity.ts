import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Schedule-Einstellungen für Scrapes.
 *
 * Speichert ob ein Scrape manuell und/oder automatisch (via Cron) laufen kann.
 */
@Entity('scrape_schedule')
export class ScrapeSchedule {
  @PrimaryColumn()
  scrapeId: string; // z.B. "amazon"

  /** Ob der Scrape manuell gestartet werden kann */
  @Column({ default: true })
  manualEnabled: boolean;

  /** Ob der Scrape automatisch via Cron laufen soll */
  @Column({ default: false })
  scheduleEnabled: boolean;

  /** Cron-Ausdruck für automatische Ausführung (z.B. "0 9 * * *") */
  @Column({ nullable: true })
  cronExpression: string | null;

  /** Zeitzone für den Cron (default: Europe/Berlin) */
  @Column({ default: 'Europe/Berlin' })
  timezone: string;

  /** Letzter automatischer Run */
  @Column({ type: 'datetime', nullable: true })
  lastScheduledRun: Date | null;

  /** Nächster geplanter Run (berechnet aus Cron) */
  @Column({ type: 'datetime', nullable: true })
  nextScheduledRun: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
