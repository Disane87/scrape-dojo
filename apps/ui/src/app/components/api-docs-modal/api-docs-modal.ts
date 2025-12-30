import { Component, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../shared';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
    selector: 'app-api-docs-modal',
    standalone: true,
    imports: [CommonModule, ModalComponent, TranslocoModule],
    templateUrl: './api-docs-modal.html',
})
export class ApiDocsModalComponent {
    isOpen = model.required<boolean>();

    close(): void {
        this.isOpen.set(false);
    }
}
