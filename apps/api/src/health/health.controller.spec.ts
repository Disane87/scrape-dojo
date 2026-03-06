import { vi } from 'vitest';

// Mock fs before importing anything that uses it
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue('{}'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import * as fs from 'fs';

const mockedExistsSync = vi.mocked(fs.existsSync);
const mockedReadFileSync = vi.mocked(fs.readFileSync);

describe('HealthController', () => {
  let controller: HealthController;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(async () => {
    // Save and clean SCRAPE_DOJO_ env vars
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('SCRAPE_DOJO_')) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
      }
    }

    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    // Restore saved env vars
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('SCRAPE_DOJO_')) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value !== undefined) {
        process.env[key] = value;
      }
    }
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health status with all expected fields', () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(JSON.stringify({ version: '1.2.3' }));

      const result = controller.check();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.version).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(result.environment.nodeVersion).toBe(process.version);
      expect(result.environment.platform).toBe(process.platform);
      expect(result.environment.arch).toBe(process.arch);
      expect(result.environment.variables).toBeDefined();
      expect(result.memory).toBeDefined();
      expect(result.memory.heapUsed).toBeGreaterThan(0);
      expect(result.memory.heapTotal).toBeGreaterThan(0);
      expect(result.memory.rss).toBeGreaterThan(0);
      expect(result.services).toEqual({ api: 'online', sse: 'available' });
    });

    it('should show non-sensitive SCRAPE_DOJO_ env vars', () => {
      process.env.SCRAPE_DOJO_PORT = '3000';
      process.env.SCRAPE_DOJO_NODE_ENV = 'test';

      mockedExistsSync.mockReturnValue(false);

      const result = controller.check();

      expect(result.environment.variables).toBeDefined();
      expect(result.environment.variables!['SCRAPE_DOJO_PORT']).toBe('3000');
    });

    it('should hide sensitive SCRAPE_DOJO_ env vars (encryption key, secrets, tokens, passwords)', () => {
      process.env.SCRAPE_DOJO_PORT = '3000';
      process.env.SCRAPE_DOJO_ENCRYPTION_KEY = 'super-secret-key';
      process.env.SCRAPE_DOJO_AUTH_JWT_SECRET = 'jwt-secret';
      process.env.SCRAPE_DOJO_AUTH_TOKEN_SOMETHING = 'token-val';
      process.env.SCRAPE_DOJO_PASSWORD_SALT = 'salt-val';
      process.env.SCRAPE_DOJO_SESSION_KEY = 'session-val';

      mockedExistsSync.mockReturnValue(false);

      const result = controller.check();
      const vars = result.environment.variables!;

      // Non-sensitive should be visible
      expect(vars['SCRAPE_DOJO_PORT']).toBe('3000');

      // Sensitive should be filtered out
      expect(vars['SCRAPE_DOJO_ENCRYPTION_KEY']).toBeUndefined();
      expect(vars['SCRAPE_DOJO_AUTH_JWT_SECRET']).toBeUndefined();
      expect(vars['SCRAPE_DOJO_AUTH_TOKEN_SOMETHING']).toBeUndefined();
      expect(vars['SCRAPE_DOJO_PASSWORD_SALT']).toBeUndefined();
      expect(vars['SCRAPE_DOJO_SESSION_KEY']).toBeUndefined();
    });

    it('should mask credentials in URL-type env vars', () => {
      process.env.SCRAPE_DOJO_DB_URL =
        'postgres://admin:secretpass@db.example.com:5432/mydb';

      mockedExistsSync.mockReturnValue(false);

      const result = controller.check();
      const vars = result.environment.variables!;

      expect(vars['SCRAPE_DOJO_DB_URL']).toBe(
        'postgres://***:***@db.example.com:5432/mydb',
      );
    });

    it('should not include non-SCRAPE_DOJO_ env vars', () => {
      process.env.HOME = '/home/user';
      process.env.PATH = '/usr/bin';

      mockedExistsSync.mockReturnValue(false);

      const result = controller.check();
      const vars = result.environment.variables!;

      expect(vars['HOME']).toBeUndefined();
      expect(vars['PATH']).toBeUndefined();
    });

    it('should skip empty SCRAPE_DOJO_ env vars', () => {
      process.env.SCRAPE_DOJO_EMPTY = '';

      mockedExistsSync.mockReturnValue(false);

      const result = controller.check();
      const vars = result.environment.variables!;

      expect(vars['SCRAPE_DOJO_EMPTY']).toBeUndefined();
    });

    it('should detect Docker environment', () => {
      process.env.SCRAPE_DOJO_DOCKER_ENV = 'true';

      mockedExistsSync.mockReturnValue(false);

      const result = controller.check();

      expect(result.environment.isDocker).toBe(true);
    });

    it('should default isDocker to false when env var not set', () => {
      mockedExistsSync.mockReturnValue(false);

      const result = controller.check();

      expect(result.environment.isDocker).toBe(false);
    });

    it('should default nodeEnv to development', () => {
      mockedExistsSync.mockReturnValue(false);

      const result = controller.check();

      expect(result.environment.nodeEnv).toBe('development');
    });

    it('should use SCRAPE_DOJO_NODE_ENV when set', () => {
      process.env.SCRAPE_DOJO_NODE_ENV = 'production';

      mockedExistsSync.mockReturnValue(false);

      const result = controller.check();

      expect(result.environment.nodeEnv).toBe('production');
    });
  });

  describe('getVersion (tested through check)', () => {
    it('should read version from package.json', () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(JSON.stringify({ version: '2.5.0' }));

      const result = controller.check();

      expect(result.version).toBe('2.5.0');
    });

    it('should return unknown when package.json has no version', () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue(JSON.stringify({}));

      const result = controller.check();

      expect(result.version).toBe('unknown');
    });

    it('should fall back to dist/package.json when main does not exist', () => {
      mockedExistsSync.mockImplementation((p: any) => {
        const pathStr = String(p);
        if (pathStr.includes('dist')) return true;
        return false;
      });
      mockedReadFileSync.mockReturnValue(JSON.stringify({ version: '3.0.0' }));

      const result = controller.check();

      expect(result.version).toBe('3.0.0');
    });

    it('should return unknown when no package.json exists', () => {
      mockedExistsSync.mockReturnValue(false);

      const result = controller.check();

      expect(result.version).toBe('unknown');
    });

    it('should return unknown when fs throws an error', () => {
      mockedExistsSync.mockImplementation(() => {
        throw new Error('fs error');
      });

      const result = controller.check();

      expect(result.version).toBe('unknown');
    });

    it('should return unknown when readFileSync returns invalid JSON', () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFileSync.mockReturnValue('not-json');

      const result = controller.check();

      expect(result.version).toBe('unknown');
    });
  });

  describe('liveness', () => {
    it('should return liveness status', () => {
      const result = controller.liveness();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
    });
  });

  describe('readiness', () => {
    it('should return readiness status', () => {
      const result = controller.readiness();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
    });
  });
});
