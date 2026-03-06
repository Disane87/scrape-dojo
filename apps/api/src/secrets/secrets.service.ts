import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { VariableEntity } from '../database/entities/variable.entity';

// Types
export interface Secret {
  id: string;
  name: string;
  description?: string;
  value?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SecretListItem {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  maskedValue?: string;
  isEmpty?: boolean;
  linkedWorkflows?: string[];
}

@Injectable()
export class SecretsService implements OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);

  private encryptionKey: Buffer | null = null;

  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;

  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeEncryption();
    this.logger.log('🔐 Secrets service initialized (DB-based)');
  }

  /**
   * Initialize or load the encryption key
   */
  private async initializeEncryption() {
    try {
      const keyHex = this.configService.get<string>(
        'SCRAPE_DOJO_ENCRYPTION_KEY',
      );

      if (!keyHex) {
        this.logger.error(
          '❌ SCRAPE_DOJO_ENCRYPTION_KEY not found in environment variables!',
        );
        this.logger.error(
          'Please add SCRAPE_DOJO_ENCRYPTION_KEY to your .env file (64 hex characters = 256 bits)',
        );
        throw new Error(
          'SCRAPE_DOJO_ENCRYPTION_KEY environment variable is required',
        );
      }

      // Validate key format
      if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
        this.logger.error(
          '❌ Invalid SCRAPE_DOJO_ENCRYPTION_KEY format. Must be 64 hex characters (256 bits)',
        );
        throw new Error('Invalid SCRAPE_DOJO_ENCRYPTION_KEY format');
      }

      this.encryptionKey = Buffer.from(keyHex, 'hex');
      this.logger.debug('🔑 Loaded encryption key from environment');
    } catch (error) {
      this.logger.error('❌ Failed to initialize encryption', error);
      throw error;
    }
  }

  /**
   * Encrypt a value
   */
  private encrypt(value: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    );

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV + AuthTag + Encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a value
   */
  private decrypt(encryptedValue: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Create a masked preview of a value
   */
  private maskValue(value: string): string {
    if (value.length <= 4) {
      return '****';
    }
    const start = value.substring(0, 2);
    const end = value.substring(value.length - 2);
    return `${start}${'*'.repeat(Math.min(value.length - 4, 8))}${end}`;
  }

  /**
   * Get all secrets (without actual values)
   */
  async listSecrets(): Promise<SecretListItem[]> {
    const entities = await this.databaseService.getAllSecrets();

    // Hole alle Variablen um Workflow-Linkings zu finden
    const allVariables = await this.databaseService.dataSource
      .getRepository(VariableEntity)
      .createQueryBuilder('v')
      .select(['v.secretId', 'v.workflowId'])
      .where('v.secretId IS NOT NULL')
      .getRawMany();

    // Gruppiere Workflows nach Secret-ID
    const secretToWorkflows = new Map<string, string[]>();
    for (const v of allVariables) {
      if (!secretToWorkflows.has(v.v_secretId)) {
        secretToWorkflows.set(v.v_secretId, []);
      }
      secretToWorkflows.get(v.v_secretId)!.push(v.v_workflowId);
    }

    return entities.map((entity) => {
      // Prüfe ob Secret leer ist (nur IV + AuthTag + leerer Cipher = ca. 66 Zeichen)
      const isEmpty =
        !entity.encryptedValue || entity.encryptedValue.length < 70;

      return {
        id: entity.id,
        name: entity.name,
        description: entity.description,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        maskedValue: '********',
        isEmpty,
        linkedWorkflows: secretToWorkflows.get(entity.id) || [],
      };
    });
  }

  /**
   * Get a single secret (without actual value)
   */
  async getSecret(id: string): Promise<SecretListItem | null> {
    const entity = await this.databaseService.getSecretById(id);
    if (!entity) return null;

    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      maskedValue: '********',
    };
  }

  /**
   * Get the actual secret value (for internal use only!)
   */
  async getSecretValue(idOrName: string): Promise<string | null> {
    this.logger.debug(`🔍 Looking for secret: ${idOrName}`);
    // Try by ID first
    let entity = await this.databaseService.getSecretById(idOrName);

    // If not found, try by name
    if (!entity) {
      this.logger.debug(`  Not found by ID, trying by name...`);
      entity = await this.databaseService.getSecretByName(idOrName);
    }

    if (!entity) {
      this.logger.warn(`  ❌ Secret not found: ${idOrName}`);
      return null;
    }

    this.logger.debug(
      `  ✅ Found secret: ${entity.name}, encrypted value length: ${entity.encryptedValue?.length || 0}`,
    );

    try {
      const decrypted = this.decrypt(entity.encryptedValue);
      this.logger.debug(
        `  🔓 Decrypted successfully, length: ${decrypted?.length || 0}`,
      );
      return decrypted;
    } catch (error) {
      this.logger.error(`Failed to decrypt secret ${entity.name}:`, error);
      return null;
    }
  }

  /**
   * Create a new secret
   */
  async createSecret(
    name: string,
    value: string,
    description?: string,
  ): Promise<SecretListItem> {
    // Check for duplicate name
    const existing = await this.databaseService.getSecretByName(name);
    if (existing) {
      throw new Error(`Secret with name "${name}" already exists`);
    }

    const id = crypto.randomUUID();
    const encryptedValue = this.encrypt(value);

    const entity = await this.databaseService.createSecret(
      id,
      name,
      encryptedValue,
      description,
    );

    this.logger.log(`✅ Created secret: ${name}`);

    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      maskedValue: this.maskValue(value),
    };
  }

  /**
   * Update a secret
   */
  async updateSecret(
    id: string,
    updates: { name?: string; value?: string; description?: string },
  ): Promise<SecretListItem | null> {
    const entity = await this.databaseService.getSecretById(id);
    if (!entity) return null;

    // Check for duplicate name if name is being changed
    if (updates.name && updates.name !== entity.name) {
      const existing = await this.databaseService.getSecretByName(updates.name);
      if (existing) {
        throw new Error(`Secret with name "${updates.name}" already exists`);
      }
    }

    const dbUpdates: {
      name?: string;
      encryptedValue?: string;
      description?: string;
    } = {};

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.value !== undefined)
      dbUpdates.encryptedValue = this.encrypt(updates.value);
    if (updates.description !== undefined)
      dbUpdates.description = updates.description;

    const updated = await this.databaseService.updateSecret(id, dbUpdates);
    if (!updated) return null;

    this.logger.log(`✅ Updated secret: ${updated.name}`);

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      maskedValue: updates.value ? this.maskValue(updates.value) : '********',
    };
  }

  /**
   * Delete a secret
   */
  async deleteSecret(id: string): Promise<boolean> {
    const deleted = await this.databaseService.deleteSecret(id);

    if (deleted) {
      this.logger.log(`🗑️ Deleted secret: ${id}`);
    }

    return deleted;
  }

  /**
   * Get a secret by its name (not ID)
   */
  async getSecretByName(name: string): Promise<SecretListItem | null> {
    const entity = await this.databaseService.getSecretByName(name);
    if (!entity) return null;

    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      maskedValue: '********',
    };
  }

  /**
   * Link a secret to a workflow (placeholder for future implementation)
   * In DB-based implementation, this is managed through variables with secretId FK
   */
  async linkToWorkflow(secretId: string, workflowId: string): Promise<void> {
    // Validate secret exists
    const secret = await this.databaseService.getSecretById(secretId);
    if (!secret) {
      throw new Error(`Secret ${secretId} not found`);
    }
    // Note: Actual linking is done through VariableEntity with secretId FK
    this.logger.debug(
      `Link secret ${secret.name} to workflow ${workflowId} (via variable)`,
    );
  }

  /**
   * Unlink a secret from a workflow (placeholder for future implementation)
   * In DB-based implementation, this is managed through variables with secretId FK
   */
  async unlinkFromWorkflow(
    secretId: string,
    workflowId: string,
  ): Promise<void> {
    // Note: Actual unlinking is done by removing/updating VariableEntity with secretId FK
    this.logger.debug(
      `Unlink secret from workflow ${workflowId} (via variable)`,
    );
  }

  /**
   * Resolve workflow variables with secret values
   */
  async resolveVariables(
    variables: Record<string, string | number | boolean>,
    variableDefinitions: Array<{ name: string; secretRef?: string }>,
  ): Promise<Record<string, string | number | boolean>> {
    const resolved = { ...variables };

    for (const def of variableDefinitions) {
      // If variable is not provided but has a secret reference, use the secret
      if (resolved[def.name] === undefined && def.secretRef) {
        const secretValue = await this.getSecretValue(def.secretRef);
        if (secretValue !== null) {
          resolved[def.name] = secretValue;
        }
      }
    }

    return resolved;
  }
}
