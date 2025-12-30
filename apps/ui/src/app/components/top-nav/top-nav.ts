import { Component, output, inject, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../shared/button/button';
import { TranslocoModule } from '@jsverse/transloco';
import { UserMenuComponent } from '../../auth/components/user-menu/user-menu.component';
import 'iconify-icon';

@Component({
    selector: 'app-top-nav',
    standalone: true,
    imports: [CommonModule, ButtonComponent, TranslocoModule, UserMenuComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './top-nav.html',
})
export class TopNavComponent implements OnInit {
    showApiDocs = output<void>();
    showSecrets = output<void>();
    showVariables = output<void>();
    showStatus = output<void>();
    showSettings = output<void>();

    ngOnInit(): void {
        // no-op
    }

    openApiDocs(): void {
        this.showApiDocs.emit();
    }

    openSecrets(): void {
        this.showSecrets.emit();
    }

    openVariables(): void {
        this.showVariables.emit();
    }

    openStatus(): void {
        this.showStatus.emit();
    }

    openSettings(): void {
        this.showSettings.emit();
    }

    toggleNotifications(): void {
        // moved into user menu
    }

    toggleTheme(): void {
        // moved into user menu
    }
}
