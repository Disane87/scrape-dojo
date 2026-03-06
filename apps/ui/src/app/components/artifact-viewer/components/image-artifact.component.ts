import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseArtifactComponent } from './base-artifact.component';

@Component({
  selector: 'app-image-artifact',
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
      <div class="max-w-full overflow-hidden rounded">
        <img
          [src]="artifact().data"
          [alt]="artifact().title || 'Image'"
          class="max-w-full h-auto"
        />
      </div>
    </div>
  `,
})
export class ImageArtifactComponent extends BaseArtifactComponent {}
