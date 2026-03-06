import {
  Component,
  input,
  TemplateRef,
  ViewChild,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import 'iconify-icon';

@Component({
  selector: 'app-tab',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ng-template #tabContent>
      <ng-content />
    </ng-template>
  `,
})
export class TabComponent {
  /** Unique tab identifier */
  id = input.required<string>();

  /** Tab label */
  label = input.required<string>();

  /** Optional icon name */
  icon = input<string>();

  /** Optional badge count */
  badge = input<number>();

  @ViewChild('tabContent', { static: true }) content!: TemplateRef<unknown>;
}
