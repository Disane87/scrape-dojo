import {
  Component,
  input,
  output,
  signal,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent, ButtonComponent } from '../shared';
import { TranslocoModule } from '@jsverse/transloco';
import 'iconify-icon';

export type ChangeType = 'major' | 'minor' | 'patch';

export interface VersionBumpResult {
  confirmed: boolean;
  newVersion: string;
  changeType: ChangeType;
}

function bumpVersion(version: string, changeType: ChangeType): string {
  const parts = version.replace(/^v/, '').split('.').map(Number);
  const major = parts[0] || 0;
  const minor = parts[1] || 0;
  const patch = parts[2] || 0;

  switch (changeType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

@Component({
  selector: 'app-version-bump-dialog',
  standalone: true,
  imports: [CommonModule, ModalComponent, ButtonComponent, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './version-bump-dialog.html',
})
export class VersionBumpDialogComponent {
  isOpen = input.required<boolean>();
  currentVersion = input.required<string>();
  result = output<VersionBumpResult>();

  selectedType = signal<ChangeType>('patch');

  newVersion = computed(() =>
    bumpVersion(this.currentVersion(), this.selectedType()),
  );

  changeTypes = [
    {
      value: 'major' as ChangeType,
      icon: 'lucide:alert-triangle',
      labelKey: 'workflow_editor.change_type_major',
      descKey: 'workflow_editor.change_type_major_desc',
    },
    {
      value: 'minor' as ChangeType,
      icon: 'lucide:plus-circle',
      labelKey: 'workflow_editor.change_type_minor',
      descKey: 'workflow_editor.change_type_minor_desc',
    },
    {
      value: 'patch' as ChangeType,
      icon: 'lucide:wrench',
      labelKey: 'workflow_editor.change_type_patch',
      descKey: 'workflow_editor.change_type_patch_desc',
    },
  ];

  confirm(): void {
    this.result.emit({
      confirmed: true,
      newVersion: this.newVersion(),
      changeType: this.selectedType(),
    });
  }

  cancel(): void {
    this.result.emit({ confirmed: false, newVersion: '', changeType: 'patch' });
  }
}
