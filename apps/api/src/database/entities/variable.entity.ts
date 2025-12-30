import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { SecretEntity } from './secret.entity';

@Entity('variables')
@Unique(['name', 'workflowId'])
export class VariableEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column('text')
  value: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  scope: 'global' | 'workflow';

  @Column({ nullable: true })
  workflowId?: string;

  @Column({ default: false })
  isSecret: boolean;

  @Column({ nullable: true })
  secretId?: string;

  @ManyToOne(() => SecretEntity, secret => secret.variables, { nullable: true })
  @JoinColumn({ name: 'secretId' })
  secret?: SecretEntity;

  @CreateDateColumn({ type: 'bigint', transformer: { to: (value) => value, from: (value) => Number(value) } })
  createdAt: number;

  @UpdateDateColumn({ type: 'bigint', transformer: { to: (value) => value, from: (value) => Number(value) } })
  updatedAt: number;
}
