import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseArtifactComponent } from './base-artifact.component';
import { FilesService } from '../../../services/files.service';

@Component({
  selector: 'app-file-artifact',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="artifact-container bg-dojo-surface-2 border border-dojo-border rounded-lg p-4 mb-4">
      @if (artifact().title || artifact().description) {
      <div class="mb-3">
        @if (artifact().title) {
        <h3 class="text-lg font-semibold text-dojo-text">{{ artifact().title }}</h3>
        }
        @if (artifact().description) {
        <p class="text-sm text-dojo-text-muted mt-1">{{ artifact().description }}</p>
        }
      </div>
      }
      <div class="flex items-center gap-3 p-3 bg-dojo-surface rounded">
      <iconify-icon icon="lucide:file-text" class="w-8 h-8 text-dojo-accent"></iconify-icon>
      <div class="flex-1">
        <p class="text-sm font-medium text-dojo-text">{{ getFileName() }}</p>
        <p class="text-xs text-dojo-text-muted">{{ artifact().data }}</p>
      </div>
      <button 
        (click)="downloadFile()"
        class="px-3 py-1.5 bg-dojo-accent text-white rounded text-sm hover:bg-dojo-accent-strong transition-colors">
        <iconify-icon icon="lucide:download" class="w-4 h-4"></iconify-icon>
      </button>
      </div>
    </div>
  `
})
export class FileArtifactComponent extends BaseArtifactComponent {
  private filesService = inject(FilesService);

  getFileName(): string {
    const path = this.artifact().data;
    return path.split(/[/\\]/).pop() || path;
  }

  downloadFile(): void {
    this.filesService.downloadFile(this.artifact().data);
  }
}
