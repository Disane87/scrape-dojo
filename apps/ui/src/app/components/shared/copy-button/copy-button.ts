import {
  Component,
  input,
  signal,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import 'iconify-icon';

export type CopyButtonSize = 'xs' | 'sm' | 'md';
export type CopyButtonVariant = 'default' | 'ghost' | 'toolbar';

@Component({
  selector: 'app-copy-button',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './copy-button.html',
})
export class CopyButtonComponent {
  /** Value to copy to clipboard */
  value = input.required<string>();

  /** Button size */
  size = input<CopyButtonSize>('sm');

  /** Button variant */
  variant = input<CopyButtonVariant>('default');

  /** Show label text */
  showLabel = input<boolean>(true);

  /** Custom label */
  label = input<string>('Copy');

  /** Custom copied label */
  copiedLabel = input<string>('Copied!');

  /** Copied state */
  copied = signal(false);

  buttonClasses = computed(() => {
    const base = 'rounded transition-colors flex items-center gap-1';

    const variants: Record<CopyButtonVariant, string> = {
      default:
        'bg-dojo-surface-2 border border-dojo-border text-dojo-text-muted hover:text-dojo-text hover:border-dojo-text-muted',
      ghost:
        'text-dojo-text-muted hover:text-dojo-text hover:bg-dojo-surface-2',
      toolbar:
        'hover:bg-dojo-surface-2 text-dojo-text-muted hover:text-dojo-text',
    };

    const sizes: Record<CopyButtonSize, string> = {
      xs: 'px-1.5 py-0.5 text-[10px]',
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
    };

    // Success state overrides
    if (this.copied()) {
      return `${base} ${sizes[this.size()]} bg-dojo-success-strong border-dojo-success-strong text-white`;
    }

    return `${base} ${sizes[this.size()]} ${variants[this.variant()]}`;
  });

  iconSizeClass = computed(() => {
    const sizes: Record<CopyButtonSize, string> = {
      xs: 'w-3 h-3',
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
    };
    return sizes[this.size()];
  });

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.value());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
}
