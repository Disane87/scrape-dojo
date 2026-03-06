import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VariableEntity } from '../database/entities/variable.entity';
import { DatabaseService } from '../database/database.service';
import { SecretsService } from '../secrets/secrets.service';

export type VariableScope = 'global' | 'workflow';

export interface Variable {
  id: string;
  name: string;
  value: string;
  description?: string;
  scope: VariableScope;
  workflowId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VariableListItem {
  id: string;
  name: string;
  value: string;
  description?: string;
  scope: VariableScope;
  workflowId?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Service für persistente Variablen (global & workflow-spezifisch)
 * Speichert in Datenbank statt Datei
 *
 * Auto-Sync:
 * - SCRAPE_DOJO_VAR_* ENV-Variablen werden automatisch als globale Variablen gespeichert
 * - SCRAPE_DOJO_SECRET_* ENV-Variablen werden automatisch als verschlüsselte Secrets gespeichert
 */
@Injectable()
export class VariablesService implements OnModuleInit {
  private readonly logger = new Logger(VariablesService.name);

  constructor(
    @InjectRepository(VariableEntity)
    private variableRepository: Repository<VariableEntity>,
    private databaseService: DatabaseService,
    private secretsService: SecretsService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.syncEnvVariables();
  }

  /**
   * Synchronisiert ENV-Variablen mit der Datenbank
   * - SCRAPE_DOJO_VAR_* -> globale Variablen
   * - SCRAPE_DOJO_SECRET_* -> verschlüsselte Secrets
   */
  private async syncEnvVariables() {
    const envVars = process.env;
    const varPrefix = 'SCRAPE_DOJO_VAR_';
    const secretPrefix = 'SCRAPE_DOJO_SECRET_';

    this.logger.log(
      '🔍 Scanning environment for SCRAPE_DOJO_VAR_* and SCRAPE_DOJO_SECRET_* variables...',
    );

    // Sammle alle gefundenen ENV-Variablen
    const foundVars: string[] = [];
    const foundSecrets: string[] = [];

    // Sync SCRAPE_DOJO_VAR_* als globale Variablen
    for (const [key, value] of Object.entries(envVars)) {
      if (key.startsWith(varPrefix) && value) {
        foundVars.push(key);
        const varName = this.convertEnvNameToVarName(
          key.substring(varPrefix.length),
        );
        await this.syncEnvVariable(varName, value, key);
      }
    }

    // Sync SCRAPE_DOJO_SECRET_* als Secrets
    for (const [key, value] of Object.entries(envVars)) {
      if (key.startsWith(secretPrefix) && value) {
        foundSecrets.push(key);
        const secretName = this.convertEnvNameToVarName(
          key.substring(secretPrefix.length),
        );
        await this.syncEnvSecret(secretName, value, key);
      }
    }

    // Zusammenfassung loggen
    if (foundVars.length > 0) {
      this.logger.log(
        `📋 Found ${foundVars.length} SCRAPE_DOJO_VAR_* variable(s): ${foundVars.join(', ')}`,
      );
    } else {
      this.logger.log('📋 No SCRAPE_DOJO_VAR_* variables found in environment');
    }

    if (foundSecrets.length > 0) {
      this.logger.log(
        `🔐 Found ${foundSecrets.length} SCRAPE_DOJO_SECRET_* variable(s): ${foundSecrets.join(', ')}`,
      );
    } else {
      this.logger.log(
        '🔐 No SCRAPE_DOJO_SECRET_* variables found in environment',
      );
    }
  }

  /**
   * Konvertiert ENV_NAME zu envName (camelCase)
   */
  private convertEnvNameToVarName(envName: string): string {
    return envName
      .toLowerCase()
      .split('_')
      .map((part, idx) =>
        idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
      )
      .join('');
  }

  /**
   * Synchronisiert eine einzelne ENV-Variable als globale Variable
   */
  private async syncEnvVariable(name: string, value: string, envKey: string) {
    try {
      const existing = await this.variableRepository.findOne({
        where: { name, scope: 'global' },
      });

      if (!existing) {
        await this.create({
          name,
          value,
          description: `Auto-synced from ENV: ${envKey}`,
          scope: 'global',
        });
        this.logger.log(`✅ Synced ENV variable: ${name} = ${value}`);
      } else if (existing.value !== value) {
        await this.update(existing.id, { value });
        this.logger.log(`🔄 Updated ENV variable: ${name} = ${value}`);
      } else {
        this.logger.debug(`✓ ENV variable up-to-date: ${name}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync ENV variable ${name}: ${error.message}`,
      );
    }
  }

  /**
   * Synchronisiert eine einzelne ENV-Secret als verschlüsseltes Secret
   */
  private async syncEnvSecret(name: string, value: string, envKey: string) {
    try {
      // Prüfe ob Secret schon existiert
      const existingSecret = await this.secretsService.getSecret(name);

      if (!existingSecret) {
        await this.secretsService.createSecret(
          name,
          value,
          `Auto-synced from ENV: ${envKey}`,
        );
        this.logger.log(`✅ Synced ENV secret: ${name}`);
      } else {
        // Secrets nicht automatisch überschreiben (könnten vom User geändert worden sein)
        this.logger.debug(`✓ ENV secret already exists: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to sync ENV secret ${name}: ${error.message}`);
    }
  }

  /**
   * Alle Variablen abrufen (optional gefiltert nach Scope/Workflow)
   */
  async getAll(
    scope?: VariableScope,
    workflowId?: string,
  ): Promise<VariableListItem[]> {
    const query = this.variableRepository.createQueryBuilder('variable');

    if (scope) {
      query.andWhere('variable.scope = :scope', { scope });
    }

    if (workflowId) {
      query.andWhere('variable.workflowId = :workflowId', { workflowId });
    }

    const variables = await query.getMany();
    return variables.map((v) => this.toListItem(v));
  }

  /**
   * Globale Variablen abrufen
   */
  async getGlobal(): Promise<VariableListItem[]> {
    return this.getAll('global');
  }

  /**
   * Workflow-spezifische Variablen abrufen
   */
  async getByWorkflow(workflowId: string): Promise<VariableListItem[]> {
    return this.getAll('workflow', workflowId);
  }

  /**
   * Variable nach ID abrufen
   */
  async getById(id: string): Promise<Variable | undefined> {
    const variable = await this.variableRepository.findOne({ where: { id } });
    return variable ? this.toVariable(variable) : undefined;
  }

  /**
   * Variable nach Name abrufen (für Template-Rendering)
   */
  async getByName(
    name: string,
    workflowId?: string,
  ): Promise<Variable | undefined> {
    // Erst workflow-spezifisch suchen, dann global
    if (workflowId) {
      const workflowVar = await this.variableRepository.findOne({
        where: { name, scope: 'workflow', workflowId },
      });
      if (workflowVar) return this.toVariable(workflowVar);
    }

    // Fallback auf global
    const globalVar = await this.variableRepository.findOne({
      where: { name, scope: 'global' },
    });
    return globalVar ? this.toVariable(globalVar) : undefined;
  }

  /**
   * Variable nach Name und Workflow abrufen (für Sync-Check)
   */
  async getByNameAndWorkflow(
    name: string,
    workflowId: string,
  ): Promise<Variable | undefined> {
    const variable = await this.variableRepository.findOne({
      where: { name, scope: 'workflow', workflowId },
    });
    return variable ? this.toVariable(variable) : undefined;
  }

  /**
   * Variable erstellen
   */
  async create(data: {
    name: string;
    value: string;
    description?: string;
    scope: VariableScope;
    workflowId?: string;
    isSecret?: boolean;
    secretId?: string;
  }): Promise<Variable> {
    // Prüfe ob Name bereits existiert (im gleichen Scope/Workflow)
    const query = this.variableRepository
      .createQueryBuilder('variable')
      .where('variable.name = :name', { name: data.name });

    if (data.scope === 'global') {
      query.andWhere('variable.scope = :scope', { scope: 'global' });
    } else {
      query.andWhere(
        'variable.scope = :scope AND variable.workflowId = :workflowId',
        {
          scope: 'workflow',
          workflowId: data.workflowId,
        },
      );
    }

    const existing = await query.getOne();
    if (existing) {
      throw new Error(`Variable "${data.name}" already exists in this scope`);
    }

    const variable = this.variableRepository.create({
      id: this.generateId(),
      name: data.name,
      value: data.value,
      description: data.description,
      scope: data.scope,
      workflowId: data.workflowId,
      isSecret: data.isSecret ?? false,
      secretId: data.secretId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const saved = await this.variableRepository.save(variable);
    this.logger.log(`✅ Created ${data.scope} variable: ${data.name}`);
    return this.toVariable(saved);
  }

  /**
   * Variable aktualisieren
   */
  async update(
    id: string,
    updates: { value?: string; description?: string },
  ): Promise<Variable> {
    const variable = await this.variableRepository.findOne({ where: { id } });
    if (!variable) {
      throw new Error('Variable not found');
    }

    if (updates.value !== undefined) variable.value = updates.value;
    if (updates.description !== undefined)
      variable.description = updates.description;
    variable.updatedAt = Date.now();

    const saved = await this.variableRepository.save(variable);
    this.logger.log(`🔄 Updated variable: ${variable.name}`);
    return this.toVariable(saved);
  }

  /**
   * Variable löschen
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.variableRepository.delete(id);

    if (result.affected && result.affected > 0) {
      this.logger.log(`🗑️ Deleted variable: ${id}`);
      return true;
    }

    return false;
  }

  /**
   * Alle Variablen als Key-Value Map für Template-Rendering
   */
  async getAsMap(workflowId?: string): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    // Hilfsfunktion zum Secret-Value-Laden (entschlüsselt)
    const getSecretValue = async (secretId?: string): Promise<string> => {
      if (!secretId) return '';
      const value = await this.secretsService.getSecretValue(secretId);
      return value ?? '';
    };

    // Erst globale Variablen
    const globalVars = await this.variableRepository.find({
      where: { scope: 'global' },
    });
    for (const v of globalVars) {
      this.logger.debug(
        `🔍 Global var: ${v.name}, isSecret=${v.isSecret}, secretId=${v.secretId}`,
      );
      if (v.isSecret && v.secretId) {
        const secretValue = await getSecretValue(v.secretId);
        this.logger.debug(
          `🔐 Loaded secret value for ${v.name}: ${secretValue ? '***' : '(empty)'}`,
        );
        map[v.name] = secretValue;
      } else {
        map[v.name] = v.value;
      }
    }

    // Dann workflow-spezifische (überschreiben globale)
    if (workflowId) {
      const workflowVars = await this.variableRepository.find({
        where: { scope: 'workflow', workflowId },
      });
      for (const v of workflowVars) {
        this.logger.debug(
          `🔍 Workflow var: ${v.name}, isSecret=${v.isSecret}, secretId=${v.secretId}`,
        );
        if (v.isSecret && v.secretId) {
          const secretValue = await getSecretValue(v.secretId);
          this.logger.debug(
            `🔐 Loaded secret value for ${v.name}: ${secretValue ? '***' : '(empty)'}`,
          );
          map[v.name] = secretValue;
        } else {
          map[v.name] = v.value;
        }
      }
    }

    this.logger.debug(
      `📦 Final variable map: ${JSON.stringify(Object.keys(map))}`,
    );
    return map;
  }

  /**
   * Entity zu Variable konvertieren
   */
  private toVariable(entity: VariableEntity): Variable {
    return {
      id: entity.id,
      name: entity.name,
      value: entity.value,
      description: entity.description,
      scope: entity.scope,
      workflowId: entity.workflowId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Variable zu ListItem konvertieren
   */
  private toListItem(variable: VariableEntity): VariableListItem {
    return {
      id: variable.id,
      name: variable.name,
      value: variable.value,
      description: variable.description,
      scope: variable.scope,
      workflowId: variable.workflowId,
      createdAt: variable.createdAt,
      updatedAt: variable.updatedAt,
    };
  }

  /**
   * ID generieren
   */
  private generateId(): string {
    return `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
