import { Component, model, inject, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../shared';
import { HealthService } from '../../services/health.service';
import { TranslocoModule } from '@jsverse/transloco';
import 'iconify-icon';

@Component({
    selector: 'app-status-modal',
    standalone: true,
    imports: [CommonModule, ModalComponent, TranslocoModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './status-modal.html',
})
export class StatusModalComponent {
    private healthService = inject(HealthService);

    isOpen = model.required<boolean>();

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

    close(): void {
        this.isOpen.set(false);
    }

    async refresh(): Promise<void> {
        await this.healthService.checkHealth();
    }
}
