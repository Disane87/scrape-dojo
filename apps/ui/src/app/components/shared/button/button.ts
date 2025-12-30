import { Component, computed, input, output, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toIconify } from '../../../utils/icon.utils';
import 'iconify-icon';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success' | 'warning';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './button.html',
})
export class ButtonComponent {
  protected readonly toIconify = toIconify;

  /** Button variant */
  variant = input<ButtonVariant>('outline');

  /** Button size */
  size = input<ButtonSize>('md');

  /** Icon name (Lucide or Iconify format like 'lucide:icon-name') to show before content */
  icon = input<string>();

  /** Icon name (Lucide or Iconify) to show after content */
  iconRight = input<string>();

  /** Icon-only mode (square button with just icon) */
  iconOnly = input<boolean>(false);

  /** Tooltip/title for the button */
  title = input<string>('');

  /** Loading state - shows spinner and disables button */
  loading = input<boolean>(false);

  /** Disabled state */
  disabled = input<boolean>(false);

  /** Active/pressed state */
  active = input<boolean>(false);

  /** Full width button */
  fullWidth = input<boolean>(false);

  /** Button type */
  type = input<'button' | 'submit' | 'reset'>('button');

  /** Click event emitter */
  clicked = output<MouseEvent>();

  /** Check if icon is Iconify format (contains ':') */
  isIconify = computed(() => this.icon()?.includes(':') ?? false);
  isIconifyRight = computed(() => this.iconRight()?.includes(':') ?? false);

  buttonClasses = computed(() => {
    const base = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-dojo-orange/50 focus:ring-offset-1 focus:ring-offset-dojo-bg disabled:opacity-50 disabled:cursor-not-allowed';

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-gradient-to-r from-dojo-orange to-amber-600 text-white border border-transparent hover:opacity-90 focus:ring-dojo-orange',
      success: 'bg-dojo-success-strong hover:bg-dojo-success-strong/90 text-white border border-dojo-success-strong focus:ring-dojo-success-strong',
      secondary: 'bg-dojo-surface-2 hover:bg-dojo-border text-dojo-text border border-dojo-border focus:ring-dojo-accent',
      danger: 'bg-dojo-red-strong hover:bg-dojo-danger-strong text-white border border-dojo-red-strong focus:ring-dojo-danger',
      warning: 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-500 focus:ring-amber-500',
      ghost: 'bg-transparent hover:bg-dojo-surface-2 text-dojo-text-muted hover:text-dojo-text border border-transparent',
      outline: 'bg-dojo-surface-2 hover:bg-dojo-border text-dojo-text border border-dojo-border hover:border-dojo-text-muted focus:ring-dojo-accent',
    };

    // Active state overrides
    const activeVariants: Record<ButtonVariant, string> = {
      primary: 'bg-dojo-orange/20 text-dojo-orange border border-dojo-orange/50',
      success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50',
      secondary: 'bg-dojo-surface-2 text-dojo-text border border-dojo-text-muted',
      danger: 'bg-rose-500/20 text-rose-400 border border-rose-500/50',
      warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/50',
      ghost: 'bg-dojo-surface-2 text-dojo-text border border-transparent',
      outline: 'bg-dojo-surface-2 text-dojo-text border border-dojo-text-muted',
    };

    const isIconOnly = this.iconOnly();

    // Fixed height sizes with consistent padding
    const sizes: Record<ButtonSize, string> = {
      xs: isIconOnly ? 'h-6 w-6 text-xs' : 'h-6 px-2 text-xs gap-1',
      sm: isIconOnly ? 'h-7 w-7 text-sm' : 'h-7 px-2.5 text-sm gap-1.5',
      md: isIconOnly ? 'h-8 w-8 text-sm' : 'h-8 px-3 text-sm gap-2',
      lg: isIconOnly ? 'h-10 w-10 text-base' : 'h-10 px-4 text-base gap-2',
    };

    const width = this.fullWidth() ? 'w-full' : '';
    const variantClass = this.active() ? activeVariants[this.variant()] : variants[this.variant()];

    return `${base} ${variantClass} ${sizes[this.size()]} ${width}`;
  });

  iconSizeClass = computed(() => {
    const sizes: Record<ButtonSize, string> = {
      xs: 'w-3 h-3',
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    };
    return sizes[this.size()];
  });

  handleClick(event: MouseEvent) {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}
