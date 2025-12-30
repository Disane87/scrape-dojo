import { Component, computed, input, output, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconButtonComponent } from '../icon-button/icon-button';
import { toIconify } from '../../../utils/icon.utils';
import { TranslocoModule } from '@jsverse/transloco';
import 'iconify-icon';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, IconButtonComponent, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal.html',
})
export class ModalComponent {
  protected readonly toIconify = toIconify;

  /** Whether the modal is open */
  isOpen = input.required<boolean>();

  /** Modal title */
  title = input.required<string>();

  /** Optional icon for the header */
  icon = input<string>();

  /** Modal size */
  size = input<ModalSize>('md');

  /** Whether to show the footer slot */
  showFooter = input<boolean>(true);

  /** Whether clicking backdrop closes the modal */
  closeOnBackdrop = input<boolean>(true);

  /** Emitted when modal should close */
  closed = output<void>();

  modalClasses = computed(() => {
    const base = 'relative bg-dojo-surface border border-dojo-border rounded-lg shadow-xl flex flex-col';

    const sizes: Record<ModalSize, string> = {
      sm: 'w-full max-w-sm max-h-[80vh]',
      md: 'w-full max-w-md max-h-[85vh]',
      lg: 'w-full max-w-2xl max-h-[85vh]',
      xl: 'w-full max-w-4xl max-h-[90vh]',
      full: 'w-[90vw] h-[85vh] max-w-6xl',
    };

    return `${base} ${sizes[this.size()]}`;
  });

  onBackdropClick() {
    if (this.closeOnBackdrop()) {
      this.closed.emit();
    }
  }

  close() {
    this.closed.emit();
  }
}
