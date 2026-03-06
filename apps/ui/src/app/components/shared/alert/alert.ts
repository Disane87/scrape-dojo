import {
  Component,
  computed,
  input,
  output,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconButtonComponent } from '../icon-button/icon-button';
import 'iconify-icon';

export type AlertVariant = 'error' | 'warning' | 'success' | 'info';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule, IconButtonComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './alert.html',
})
export class AlertComponent {
  /** Alert variant */
  variant = input<AlertVariant>('error');

  /** Optional title */
  title = input<string>();

  /** Whether the alert can be dismissed */
  dismissible = input<boolean>(false);

  /** Emitted when dismiss button is clicked */
  dismissed = output<void>();

  alertClasses = computed(() => {
    const base = 'flex items-start gap-3 p-4 rounded-md border';

    const variants: Record<AlertVariant, string> = {
      error: 'bg-dojo-danger/10 border-dojo-danger text-dojo-danger',
      warning: 'bg-dojo-warning/10 border-dojo-warning text-dojo-warning',
      success: 'bg-dojo-success/10 border-dojo-success text-dojo-success',
      info: 'bg-blue-500/10 border-blue-500 text-blue-400',
    };

    return `${base} ${variants[this.variant()]}`;
  });

  iconName = computed(() => {
    const icons: Record<AlertVariant, string> = {
      error: 'alert-triangle',
      warning: 'alert-triangle',
      success: 'check-circle',
      info: 'info',
    };
    return `lucide:${icons[this.variant()]}`;
  });
}
