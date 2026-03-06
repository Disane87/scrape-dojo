import {
  Component,
  computed,
  input,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toIconify } from '../../../utils/icon.utils';
import 'iconify-icon';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'accent';
export type BadgeSize = 'xs' | 'sm' | 'md';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './badge.html',
})
export class BadgeComponent {
  protected readonly toIconify = toIconify;

  /** Badge variant/color */
  variant = input<BadgeVariant>('default');

  /** Badge size */
  size = input<BadgeSize>('sm');

  /** Show a dot indicator */
  dot = input<boolean>(false);

  /** Animate the dot (pulse) */
  pulse = input<boolean>(false);

  /** Lucide icon name */
  icon = input<string>();

  /** Use outline style instead of filled */
  outline = input<boolean>(false);

  /** Use pill (rounded-full) style */
  pill = input<boolean>(false);

  /** Use monospace font */
  mono = input<boolean>(false);

  badgeClasses = computed(() => {
    const base = 'inline-flex items-center gap-1 font-medium';

    const sizes: Record<BadgeSize, string> = {
      xs: 'px-1.5 py-0.5 text-[10px]',
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
    };

    const filledVariants: Record<BadgeVariant, string> = {
      default: 'bg-dojo-surface-2 text-dojo-text-muted',
      success:
        'bg-dojo-success-strong/20 text-dojo-success border border-dojo-success-strong/30',
      warning: 'bg-dojo-warning-strong text-white',
      danger: 'bg-dojo-danger/20 text-dojo-danger border border-dojo-danger/30',
      info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      accent: 'bg-dojo-surface-2 text-dojo-accent',
    };

    const outlineVariants: Record<BadgeVariant, string> = {
      default: 'border border-dojo-border text-dojo-text-muted',
      success: 'border border-dojo-success-strong/50 text-dojo-success',
      warning: 'border border-dojo-warning-strong/50 text-dojo-warning',
      danger: 'border border-dojo-danger/50 text-dojo-danger',
      info: 'border border-blue-500/50 text-blue-400',
      purple: 'border border-purple-500/50 text-purple-400',
      accent: 'border border-dojo-accent/50 text-dojo-accent',
    };

    const variants = this.outline() ? outlineVariants : filledVariants;
    const rounded = this.pill() ? 'rounded-full' : 'rounded';
    const mono = this.mono() ? 'font-mono' : '';

    return `${base} ${sizes[this.size()]} ${variants[this.variant()]} ${rounded} ${mono}`;
  });

  dotClasses = computed(() => {
    const base = 'w-2 h-2 rounded-full';
    const pulse = this.pulse() ? 'animate-pulse' : '';

    const colors: Record<BadgeVariant, string> = {
      default: 'bg-dojo-text-muted',
      success: 'bg-dojo-success',
      warning: 'bg-white',
      danger: 'bg-dojo-danger',
      info: 'bg-blue-400',
      purple: 'bg-purple-400',
      accent: 'bg-dojo-accent',
    };

    return `${base} ${colors[this.variant()]} ${pulse}`;
  });
}
