import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { RunStep } from './run-step.entity';
import { RunLog } from './run-log.entity';

export type RunStatus = 'running' | 'completed' | 'error' | 'aborted';
export type RunTrigger = 'manual' | 'scheduled' | 'api';

@Entity('runs')
export class Run {
    @PrimaryColumn()
    id: string; // z.B. run-1703260000000-abc123

    @Column()
    scrapeId: string;

    @Column({ type: 'text', default: 'running' })
    status: RunStatus;

    @Column({ type: 'text', default: 'manual' })
    trigger: RunTrigger;

    @CreateDateColumn()
    startTime: Date;

    @Column({ type: 'datetime', nullable: true })
    endTime: Date | null;

    @Column({ type: 'text', nullable: true })
    error: string | null;

    @OneToMany(() => RunStep, step => step.run, { cascade: true })
    steps: RunStep[];

    @OneToMany(() => RunLog, log => log.run, { cascade: true })
    logs: RunLog[];
}
