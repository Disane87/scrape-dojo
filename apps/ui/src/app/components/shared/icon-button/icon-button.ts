import {
  Component,
  computed,
  input,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toIconify } from '../../../utils/icon.utils';
import 'iconify-icon';

export type IconButtonVariant = 'default' | 'danger' | 'success' | 'ghost';
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-icon-button',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './icon-button.html',
})
export class IconButtonComponent {
  protected readonly toIconify = toIconify;

  /** Lucide icon name */
  icon = input.required<string>();

  /** Button variant */
  variant = input<IconButtonVariant>('default');

  /** Button size */
  size = input<IconButtonSize>('md');

  /** Tooltip/title */
  title = input<string>();

  /** Disabled state */
  disabled = input<boolean>(false);

  /** Loading state */
  loading = input<boolean>(false);

  buttonClasses = computed(() => {
    const base =
      'inline-flex items-center justify-center rounded-md transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

    const variants: Record<IconButtonVariant, string> = {
      default:
        'text-dojo-text-muted hover:text-dojo-text hover:bg-dojo-surface-2',
      danger:
        'text-dojo-text-muted hover:text-dojo-danger hover:bg-dojo-danger/10',
      success:
        'text-dojo-text-muted hover:text-dojo-success hover:bg-dojo-success/10',
      ghost: 'text-dojo-text-muted hover:text-dojo-text',
    };

    const sizes: Record<IconButtonSize, string> = {
      xs: 'p-1',
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-2.5',
    };

    return `${base} ${variants[this.variant()]} ${sizes[this.size()]}`;
  });

  iconSizeClass = computed(() => {
    const sizes: Record<IconButtonSize, string> = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };
    return sizes[this.size()];
  });
}
