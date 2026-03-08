import {
  Component,
  inject,
  signal,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ScrapeService } from '../../services/scrape.service';
import { StoreService } from '../../store/store.service';
import { JsonEditorComponent } from '../json-editor/json-editor';
import { ModalComponent, ButtonComponent } from '../shared';
import {
  WorkflowMetadataFormComponent,
  MetadataChange,
} from '../workflow-metadata-form/workflow-metadata-form';
import { TranslocoModule } from '@jsverse/transloco';
import 'iconify-icon';

const DEFAULT_METADATA = {
  description: '',
  version: '1.0.0',
  category: 'Custom',
  triggers: [{ type: 'manual' as const }],
};

const DEFAULT_STEPS: any[] = [];

@Component({
  selector: 'app-workflow-editor-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslocoModule,
    JsonEditorComponent,
    ModalComponent,
    ButtonComponent,
    WorkflowMetadataFormComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <app-modal
      [isOpen]="true"
      [title]="'workflow_editor.create_workflow' | transloco"
      [size]="'xl'"
      [showFooter]="true"
      (closed)="close()"
    >
      <div class="flex flex-col h-[70vh]">
        <!-- Metadata Form -->
        <app-workflow-metadata-form
          [workflowId]="workflowId()"
          [metadata]="metadata()"
          [disabled]="false"
          [idReadonly]="false"
          (metadataChange)="onMetadataChange($event)"
        />
        <!-- Steps JSON Editor -->
        <div class="flex-1 min-h-0">
          <app-json-editor
            [data]="steps"
            [readOnly]="false"
            [showMinimap]="false"
            [schema]="schema()"
            [fileName]="editorFileName()"
            (dataChange)="onStepsChange($event)"
            (validationError)="onValidationError($event)"
          >
          </app-json-editor>
        </div>
      </div>
      <div footer class="flex items-center justify-between">
        <div class="text-sm text-dojo-text-muted">
          @if (error()) {
            <span class="text-red-400">{{ error() }}</span>
          }
        </div>
        <div class="flex gap-2">
          <app-button variant="secondary" (clicked)="close()">
            {{ 'common.cancel' | transloco }}
          </app-button>
          <app-button
            variant="primary"
            [disabled]="!!error() || saving() || !workflowId()"
            (clicked)="save()"
          >
            @if (saving()) {
              <iconify-icon
                icon="lucide:loader-2"
                class="animate-spin mr-1"
              ></iconify-icon>
            }
            {{ 'common.save' | transloco }}
          </app-button>
        </div>
      </div>
    </app-modal>
  `,
})
export class WorkflowEditorModalComponent implements OnInit {
  private router = inject(Router);
  private scrapeService = inject(ScrapeService);
  private store = inject(StoreService);

  workflowId = signal('my-workflow-id');
  metadata = signal(DEFAULT_METADATA);
  steps: any[] = DEFAULT_STEPS;
  schema = signal<any>(null);
  error = signal<string | null>(null);
  saving = signal(false);
  editorFileName = signal('my-workflow-id.jsonc');

  private currentSteps: any[] = [];

  ngOnInit() {
    this.scrapeService.getSchema().subscribe({
      next: (schema) => this.schema.set(schema),
      error: () => {},
    });
  }

  onMetadataChange(change: MetadataChange): void {
    this.workflowId.set(change.id);
    this.editorFileName.set(`${change.id}.jsonc`);
  }

  onStepsChange(data: any): void {
    this.currentSteps = Array.isArray(data) ? data : [];
  }

  onValidationError(err: string | null) {
    this.error.set(err);
  }

  save() {
    if (this.error() || this.saving()) return;

    const id = this.workflowId();
    if (!id) {
      this.error.set('Workflow ID is required');
      return;
    }

    const scrape = {
      id,
      metadata: { ...this.metadata() },
      steps: this.currentSteps,
    };

    this.saving.set(true);

    this.scrapeService.createScrape(scrape).subscribe({
      next: async () => {
        this.saving.set(false);
        await this.store.scrapes.load();
        this.close();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.message || 'Failed to create workflow');
      },
    });
  }

  close() {
    this.router.navigate([{ outlets: { modal: null } }]);
  }
}
