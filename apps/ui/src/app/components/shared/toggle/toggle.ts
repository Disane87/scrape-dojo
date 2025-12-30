import { Component, computed, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ToggleSize = 'sm' | 'md' | 'lg';
export type ToggleColor = 'emerald' | 'blue' | 'orange' | 'rose';

@Component({
  selector: 'app-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="isChecked()"
      [disabled]="disabled()"
      (click)="toggle()"
      [class]="buttonClasses()">
      <span [class]="knobClasses()"></span>
    </button>
  `,
})
export class ToggleComponent {
  /** Whether the toggle is checked (input binding) */
  checked = input<boolean>(false);

  /** Whether the toggle is disabled */
  disabled = input<boolean>(false);

  /** Size of the toggle */
  size = input<ToggleSize>('md');

  /** Color when checked */
  color = input<ToggleColor>('emerald');

  /** Emitted when toggle value changes */
  changed = output<boolean>();

  // Internal state synced with input
  private _checked = signal(false);

  constructor() {
    // Sync input to internal state
    effect(() => {
      this._checked.set(this.checked());
    });
  }

  // Use internal state for display
  isChecked = computed(() => this._checked());

  buttonClasses = computed(() => {
    const sizes: Record<ToggleSize, string> = {
      sm: 'w-8 h-4',
      md: 'w-11 h-6',
      lg: 'w-14 h-7',
    };

    const colors: Record<ToggleColor, string> = {
      emerald: 'aria-checked:bg-emerald-500',
      blue: 'aria-checked:bg-blue-500',
      orange: 'aria-checked:bg-dojo-orange',
      rose: 'aria-checked:bg-rose-500',
    };

    const base = `
      relative inline-flex shrink-0 cursor-pointer rounded-full 
      border-2 border-transparent transition-colors duration-200 ease-in-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-dojo-accent focus-visible:ring-offset-2 focus-visible:ring-offset-dojo-bg
      bg-dojo-border ${colors[this.color()]}
      disabled:cursor-not-allowed disabled:opacity-50
    `;

    return `${base} ${sizes[this.size()]}`;
  });

  knobClasses = computed(() => {
    const sizes: Record<ToggleSize, { knob: string; translate: string }> = {
      sm: { knob: 'h-3 w-3', translate: 'translate-x-4' },
      md: { knob: 'h-5 w-5', translate: 'translate-x-5' },
      lg: { knob: 'h-6 w-6', translate: 'translate-x-7' },
    };

    const { knob, translate } = sizes[this.size()];
    const translateClass = this.isChecked() ? translate : 'translate-x-0';

    return `
      pointer-events-none inline-block ${knob} transform rounded-full 
      bg-white shadow ring-0 transition duration-200 ease-in-out
      ${translateClass}
    `;
  });

  toggle(): void {
    if (!this.disabled()) {
      const newValue = !this._checked();
      this._checked.set(newValue);
      this.changed.emit(newValue);
    }
  }
}
