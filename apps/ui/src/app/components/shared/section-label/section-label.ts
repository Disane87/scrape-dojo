import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SectionLabelSize = 'xs' | 'sm';

@Component({
  selector: 'app-section-label',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="labelClasses()">
      <ng-content />
    </span>
  `,
})
export class SectionLabelComponent {
  /** Label size */
  size = input<SectionLabelSize>('xs');

  /** Additional margin bottom */
  marginBottom = input<boolean>(true);

  labelClasses = computed(() => {
    const base = 'block font-medium text-dojo-text-muted uppercase tracking-wider';

    const sizes: Record<SectionLabelSize, string> = {
      xs: 'text-xs',
      sm: 'text-sm',
    };

    const margin = this.marginBottom() ? 'mb-2' : '';

    return `${base} ${sizes[this.size()]} ${margin}`;
  });
}
