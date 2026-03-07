import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  Run,
  RunStep,
  RunAction,
  RunLog,
  ScrapeData,
  ScrapeSchedule,
  VariableEntity,
  SecretEntity,
} from './entities';
import {
  UserEntity,
  TrustedDeviceEntity,
  ApiKeyEntity,
} from '../auth/entities';
import { DatabaseService } from './database.service';
import {
  RunRepository,
  StepRepository,
  ActionRepository,
  ScrapeDataRepository,
} from './repositories';
import * as path from 'path';
import * as fs from 'fs';

const entities = [
  Run,
  RunStep,
  RunAction,
  RunLog,
  ScrapeData,
  ScrapeSchedule,
  VariableEntity,
  SecretEntity,
  UserEntity,
  TrustedDeviceEntity,
  ApiKeyEntity,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<TypeOrmModuleOptions> => {
        const logger = new Logger('DatabaseModule');
        const dbType = configService.get<string>('DB_TYPE', 'sqlite');
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const synchronize =
          configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true';
        const logging =
          configService.get<string>('DB_LOGGING', 'false') === 'true';

        logger.log(`🗃️ Database type: ${dbType}`);

        if (synchronize && nodeEnv === 'production') {
          logger.warn(
            '⚠️ DB_SYNCHRONIZE is enabled in production. This auto-creates tables but may cause data loss on schema changes. Set DB_SYNCHRONIZE=false once your database is initialized.',
          );
        }

        logger.log('🚀 Running migrations (if any)...');

        if (dbType === 'sqlite') {
          const dbPath = configService.get<string>(
            'DB_DATABASE',
            './data/scrape-dojo.db',
          );
          const absolutePath = path.isAbsolute(dbPath)
            ? dbPath
            : path.join(process.cwd(), dbPath);

          // Stelle sicher, dass das Verzeichnis existiert
          const dbDir = path.dirname(absolutePath);
          if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            logger.log(`📁 Created database directory: ${dbDir}`);
          }

          logger.log(`📂 SQLite database path: ${absolutePath}`);

          // Lade bestehende Datenbank wenn vorhanden
          if (fs.existsSync(absolutePath)) {
            logger.log(`📂 Loading existing database from: ${absolutePath}`);
          }

          return {
            type: 'sqljs',
            location: absolutePath,
            autoSave: true,
            entities,
            synchronize,
            logging,
            migrations: ['src/database/migrations/*.ts'],
            migrationsRun: true,
          };
        }

        if (dbType === 'mysql') {
          const host = configService.get<string>('DB_HOST', 'localhost');
          const port = configService.get<number>('DB_PORT', 3306);
          const username = configService.get<string>('DB_USERNAME', 'root');
          const password = configService.get<string>('DB_PASSWORD', '');
          const database = configService.get<string>(
            'DB_DATABASE',
            'scrape_dojo',
          );

          logger.log(`🐬 MySQL database: ${host}:${port}/${database}`);

          return {
            type: 'mysql',
            host,
            port,
            username,
            password,
            database,
            entities,
            synchronize,
            logging,
            charset: 'utf8mb4',
            migrations: ['src/database/migrations/*.ts'],
            migrationsRun: true,
          };
        }

        if (dbType === 'postgres') {
          const host = configService.get<string>('DB_HOST', 'localhost');
          const port = configService.get<number>('DB_PORT', 5432);
          const username = configService.get<string>('DB_USERNAME', 'postgres');
          const password = configService.get<string>('DB_PASSWORD', '');
          const database = configService.get<string>(
            'DB_DATABASE',
            'scrape_dojo',
          );

          logger.log(`🐘 PostgreSQL database: ${host}:${port}/${database}`);

          return {
            type: 'postgres',
            host,
            port,
            username,
            password,
            database,
            entities,
            synchronize,
            logging,
            migrations: ['src/database/migrations/*.ts'],
            migrationsRun: true,
          };
        }

        // Default: SQLite (sql.js)
        logger.warn(`⚠️ Unknown DB_TYPE "${dbType}", falling back to SQLite`);
        const defaultDbPath = path.join(
          process.cwd(),
          'data',
          'scrape-dojo.db',
        );
        const defaultDbDir = path.dirname(defaultDbPath);
        if (!fs.existsSync(defaultDbDir)) {
          fs.mkdirSync(defaultDbDir, { recursive: true });
        }
        return {
          type: 'sqljs',
          location: defaultDbPath,
          autoSave: true,
          entities,
          synchronize,
          logging,
          migrations: ['src/database/migrations/*.ts'],
          migrationsRun: true,
        };
      },
    }),
    TypeOrmModule.forFeature(entities),
  ],
  providers: [
    DatabaseService,
    RunRepository,
    StepRepository,
    ActionRepository,
    ScrapeDataRepository,
  ],
  exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
