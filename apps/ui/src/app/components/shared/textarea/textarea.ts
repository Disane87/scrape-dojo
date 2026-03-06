import { Component, computed, input, output, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
} from '@angular/forms';

export type TextareaSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './textarea.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true,
    },
  ],
})
export class TextareaComponent implements ControlValueAccessor {
  /** Placeholder text */
  placeholder = input<string>('');

  /** Textarea size */
  size = input<TextareaSize>('md');

  /** Number of rows */
  rows = input<number>(3);

  /** Disabled state */
  disabled = input<boolean>(false);

  /** Readonly state */
  readonly = input<boolean>(false);

  /** Allow resize */
  resize = input<'none' | 'vertical' | 'horizontal' | 'both'>('none');

  /** Use monospace font */
  mono = input<boolean>(false);

  /** Full width */
  fullWidth = input<boolean>(true);

  /** Value changed */
  valueChange = output<string>();

  // Internal value
  protected _value = '';

  // ControlValueAccessor callbacks
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  textareaClasses = computed(() => {
    const base =
      'bg-dojo-bg border border-dojo-border rounded-md text-dojo-text placeholder-dojo-text-muted focus:outline-none focus:border-dojo-accent focus:ring-1 focus:ring-dojo-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

    const sizes: Record<TextareaSize, string> = {
      sm: 'px-2.5 py-1.5 text-sm',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-2.5 text-base',
    };

    const resizes: Record<string, string> = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    const width = this.fullWidth() ? 'w-full' : '';
    const mono = this.mono() ? 'font-mono' : '';

    return `${base} ${sizes[this.size()]} ${resizes[this.resize()]} ${width} ${mono}`;
  });

  onInputChange(value: string) {
    this._value = value;
    this.onChange(value);
    this.valueChange.emit(value);
  }

  onBlur() {
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this._value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setDisabledState(isDisabled: boolean): void {
    // Handled by disabled input
  }
}
