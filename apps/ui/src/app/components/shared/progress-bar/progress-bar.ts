import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProgressBarSize = 'xs' | 'sm' | 'md';
export type ProgressBarStatus = 'default' | 'running' | 'success' | 'failed' | 'warning';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="containerClasses()">
      <div
        [class]="barClasses()"
        [style.width.%]="percentage()"
      ></div>
    </div>
  `,
})
export class ProgressBarComponent {
  /** Current value */
  value = input<number>(0);

  /** Maximum value */
  max = input<number>(100);

  /** Progress bar size */
  size = input<ProgressBarSize>('sm');

  /** Progress status for color */
  status = input<ProgressBarStatus>('default');

  /** Show animation */
  animated = input<boolean>(false);

  percentage = computed(() => {
    const val = this.value();
    const maxVal = this.max();
    if (maxVal <= 0) return 0;
    return Math.min(100, Math.max(0, (val / maxVal) * 100));
  });

  containerClasses = computed(() => {
    const base = 'bg-dojo-surface-2 rounded-full overflow-hidden';

    const sizes: Record<ProgressBarSize, string> = {
      xs: 'h-1',
      sm: 'h-1.5',
      md: 'h-2',
    };

    return `${base} ${sizes[this.size()]}`;
  });

  barClasses = computed(() => {
    const base = 'h-full rounded-full transition-all duration-300';

    const statuses: Record<ProgressBarStatus, string> = {
      default: 'bg-dojo-border',
      running: 'bg-dojo-warning',
      success: 'bg-dojo-success',
      failed: 'bg-dojo-danger',
      warning: 'bg-dojo-orange',
    };

    const animation = this.animated() && this.status() === 'running' ? 'animate-pulse' : '';

    return `${base} ${statuses[this.status()]} ${animation}`;
  });
}
