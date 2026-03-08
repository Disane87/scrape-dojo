import {
  Component,
  computed,
  input,
  output,
  signal,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrapeListItem } from '@scrape-dojo/shared';
import { ScrapeIconComponent } from '../scrape-icon/scrape-icon.component';
import { TranslocoModule } from '@jsverse/transloco';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';
import 'iconify-icon';

export interface WorkflowGroup {
  category: string;
  scrapes: ScrapeListItem[];
  isExpanded: boolean;
}

const UNCATEGORIZED_KEY = '__uncategorized__';

@Component({
  selector: 'app-workflow-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    ScrapeIconComponent,
    TranslocoModule,
    RelativeTimePipe,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './workflow-sidebar.html',
})
export class WorkflowSidebarComponent {
  scrapes = input.required<ScrapeListItem[]>();
  selectedScrape = input<string | null>(null);
  appVersion = input<string>('');
  gitCommit = input<string>('');

  scrapeSelected = output<string>();
  createWorkflow = output<void>();
  importWorkflow = output<File>();

  /** Track which categories are collapsed */
  private collapsedCategories = signal<Set<string>>(new Set());

  /** Group scrapes by category */
  groupedScrapes = computed<WorkflowGroup[]>(() => {
    const scrapes = this.scrapes();
    const collapsed = this.collapsedCategories();

    // Group by category
    const groups = new Map<string, ScrapeListItem[]>();

    for (const scrape of scrapes) {
      const category = scrape.metadata?.category || UNCATEGORIZED_KEY;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(scrape);
    }

    // Convert to array and sort
    const result: WorkflowGroup[] = [];

    // Sort categories alphabetically, but uncategorized at the end
    const sortedCategories = Array.from(groups.keys()).sort((a, b) => {
      if (a === UNCATEGORIZED_KEY) return 1;
      if (b === UNCATEGORIZED_KEY) return -1;
      return a.localeCompare(b);
    });

    for (const category of sortedCategories) {
      result.push({
        category,
        scrapes: groups.get(category)!,
        isExpanded: !collapsed.has(category),
      });
    }

    return result;
  });

  /** Check if any category grouping exists */
  hasCategories = computed(() => {
    const groups = this.groupedScrapes();
    // Has real categories if more than 1 group, or if single group is not uncategorized
    return (
      groups.length > 1 ||
      (groups.length === 1 && groups[0].category !== UNCATEGORIZED_KEY)
    );
  });

  toggleCategory(category: string): void {
    this.collapsedCategories.update((collapsed) => {
      const newCollapsed = new Set(collapsed);
      if (newCollapsed.has(category)) {
        newCollapsed.delete(category);
      } else {
        newCollapsed.add(category);
      }
      return newCollapsed;
    });
  }

  getCategoryDisplayName(category: string): string {
    return category === UNCATEGORIZED_KEY ? 'Allgemein' : category;
  }

  isUncategorized(category: string): boolean {
    return category === UNCATEGORIZED_KEY;
  }

  /** Check if a scrape is disabled (explicitly or implicitly) */
  isDisabled(scrape: ScrapeListItem): boolean {
    // Explicitly disabled
    if (scrape.metadata?.disabled) {
      return true;
    }
    // Implicitly disabled: no triggers configured
    const triggers = scrape.metadata?.triggers;
    return !triggers || triggers.length === 0;
  }

  /** Get tooltip text for disabled scrapes */
  getDisabledReason(scrape: ScrapeListItem): string {
    if (scrape.metadata?.disabled) {
      return 'Workflow ist deaktiviert';
    }
    const triggers = scrape.metadata?.triggers;
    if (!triggers || triggers.length === 0) {
      return 'Kein Trigger konfiguriert';
    }
    return '';
  }

  selectScrape(id: string): void {
    this.scrapeSelected.emit(id);
  }

  onCreateWorkflow(): void {
    this.createWorkflow.emit();
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.importWorkflow.emit(input.files[0]);
      input.value = '';
    }
  }
}
