import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
export class TopNavComponent {
  private router = inject(Router);

  openApiDocs(): void {
    this.router.navigate([{ outlets: { modal: ['api-docs'] } }]);
  }

  openSecrets(): void {
    this.router.navigate([{ outlets: { modal: ['secrets'] } }]);
  }

  openVariables(): void {
    this.router.navigate([{ outlets: { modal: ['variables-modal'] } }]);
  }

  openStatus(): void {
    this.router.navigate([{ outlets: { modal: ['status'] } }]);
  }

  openSettings(): void {
    this.router.navigate([{ outlets: { modal: ['settings-modal'] } }]);
  }
}
