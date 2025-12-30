import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type FormFieldVariant = 'default' | 'uppercase';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-field.html',
})
export class FormFieldComponent {
  /** Field label */
  label = input<string>();

  /** Required indicator */
  required = input<boolean>(false);

  /** Hint text below input */
  hint = input<string>();

  /** Error message */
  error = input<string>();

  /** Label variant */
  variant = input<FormFieldVariant>('default');

  /** For attribute (links label to input) */
  for = input<string>();

  labelClasses = computed(() => {
    const base = 'block font-medium text-dojo-text mb-1.5';

    const variants: Record<FormFieldVariant, string> = {
      default: 'text-sm',
      uppercase: 'text-xs uppercase tracking-wider text-dojo-text-muted',
    };

    return `${base} ${variants[this.variant()]}`;
  });
}
