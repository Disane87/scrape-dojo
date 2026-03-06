import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  AfterViewChecked,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BaseArtifactComponent } from './base-artifact.component';
import { FilesService } from '../../../services/files.service';

@Component({
  selector: 'app-card-artifact',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (artifact().flush) {
      <!-- Flush/Compact List Style -->
      <div class="overflow-hidden">
        @for (item of getCardItems(); track $index) {
          <div
            class="bg-dojo-surface-2 hover:bg-dojo-surface transition-colors p-2"
            [class.border-b]="!$last"
            [class.border-dojo-border]="!$last"
          >
            <div [innerHTML]="getSafeHtml(item)" class="flush-card"></div>
          </div>
        }
      </div>
    } @else {
      <!-- Standard Card Grid -->
      <div class="grid gap-3">
        @for (item of getCardItems(); track $index) {
          <div
            class="bg-dojo-surface-2 border border-dojo-border rounded-lg hover:border-dojo-accent transition-colors"
          >
            <div [innerHTML]="getSafeHtml(item)"></div>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      :host ::ng-deep .flush-card {
        padding: 0;
      }
      :host ::ng-deep .flush-card > div {
        padding: 0 !important;
        margin: 0 !important;
      }
    `,
  ],
})
export class CardArtifactComponent
  extends BaseArtifactComponent
  implements AfterViewChecked
{
  private filesService = inject(FilesService);
  private elementRef = inject(ElementRef);
  private sanitizer = inject(DomSanitizer);
  private clickHandler: ((event: Event) => void) | null = null;

  ngAfterViewInit(): void {
    if (this.clickHandler) return;

    this.clickHandler = (event: Event) => {
      const path = this.findDownloadPath(event);
      if (!path) return;

      event.preventDefault();
      event.stopPropagation();
      this.filesService.downloadFile(path);
    };

    this.elementRef.nativeElement.addEventListener('click', this.clickHandler);
  }

  ngOnDestroy(): void {
    if (!this.clickHandler) return;
    this.elementRef.nativeElement.removeEventListener(
      'click',
      this.clickHandler,
    );
    this.clickHandler = null;
  }

  private findDownloadPath(event: Event): string | null {
    const anyEvent = event as any;
    const composedPath: unknown[] | undefined =
      typeof anyEvent.composedPath === 'function'
        ? anyEvent.composedPath()
        : undefined;

    if (Array.isArray(composedPath)) {
      for (const node of composedPath) {
        if (!(node instanceof HTMLElement)) continue;
        const value = node.getAttribute('data-download');
        if (value) return value;
      }
    }

    const target = event.target as HTMLElement | null;
    const button = target?.closest?.('[data-download]') as HTMLElement | null;
    return button?.getAttribute('data-download') || null;
  }

  // Backwards compatibility: previously this component attached in ngAfterViewChecked.
  // Keep the interface but do nothing here now.
  ngAfterViewChecked(): void {
    // no-op
  }
  getCardItems(): any[] {
    const data = this.artifact().data;
    return Array.isArray(data) ? data : [data];
  }

  getSafeHtml(item: any): SafeHtml {
    const template = this.renderCardTemplate(item);
    return this.sanitizer.bypassSecurityTrustHtml(template);
  }

  renderCardTemplate(item: any): string {
    const template = this.artifact().template;
    if (!template) {
      return `<pre class="text-xs">${JSON.stringify(item, null, 2)}</pre>`;
    }

    // Template wurde bereits im Backend gerendert, einfach zurückgeben
    return template;
  }
}
