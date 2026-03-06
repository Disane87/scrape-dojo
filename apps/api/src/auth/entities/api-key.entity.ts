import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('api_keys')
@Index(['userId'])
@Index(['keyHash'], { unique: true })
export class ApiKeyEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  /**
   * Non-sensitive prefix shown in UI (e.g. "sdj_12ab...")
   */
  @Column()
  keyPrefix: string;

  /**
   * SHA-256 hash of the full API key. The plaintext key is only shown once on creation.
   */
  @Column()
  keyHash: string;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: { to: (v) => v, from: (v) => (v ? Number(v) : null) },
  })
  lastUsedAt?: number | null;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: { to: (v) => v, from: (v) => (v ? Number(v) : null) },
  })
  revokedAt?: number | null;

  @CreateDateColumn({
    type: 'bigint',
    transformer: {
      to: (value) => value,
      from: (value) => {
        const n = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(n) ? n : Date.now();
      },
    },
  })
  createdAt: number;

  @UpdateDateColumn({
    type: 'bigint',
    transformer: {
      to: (value) => value,
      from: (value) => {
        const n = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(n) ? n : Date.now();
      },
    },
  })
  updatedAt: number;
}
