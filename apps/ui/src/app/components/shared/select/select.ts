import {
  Component,
  computed,
  input,
  output,
  forwardRef,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
} from '@angular/forms';
import 'iconify-icon';

export type SelectSize = 'sm' | 'md' | 'lg';
export type SelectVariant = 'default' | 'surface';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './select.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent implements ControlValueAccessor {
  /** Select options */
  options = input<SelectOption[]>([]);

  /** Placeholder option */
  placeholder = input<string>();

  /** Select size */
  size = input<SelectSize>('md');

  /** Select variant */
  variant = input<SelectVariant>('default');

  /** Disabled state */
  disabled = input<boolean>(false);

  /** Full width */
  fullWidth = input<boolean>(true);

  /** Value changed */
  valueChange = output<string | number>();

  // Internal value
  protected _value: string | number = '';

  // ControlValueAccessor callbacks
  private onChange: (value: string | number) => void = () => {};
  private onTouched: () => void = () => {};

  selectClasses = computed(() => {
    const base =
      'appearance-none border border-dojo-border rounded-md text-dojo-text focus:outline-none focus:border-dojo-accent focus:ring-1 focus:ring-dojo-accent cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed pr-8';

    const variants: Record<SelectVariant, string> = {
      default: 'bg-dojo-bg',
      surface: 'bg-dojo-surface-2',
    };

    const sizes: Record<SelectSize, string> = {
      sm: 'pl-2.5 py-1.5 text-sm',
      md: 'pl-3 py-2 text-sm',
      lg: 'pl-4 py-2.5 text-base',
    };

    const width = this.fullWidth() ? 'w-full' : '';

    return `${base} ${variants[this.variant()]} ${sizes[this.size()]} ${width}`;
  });

  onSelectChange(value: string | number) {
    this._value = value;
    this.onChange(value);
    this.valueChange.emit(value);
  }

  onBlur() {
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: string | number): void {
    this._value = value ?? '';
  }

  registerOnChange(fn: (value: string | number) => void): void {
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
