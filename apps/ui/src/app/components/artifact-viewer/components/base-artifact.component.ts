import { Directive, input } from '@angular/core';
import { DisplayArtifact } from '../models/display-artifact.model';

@Directive()
export abstract class BaseArtifactComponent {
  artifact = input.required<DisplayArtifact>();

  protected formatCellValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  protected formatJson(data: any): string {
    return JSON.stringify(data, null, 2);
  }
}
