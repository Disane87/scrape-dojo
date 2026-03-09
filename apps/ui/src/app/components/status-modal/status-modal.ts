import {
  Component,
  inject,
  computed,
  signal,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ModalComponent } from '../shared';
import { HealthService } from '../../services/health.service';
import { TranslocoModule } from '@jsverse/transloco';
import 'iconify-icon';

export interface ChangelogEntry {
  version: string;
  date: string;
  url: string;
  sections: { type: string; items: string[] }[];
}

@Component({
  selector: 'app-status-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './status-modal.html',
})
export class StatusModalComponent implements OnInit {
  private healthService = inject(HealthService);
  private router = inject(Router);

  isOpen = signal(true); // Always true for auxiliary route
  showChangelog = signal(false);

  ngOnInit(): void {
    this.healthService.loadChangelog();
  }

  close(): void {
    this.router.navigate([{ outlets: { modal: null } }]);
  }

  // System Status
  systemStatus = this.healthService.systemStatus;

  // Computed values
  apiOnline = this.healthService.isApiOnline;
  apiVersion = this.healthService.apiVersion;
  isDocker = this.healthService.isDocker;

  // Uptime formatiert
  formattedUptime = computed(() => {
    const uptime = this.systemStatus().api.health?.uptime;
    return uptime ? this.healthService.formatUptime(uptime) : '-';
  });

  // Memory Usage
  memoryUsage = computed(() => {
    const memory = this.systemStatus().api.health?.memory;
    if (!memory) return null;
    return {
      used: memory.heapUsed,
      total: memory.heapTotal,
      percentage: Math.round((memory.heapUsed / memory.heapTotal) * 100),
    };
  });

  // Environment Variables als Array von [key, value] für Template
  envEntries = computed(() => {
    const variables = this.systemStatus().api.health?.environment.variables;
    if (!variables) return [];
    return Object.entries(variables).sort((a, b) => a[0].localeCompare(b[0]));
  });

  // Parsed changelog entries
  changelogEntries = computed<ChangelogEntry[]>(() => {
    const raw = this.healthService.changelog();
    if (!raw) return [];
    return this.parseChangelog(raw);
  });

  toggleChangelog(): void {
    this.showChangelog.update((v) => !v);
  }

  async refresh(): Promise<void> {
    await this.healthService.checkHealth();
  }

  private parseChangelog(md: string): ChangelogEntry[] {
    const entries: ChangelogEntry[] = [];
    const versionRegex =
      /^## \[(\d+\.\d+\.\d+)]\((https?:\/\/[^)]+)\)\s*\((\d{4}-\d{2}-\d{2})\)/;
    let current: ChangelogEntry | null = null;
    let currentSection = '';

    for (const line of md.split('\n')) {
      const versionMatch = line.match(versionRegex);
      if (versionMatch) {
        if (current) entries.push(current);
        current = {
          version: versionMatch[1],
          url: versionMatch[2],
          date: versionMatch[3],
          sections: [],
        };
        currentSection = '';
        continue;
      }

      if (!current) continue;

      const sectionMatch = line.match(/^### (.+)/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        current.sections.push({ type: currentSection, items: [] });
        continue;
      }

      if (line.startsWith('- ') && current.sections.length > 0) {
        const lastSection = current.sections[current.sections.length - 1];
        lastSection.items.push(line.substring(2).trim());
      }
    }
    if (current) entries.push(current);

    return entries;
  }
}
