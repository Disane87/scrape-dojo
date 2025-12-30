import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RunStep } from './run-step.entity';

export type ActionStatus = 'pending' | 'running' | 'completed' | 'error' | 'waiting' | 'skipped';

@Entity('run_actions')
export class RunAction {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    stepId: number;

    @Column()
    actionIndex: number;

    @Column({ nullable: true })
    actionName: string;

    @Column()
    actionType: string;

    @Column({ type: 'text', default: 'pending' })
    status: ActionStatus;

    @Column({ type: 'datetime', nullable: true })
    startTime: Date | null;

    @Column({ type: 'datetime', nullable: true })
    endTime: Date | null;

    @Column({ type: 'text', nullable: true })
    error: string | null;

    @Column({ type: 'text', nullable: true })
    result: string | null; // JSON-serialized result

    @Column({ type: 'text', nullable: true })
    loopData: string | null; // JSON-serialized loop iterations with child action results

    @ManyToOne(() => RunStep, step => step.actions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'stepId' })
    step: RunStep;
}
