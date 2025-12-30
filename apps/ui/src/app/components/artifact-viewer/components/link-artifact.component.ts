import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseArtifactComponent } from './base-artifact.component';

@Component({
  selector: 'app-link-artifact',
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
      <a [href]="artifact().data" target="_blank" 
         class="flex items-center gap-2 text-dojo-accent hover:text-dojo-accent-strong transition-colors">
        <iconify-icon icon="lucide:link" class="w-4 h-4"></iconify-icon>
        {{ artifact().data }}
        <iconify-icon icon="lucide:external-link" class="w-3 h-3"></iconify-icon>
      </a>
    </div>
  `
})
export class LinkArtifactComponent extends BaseArtifactComponent {}
