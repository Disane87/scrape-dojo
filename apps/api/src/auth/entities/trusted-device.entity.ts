import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('trusted_devices')
@Index(['userId'])
export class TrustedDeviceEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: string;

  /**
   * Device fingerprint (hash of User-Agent, IP, etc.)
   */
  @Column()
  deviceFingerprint: string;

  /**
   * Human-readable device name (e.g., "Chrome on Windows")
   */
  @Column({ nullable: true })
  deviceName?: string;

  /**
   * Last IP address used from this device
   */
  @Column({ nullable: true })
  lastIpAddress?: string;

  /**
   * Last time this device was used
   */
  @Column({
    type: 'bigint',
    transformer: {
      to: (value) => value,
      from: (value) => (value ? Number(value) : null),
    },
  })
  lastUsedAt: number;

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
