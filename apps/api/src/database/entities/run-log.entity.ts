import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Run } from './run.entity';

export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

@Entity('run_logs')
export class RunLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  runId: string;

  @Column({ type: 'text', default: 'log' })
  level: LogLevel;

  @Column({ type: 'text' })
  message: string;

  @Column({ nullable: true })
  context: string;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => Run, (run) => run.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runId' })
  run: Run;
}
