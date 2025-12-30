import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Run } from './run.entity';

/**
 * Persistente Daten die von Actions (z.B. storeData) gespeichert werden.
 * 
 * - Job-Level: runId = null → Daten die über alle Runs hinweg bestehen (z.B. amazon.lastOrderId)
 * - Run-Level: runId gesetzt → Daten die zu einem spezifischen Run gehören (für Visualisierung)
 */
@Entity('scrape_data')
@Index(['scrapeId', 'key'], { unique: false }) // Für schnelle Lookups
@Index(['scrapeId', 'runId', 'key']) // Für Run-spezifische Queries
export class ScrapeData {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    scrapeId: string; // z.B. "amazon"

    @Column({ nullable: true })
    runId: string | null; // null = Job-Level, sonst Run-Level

    @Column()
    key: string; // z.B. "lastOrderId" oder "orderIdClean"

    @Column({ type: 'text' })
    value: string; // Der gespeicherte Wert (als String, kann JSON sein)

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Optional: Relation zum Run (wenn runId gesetzt)
    @ManyToOne(() => Run, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'runId' })
    run: Run | null;
}
