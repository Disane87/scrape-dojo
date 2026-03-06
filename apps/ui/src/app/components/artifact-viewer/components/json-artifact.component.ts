import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseArtifactComponent } from './base-artifact.component';

@Component({
  selector: 'app-json-artifact',
  standalone: true,
  imports: [CommonModule],
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
      <pre
        class="bg-dojo-surface p-3 rounded text-sm overflow-x-auto text-dojo-text"
        >{{ formatJson(artifact().data) }}</pre
      >
    </div>
  `,
})
export class JsonArtifactComponent extends BaseArtifactComponent {}
