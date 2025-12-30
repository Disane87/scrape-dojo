import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Run } from './run.entity';
import { RunAction } from './run-action.entity';

export type StepStatus = 'pending' | 'running' | 'completed' | 'error' | 'skipped';

@Entity('run_steps')
export class RunStep {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    runId: string;

    @Column()
    stepIndex: number;

    @Column()
    stepName: string;

    @Column({ type: 'text', default: 'pending' })
    status: StepStatus;

    @Column({ type: 'datetime', nullable: true })
    startTime: Date | null;

    @Column({ type: 'datetime', nullable: true })
    endTime: Date | null;

    @ManyToOne(() => Run, run => run.steps, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'runId' })
    run: Run;

    @OneToMany(() => RunAction, action => action.step, { cascade: true })
    actions: RunAction[];
}
