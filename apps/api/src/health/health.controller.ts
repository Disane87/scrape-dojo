import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import * as fs from 'fs';
import * as path from 'path';

// Version aus package.json lesen
function getVersion(): string {
    try {
        const packagePath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(packagePath)) {
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
            return pkg.version || 'unknown';
        }
        // Fallback: dist-Verzeichnis prüfen
        const distPackagePath = path.join(process.cwd(), 'dist', 'package.json');
        if (fs.existsSync(distPackagePath)) {
            const pkg = JSON.parse(fs.readFileSync(distPackagePath, 'utf-8'));
            return pkg.version || 'unknown';
        }
    } catch {
        // Ignore
    }
    return 'unknown';
}

export interface HealthStatus {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    uptime: number;
    version: string;
    environment: {
        nodeVersion: string;
        platform: string;
        arch: string;
        isDocker: boolean;
        nodeEnv: string;
        variables?: Record<string, string>;
    };
    memory: {
        heapUsed: number;
        heapTotal: number;
        rss: number;
    };
    services: {
        api: 'online' | 'offline';
        sse: 'available' | 'unavailable';
    };
}

/**
 * Health Check Controller für Docker/Kubernetes
 * Bietet Endpoints zur Überprüfung der Anwendungsverfügbarkeit und Status-Infos.
 */
@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
    private readonly logger = new Logger(HealthController.name);

    /**
     * Filtert sensible Environment-Variablen aus
     * Nur SCRAPE_DOJO_* Variablen werden ausgegeben, zusätzlich Blacklist-geprüft
     */
    private filterSensitiveEnvVars(): Record<string, string> {
        const ENV_PREFIX = 'SCRAPE_DOJO_';

        // Blacklist: Schlüsselwörter die auf sensible Daten hinweisen
        const sensitivePatterns = [
            /password/i,
            /secret/i,
            /key/i,
            /token/i,
            /auth/i,
            /credential/i,
            /private/i,
            /api[_-]?key/i,
            /encryption/i,
            /salt/i,
            /hash/i,
            /jwt/i,
            /session/i,
        ];

        const envVariables: Record<string, string> = {};

        // Nur SCRAPE_DOJO_* Variablen durchgehen
        for (const [key, value] of Object.entries(process.env)) {
            // Nur Variablen mit dem definierten Präfix
            if (!key.startsWith(ENV_PREFIX)) continue;

            // Überspringen wenn leer
            if (!value) continue;

            // Prüfen ob Key ein sensibles Pattern enthält
            const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));

            if (!isSensitive) {
                // URL-Werte auf Credentials prüfen (user:pass@host Pattern)
                if ((key.includes('_URL') || key.includes('_URI') || key.includes('_HOST')) &&
                    value.includes('@') && value.includes(':')) {
                    // Maskiere Credentials in URL
                    envVariables[key] = value.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
                } else {
                    // Sichere Variable - unverändert hinzufügen
                    envVariables[key] = value;
                }
            }
        }

        return envVariables;
    }

    @Get()
    check(): HealthStatus {
        const memoryUsage = process.memoryUsage();

        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: getVersion(),
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                isDocker: process.env.SCRAPE_DOJO_DOCKER_ENV === 'true',
                nodeEnv: process.env.SCRAPE_DOJO_NODE_ENV || 'development',
                variables: this.filterSensitiveEnvVars(),
            },
            memory: {
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
                rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            },
            services: {
                api: 'online',
                sse: 'available',
            },
        };
    }

    @Get('live')
    liveness() {
        return { status: 'ok' };
    }

    @Get('ready')
    readiness() {
        return { status: 'ok' };
    }
}
