import { Component, computed, input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toIconify } from '../../../utils/icon.utils';
import 'iconify-icon';

export type EmptyStateSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './empty-state.html',
})
export class EmptyStateComponent {
  protected readonly toIconify = toIconify;

  /** Lucide icon name */
  icon = input.required<string>();

  /** Title text */
  title = input.required<string>();

  /** Description text */
  description = input<string>();

  /** Size variant */
  size = input<EmptyStateSize>('md');

  /** Show dashed border */
  bordered = input<boolean>(false);

  containerClasses = computed(() => {
    const base = 'flex flex-col items-center justify-center text-center';

    const sizes: Record<EmptyStateSize, string> = {
      sm: 'py-8 px-4',
      md: 'py-12 px-4',
      lg: 'py-16 px-6',
    };

    const border = this.bordered() ? 'border border-dashed border-dojo-border rounded-lg' : '';

    return `${base} ${sizes[this.size()]} ${border}`;
  });

  iconClasses = computed(() => {
    const sizes: Record<EmptyStateSize, string> = {
      sm: 'mb-3',
      md: 'mb-4',
      lg: 'mb-8',
    };

    return `text-dojo-text-muted flex-shrink-0 ${sizes[this.size()]}`;
  });

  titleClasses = computed(() => {
    const sizes: Record<EmptyStateSize, string> = {
      sm: 'text-base font-medium mb-1',
      md: 'text-lg font-medium mb-2',
      lg: 'text-2xl font-semibold mb-2',
    };

    return `text-dojo-text ${sizes[this.size()]}`;
  });
}
