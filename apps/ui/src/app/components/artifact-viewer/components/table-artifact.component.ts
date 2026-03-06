import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseArtifactComponent } from './base-artifact.component';
import { FilesService } from '../../../services/files.service';

@Component({
  selector: 'app-table-artifact',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div
      class="artifact-container bg-dojo-surface-2 border border-dojo-border rounded-lg p-4 mb-4"
    >
      @if (artifact().title || artifact().description) {
        <div class="mb-3">
          @if (artifact().title) {
            <h3 class="text-lg font-semibold text-dojo-text">
              {{ artifact().title }}
            </h3>
          }
          @if (artifact().description) {
            <p class="text-sm text-dojo-text-muted mt-1">
              {{ artifact().description }}
            </p>
          }
        </div>
      }
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-dojo-border">
          <thead class="bg-dojo-surface">
            <tr>
              @for (header of getTableHeaders(); track header) {
                <th
                  class="px-4 py-2 text-left text-xs font-medium text-dojo-text-muted uppercase tracking-wider"
                >
                  {{ header }}
                </th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-dojo-border">
            @for (row of artifact().data; track $index) {
              <tr class="hover:bg-dojo-surface transition-colors">
                @for (header of getTableHeaders(); track header) {
                  <td
                    class="px-4 py-2 text-sm text-dojo-text whitespace-nowrap"
                  >
                    @if (isFilePath(row[header])) {
                      <div class="flex items-center gap-2">
                        <span class="flex-1">{{
                          formatCellValue(row[header])
                        }}</span>
                        <button
                          (click)="downloadFileFromPath(row[header])"
                          class="px-2 py-1 bg-dojo-accent text-white rounded text-xs hover:bg-dojo-accent-strong transition-colors flex items-center gap-1"
                          title="Datei herunterladen"
                        >
                          <iconify-icon
                            icon="lucide:download"
                            class="w-3 h-3"
                          ></iconify-icon>
                        </button>
                      </div>
                    } @else {
                      {{ formatCellValue(row[header]) }}
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class TableArtifactComponent extends BaseArtifactComponent {
  private filesService = inject(FilesService);

  getTableHeaders(): string[] {
    const data = this.artifact().data;
    if (!Array.isArray(data) || data.length === 0) return [];
    return Object.keys(data[0]);
  }

  isFilePath(value: any): boolean {
    if (typeof value !== 'string') return false;
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(value);
    const isPath = /[\/\\]/.test(value) || /^[a-zA-Z]:[\/\\]/.test(value);
    return hasExtension && isPath;
  }

  downloadFileFromPath(path: string): void {
    this.filesService.downloadFile(path);
  }
}
