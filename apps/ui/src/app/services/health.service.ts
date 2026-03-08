import { Injectable, inject, computed } from '@angular/core';
import { ApiService } from './api.service';
import { interval, switchMap, catchError, of, startWith, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ScrapeEventsService } from './scrape-events.service';
import { environment } from '../../environments/environment';

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

export interface SystemStatus {
  api: {
    online: boolean;
    health?: HealthStatus;
    lastChecked: Date;
    error?: string;
  };
  sse: {
    connected: boolean;
  };
  frontend: {
    version: string;
    buildTime?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class HealthService {
  private api = inject(ApiService);
  private eventsService = inject(ScrapeEventsService);

  // Frontend version aus environment (wird durch pnpm update:version gesetzt)
  private readonly frontendVersion = environment.version;

  // Polling-Intervall in Millisekunden (10 Sekunden)
  private readonly healthCheckInterval = 10000;

  // API Health Status mit Polling + stabilem Timestamp je Emission
  private healthCheck$ = interval(this.healthCheckInterval).pipe(
    startWith(0),
    switchMap(() =>
      this.api
        .get<HealthStatus>('health')
        .pipe(
          catchError((err) =>
            of({ error: err.message } as unknown as HealthStatus),
          ),
        ),
    ),
    map((health) => ({ health, checkedAt: new Date() })),
  );

  private healthSignal = toSignal(this.healthCheck$, {
    initialValue: {
      health: null as HealthStatus | null,
      checkedAt: new Date(0),
    },
  });

  // Computed System Status
  systemStatus = computed<SystemStatus>(() => {
    const result = this.healthSignal();
    const health = result?.health;
    const hasError = !!health && 'error' in (health as any);

    return {
      api: {
        online: health !== null && !hasError,
        health: hasError ? undefined : (health ?? undefined),
        lastChecked: result?.checkedAt ?? new Date(0),
        error: hasError
          ? (health as unknown as { error: string }).error
          : undefined,
      },
      sse: {
        connected: this.eventsService.isConnected(),
      },
      frontend: {
        version: this.frontendVersion,
      },
    };
  });

  // API Online Status
  isApiOnline = computed(() => this.systemStatus().api.online);

  // API Offline Status (für UI-Sperre)
  isApiOffline = computed(() => !this.isApiOnline());

  // API Version
  apiVersion = computed(
    () => this.systemStatus().api.health?.version ?? 'unknown',
  );

  // Docker Status
  isDocker = computed(
    () => this.systemStatus().api.health?.environment.isDocker ?? false,
  );

  /**
   * Manuell Health Check triggern
   */
  async checkHealth(): Promise<HealthStatus | null> {
    try {
      const health = await this.api.get<HealthStatus>('health').toPromise();
      return health ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Formatiert Uptime in lesbares Format
   */
  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }
}
