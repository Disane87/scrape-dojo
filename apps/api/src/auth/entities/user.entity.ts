import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum AuthProvider {
  LOCAL = 'local',
  OIDC = 'oidc',
}

@Entity('users')
export class UserEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  displayName?: string;

  /**
   * Password hash (only for local auth)
   * Null for OIDC users
   */
  @Column({ nullable: true })
  passwordHash?: string;

  @Column({
    type: 'varchar',
    default: AuthProvider.LOCAL,
  })
  provider: AuthProvider;

  /**
   * External ID from OIDC provider (sub claim)
   */
  @Column({ nullable: true })
  externalId?: string;

  /**
   * OIDC provider identifier (e.g., 'keycloak', 'auth0', 'google')
   */
  @Column({ nullable: true })
  oidcIssuer?: string;

  @Column({
    type: 'varchar',
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (value) => value,
      from: (value) => (value ? Number(value) : null),
    },
  })
  lastLoginAt?: number;

  /**
   * Refresh token hash for token rotation
   */
  @Column({ nullable: true })
  refreshTokenHash?: string;

  /**
   * Mandatory MFA (TOTP) settings
   */
  @Column({ default: false })
  mfaEnabled: boolean;

  /**
   * Encrypted TOTP secret (AES-256-GCM). Stored even before enabling.
   */
  @Column({ nullable: true })
  mfaSecret?: string;

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
