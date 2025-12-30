import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { HealthService } from '../../services/health.service';

@Component({
    selector: 'app-api-offline-overlay',
    imports: [CommonModule, TranslocoModule],
    templateUrl: './api-offline-overlay.component.html',
    styleUrl: './api-offline-overlay.component.scss',
})
export class ApiOfflineOverlayComponent {
    private healthService = inject(HealthService);

    protected isOffline = this.healthService.isApiOffline;
    protected systemStatus = this.healthService.systemStatus;

    protected lastChecked = computed(() => {
        const status = this.systemStatus();
        return status.api.lastChecked;
    });

    protected errorMessage = computed(() => {
        const status = this.systemStatus();
        return status.api.error || 'API nicht erreichbar';
    });
}
