import { Component, CUSTOM_ELEMENTS_SCHEMA, AfterViewChecked, ElementRef, inject } from '@angular/core';
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
    <div class="border border-dojo-border rounded-lg overflow-hidden">
      @for (item of getCardItems(); track $index) {
      <div class="bg-dojo-surface-2 hover:bg-dojo-surface transition-colors p-2" [class.border-t]="$index > 0" [class.border-dojo-border]="$index > 0">
        <div [innerHTML]="getSafeHtml(item)" class="flush-card"></div>
      </div>
      }
    </div>
    } @else {
    <!-- Standard Card Grid -->
    <div class="grid gap-3">
      @for (item of getCardItems(); track $index) {
      <div class="bg-dojo-surface-2 border border-dojo-border rounded-lg hover:border-dojo-accent transition-colors">
        <div [innerHTML]="getSafeHtml(item)"></div>
      </div>
      }
    </div>
    }
  `,
  styles: [`
    :host ::ng-deep .flush-card {
      padding: 0;
    }
    :host ::ng-deep .flush-card > div {
      padding: 0 !important;
      margin: 0 !important;
    }
  `]
})
export class CardArtifactComponent extends BaseArtifactComponent implements AfterViewChecked {
  private filesService = inject(FilesService);
  private elementRef = inject(ElementRef);
  private sanitizer = inject(DomSanitizer);
  private handlersAttached = false;

  ngAfterViewChecked() {
    // Nur einmal Event-Handler anhängen
    if (!this.handlersAttached) {
      const buttons = this.elementRef.nativeElement.querySelectorAll('[data-download]');
      if (buttons.length > 0) {
        // Verwende Event-Delegation auf dem Container-Element
        this.elementRef.nativeElement.addEventListener('click', (event: Event) => {
          const target = event.target as HTMLElement;
          // Finde den nächsten Button mit data-download Attribut
          const button = target.closest('[data-download]') as HTMLElement;
          if (button) {
            const path = button.getAttribute('data-download');
            if (path) {
              event.preventDefault();
              event.stopPropagation();
              this.filesService.downloadFile(path);
            }
          }
        });
        
        this.handlersAttached = true;
      }
    }
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
