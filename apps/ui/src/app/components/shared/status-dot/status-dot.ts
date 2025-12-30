import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type StatusDotStatus = 'default' | 'live' | 'success' | 'warning' | 'danger' | 'info' | 'unsaved';
export type StatusDotSize = 'xs' | 'sm' | 'md';

@Component({
  selector: 'app-status-dot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="dotClasses()" [title]="title()"></span>
  `,
})
export class StatusDotComponent {
  /** Status type */
  status = input<StatusDotStatus>('default');

  /** Dot size */
  size = input<StatusDotSize>('sm');

  /** Animate with pulse */
  animated = input<boolean>(false);

  /** Tooltip title */
  title = input<string>();

  dotClasses = computed(() => {
    const base = 'inline-block rounded-full';

    const sizes: Record<StatusDotSize, string> = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
    };

    const statuses: Record<StatusDotStatus, string> = {
      default: 'bg-dojo-text-muted',
      live: 'bg-dojo-success',
      success: 'bg-dojo-success',
      warning: 'bg-dojo-warning',
      danger: 'bg-dojo-danger',
      info: 'bg-blue-400',
      unsaved: 'bg-dojo-orange',
    };

    const animation = this.animated() ? 'animate-pulse' : '';

    return `${base} ${sizes[this.size()]} ${statuses[this.status()]} ${animation}`;
  });
}
