import { Component, input, output, contentChildren, AfterContentInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabComponent } from './tab';
import { toIconify } from '../../../utils/icon.utils';
import 'iconify-icon';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './tabs.html',
})
export class TabsComponent implements AfterContentInit {
  protected readonly toIconify = toIconify;

  /** Currently active tab id */
  activeTab = input<string>();

  /** Emitted when active tab changes */
  activeTabChange = output<string>();

  /** Tab content children */
  tabs = contentChildren(TabComponent);

  ngAfterContentInit() {
    // Set first tab as active if none specified
    const tabsArr = this.tabs();
    if (tabsArr.length > 0 && !this.activeTab()) {
      this.selectTab(tabsArr[0].id());
    }
  }

  selectTab(tabId: string) {
    this.activeTabChange.emit(tabId);
  }

  isActive(tabId: string): boolean {
    return this.activeTab() === tabId;
  }

  getTabClasses(tabId: string): string {
    const base = 'px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2';

    if (this.isActive(tabId)) {
      return `${base} border-dojo-accent text-dojo-text`;
    }
    return `${base} border-transparent text-dojo-text-muted hover:text-dojo-text hover:border-dojo-border`;
  }
}
