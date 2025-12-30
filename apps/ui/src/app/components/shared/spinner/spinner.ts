import { Component, computed, input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import 'iconify-icon';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <iconify-icon
      icon="lucide:loader-2"
      [class]="spinnerClasses()"
    ></iconify-icon>
  `,
})
export class SpinnerComponent {
  /** Spinner size */
  size = input<SpinnerSize>('md');

  /** Additional CSS classes */
  class = input<string>('');

  spinnerClasses = computed(() => {
    const sizes: Record<SpinnerSize, string> = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-12 h-12',
    };

    return `animate-spin text-dojo-text-muted ${sizes[this.size()]} ${this.class()}`;
  });
}
