import { Component, computed, input, output, forwardRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { toIconify } from '../../../utils/icon.utils';
import 'iconify-icon';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputType = 'text' | 'password' | 'email' | 'number' | 'search' | 'url' | 'tel';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './input.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    }],
})
export class InputComponent implements ControlValueAccessor {
  protected readonly toIconify = toIconify;

  /** Input type */
  type = input<InputType>('text');

  /** Placeholder text */
  placeholder = input<string>('');

  /** Input size */
  size = input<InputSize>('md');

  /** Use monospace font */
  mono = input<boolean>(false);

  /** Center text */
  centered = input<boolean>(false);

  /** Disabled state */
  disabled = input<boolean>(false);

  /** Readonly state */
  readonly = input<boolean>(false);

  /** Icon on left side */
  icon = input<string>();

  /** Icon on right side */
  iconRight = input<string>();

  /** Full width */
  fullWidth = input<boolean>(true);

  /** Value changed */
  valueChange = output<string>();

  // Internal value
  protected _value = '';

  // ControlValueAccessor callbacks
  private onChange: (value: string) => void = () => { };
  private onTouched: () => void = () => { };

  inputClasses = computed(() => {
    const base = 'bg-dojo-bg border border-dojo-border rounded-md text-dojo-text placeholder-dojo-text-muted focus:outline-none focus:border-dojo-accent focus:ring-1 focus:ring-dojo-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

    const sizes: Record<InputSize, string> = {
      sm: 'px-2.5 py-1.5 text-sm',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-2.5 text-base',
    };

    const width = this.fullWidth() ? 'w-full' : '';
    const mono = this.mono() ? 'font-mono' : '';
    const centered = this.centered() ? 'text-center' : '';
    const iconPadding = this.icon() ? 'pl-9' : '';
    const iconRightPadding = this.iconRight() ? 'pr-9' : '';

    return `${base} ${sizes[this.size()]} ${width} ${mono} ${centered} ${iconPadding} ${iconRightPadding}`;
  });

  iconSizeClass = computed(() => {
    const sizes: Record<InputSize, string> = {
      sm: 'w-4 h-4',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    };
    return sizes[this.size()];
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

  setDisabledState(isDisabled: boolean): void {
    // Handled by disabled input
  }
}
