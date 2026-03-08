import {
  Component,
  input,
  output,
  signal,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputComponent, BadgeComponent } from '../shared';
import { TranslocoModule } from '@jsverse/transloco';
import {
  ScrapeMetadata,
  ScrapeMetadataResolved,
  WorkflowTrigger,
} from '@scrape-dojo/shared';
import 'iconify-icon';

type TriggerType = 'manual' | 'cron' | 'webhook' | 'startup';

export interface MetadataChange {
  id: string;
  metadata: ScrapeMetadata | ScrapeMetadataResolved;
}

@Component({
  selector: 'app-workflow-metadata-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    InputComponent,
    BadgeComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './workflow-metadata-form.html',
})
export class WorkflowMetadataFormComponent {
  workflowId = input.required<string>();
  metadata = input.required<
    ScrapeMetadata | ScrapeMetadataResolved | Record<string, never>
  >();
  disabled = input<boolean>(false);
  idReadonly = input<boolean>(true);

  metadataChange = output<MetadataChange>();

  // Local form state
  id = signal('');
  description = signal('');
  category = signal('');
  version = signal('');
  triggers = signal<WorkflowTrigger[]>([]);

  showTriggerMenu = signal(false);

  private allTriggerTypes: TriggerType[] = [
    'manual',
    'cron',
    'webhook',
    'startup',
  ];

  availableTriggerTypes = computed(() => {
    const current = this.triggers().map((t) => t.type);
    return this.allTriggerTypes.filter((t) => !current.includes(t));
  });

  constructor() {
    // Sync inputs to local state
    effect(() => {
      this.id.set(this.workflowId());
    });
    effect(() => {
      const m = this.metadata();
      this.description.set(m?.description || '');
      this.category.set(m?.category || '');
      this.version.set(m?.version || '');
      this.triggers.set(m?.triggers ? [...m.triggers] : []);
    });
  }

  onIdChange(value: string): void {
    this.id.set(value);
    this.emitChange();
  }

  onDescriptionChange(value: string): void {
    this.description.set(value);
    this.emitChange();
  }

  onCategoryChange(value: string): void {
    this.category.set(value);
    this.emitChange();
  }

  getTriggerIcon(type: string): string {
    switch (type) {
      case 'manual':
        return 'lucide:hand';
      case 'cron':
        return 'lucide:clock';
      case 'webhook':
        return 'lucide:webhook';
      case 'startup':
        return 'lucide:power';
      default:
        return 'lucide:zap';
    }
  }

  toggleTriggerMenu(): void {
    this.showTriggerMenu.update((v) => !v);
  }

  addTrigger(type: TriggerType): void {
    const trigger = this.createDefaultTrigger(type);
    this.triggers.update((t) => [...t, trigger]);
    this.showTriggerMenu.set(false);
    this.emitChange();
  }

  removeTrigger(index: number): void {
    this.triggers.update((t) => t.filter((_, i) => i !== index));
    this.emitChange();
  }

  private createDefaultTrigger(type: TriggerType): WorkflowTrigger {
    switch (type) {
      case 'manual':
        return { type: 'manual' };
      case 'cron':
        return { type: 'cron', expression: '0 0 * * *' } as WorkflowTrigger;
      case 'webhook':
        return { type: 'webhook' } as WorkflowTrigger;
      case 'startup':
        return { type: 'startup' } as WorkflowTrigger;
    }
  }

  private emitChange(): void {
    const current = this.metadata();
    this.metadataChange.emit({
      id: this.id(),
      metadata: {
        ...current,
        description: this.description(),
        category: this.category(),
        triggers: this.triggers(),
      },
    });
  }
}
