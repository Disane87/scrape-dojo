import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardVariant = 'default' | 'elevated' | 'flat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="cardClasses()">
      <ng-content />
    </div>
  `,
})
export class CardComponent {
  /** Card variant */
  variant = input<CardVariant>('default');

  /** Card padding */
  padding = input<CardPadding>('none');

  /** Overflow handling */
  overflow = input<'visible' | 'hidden' | 'auto'>('hidden');

  cardClasses = computed(() => {
    const base = 'rounded-md';

    const variants: Record<CardVariant, string> = {
      default: 'border border-dojo-border',
      elevated: 'border border-dojo-border shadow-lg',
      flat: 'bg-dojo-surface',
    };

    const paddings: Record<CardPadding, string> = {
      none: '',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
    };

    const overflows: Record<string, string> = {
      visible: 'overflow-visible',
      hidden: 'overflow-hidden',
      auto: 'overflow-auto',
    };

    return `${base} ${variants[this.variant()]} ${paddings[this.padding()]} ${overflows[this.overflow()]}`;
  });
}
