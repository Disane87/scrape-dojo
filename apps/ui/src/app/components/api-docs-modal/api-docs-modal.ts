import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ModalComponent } from '../shared';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
    selector: 'app-api-docs-modal',
    standalone: true,
    imports: [CommonModule, ModalComponent, TranslocoModule],
    templateUrl: './api-docs-modal.html',
})
export class ApiDocsModalComponent implements OnInit {
    private router = inject(Router);
    isOpen = signal(true); // Always true for auxiliary route

    ngOnInit(): void {
        // Component loaded via auxiliary route
    }

    close(): void {
        this.router.navigate([{ outlets: { modal: null } }]);
    }
}
