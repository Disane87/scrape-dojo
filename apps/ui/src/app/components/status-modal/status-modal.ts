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
import { LanguageService } from '../../services/language.service';
import { TranslocoModule } from '@jsverse/transloco';
import { environment } from '../../../environments/environment';
import 'iconify-icon';

@Component({
  selector: 'app-status-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './status-modal.html',
})
export class StatusModalComponent implements OnInit {
  private healthService = inject(HealthService);
  private languageService = inject(LanguageService);
  private router = inject(Router);

  isOpen = signal(true); // Always true for auxiliary route

  ngOnInit(): void {
    // Component loaded via auxiliary route
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

  uiVersion = environment.version;
  gitCommit = environment.gitCommit;

  docsUrl(): string {
    const lang = this.languageService.getLanguage();
    return `https://scrape-dojo.com/${lang}/user-guide/`;
  }

  async refresh(): Promise<void> {
    await this.healthService.checkHealth();
  }
}
