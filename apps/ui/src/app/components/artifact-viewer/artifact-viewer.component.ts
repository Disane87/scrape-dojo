import { Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DisplayArtifact } from './models/display-artifact.model';
import { CardArtifactComponent } from './components/card-artifact.component';
import { TableArtifactComponent } from './components/table-artifact.component';
import { JsonArtifactComponent } from './components/json-artifact.component';
import { FileArtifactComponent } from './components/file-artifact.component';
import { ImageArtifactComponent } from './components/image-artifact.component';
import { LinkArtifactComponent } from './components/link-artifact.component';
import { TextArtifactComponent } from './components/text-artifact.component';

@Component({
  selector: 'app-artifact-viewer',
  standalone: true,
  imports: [
    CommonModule,
    CardArtifactComponent,
    TableArtifactComponent,
    JsonArtifactComponent,
    FileArtifactComponent,
    ImageArtifactComponent,
    LinkArtifactComponent,
    TextArtifactComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Content based on type - each component defines its own container -->
    @switch (artifact().type) {
      @case ('card') {
        <app-card-artifact [artifact]="artifact()" />
      }
      @case ('table') {
        <app-table-artifact [artifact]="artifact()" />
      }
      @case ('json') {
        <app-json-artifact [artifact]="artifact()" />
      }
      @case ('file') {
        <app-file-artifact [artifact]="artifact()" />
      }
      @case ('image') {
        <app-image-artifact [artifact]="artifact()" />
      }
      @case ('link') {
        <app-link-artifact [artifact]="artifact()" />
      }
      @default {
        <app-text-artifact [artifact]="artifact()" />
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ArtifactViewerComponent {
  artifact = input.required<DisplayArtifact>();

  getIcon(): string {
    switch (this.artifact().type) {
      case 'card':
        return 'lucide:layout-grid';
      case 'table':
        return 'lucide:table';
      case 'json':
        return 'lucide:braces';
      case 'file':
        return 'lucide:file-text';
      case 'image':
        return 'lucide:image';
      case 'link':
        return 'lucide:link';
      default:
        return 'lucide:eye';
    }
  }
}
