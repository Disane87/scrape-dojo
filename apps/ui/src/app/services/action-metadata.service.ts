import { Injectable, inject, computed } from '@angular/core';
import { ActionMetadata } from '@scrape-dojo/shared';
import { AppDataService } from './app-data.service';

// Default fallback metadata for unknown actions
const DEFAULT_METADATA: ActionMetadata = {
  name: 'unknown',
  displayName: 'Unknown',
  icon: 'Code',
  description: 'Unknown action',
  color: 'gray',
  category: 'utility',
};

// Tailwind requires full class names at build time - cannot use dynamic classes like `bg-${color}-500`
// This mapping provides full class strings for each color value from the metadata
const COLOR_CLASSES: Record<
  string,
  {
    iconBg: string;
    card: string;
    border: string;
    loopExpanded: string;
    loopCollapsed: string;
  }
> = {
  blue: {
    iconBg: 'bg-blue-500/20 text-blue-400',
    card: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    border: 'border-l-blue-500',
    loopExpanded: 'bg-blue-500/10 border-blue-500/40',
    loopCollapsed: 'bg-blue-500/5 hover:bg-blue-500/10',
  },
  purple: {
    iconBg: 'bg-purple-500/20 text-purple-400',
    card: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
    border: 'border-l-purple-500',
    loopExpanded: 'bg-purple-500/10 border-purple-500/40',
    loopCollapsed: 'bg-purple-500/5 hover:bg-purple-500/10',
  },
  pink: {
    iconBg: 'bg-pink-500/20 text-pink-400',
    card: 'bg-pink-500/20 border-pink-500/50 text-pink-400',
    border: 'border-l-pink-500',
    loopExpanded: 'bg-pink-500/10 border-pink-500/40',
    loopCollapsed: 'bg-pink-500/5 hover:bg-pink-500/10',
  },
  cyan: {
    iconBg: 'bg-cyan-500/20 text-cyan-400',
    card: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400',
    border: 'border-l-cyan-500',
    loopExpanded: 'bg-cyan-500/10 border-cyan-500/40',
    loopCollapsed: 'bg-cyan-500/5 hover:bg-cyan-500/10',
  },
  amber: {
    iconBg: 'bg-amber-500/20 text-amber-400',
    card: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
    border: 'border-l-amber-500',
    loopExpanded: 'bg-amber-500/10 border-amber-500/40',
    loopCollapsed: 'bg-amber-500/5 hover:bg-amber-500/10',
  },
  violet: {
    iconBg: 'bg-violet-500/20 text-violet-400',
    card: 'bg-violet-500/20 border-violet-500/50 text-violet-400',
    border: 'border-l-violet-500',
    loopExpanded: 'bg-violet-500/10 border-violet-500/40',
    loopCollapsed: 'bg-violet-500/5 hover:bg-violet-500/10',
  },
  green: {
    iconBg: 'bg-green-500/20 text-green-400',
    card: 'bg-green-500/20 border-green-500/50 text-green-400',
    border: 'border-l-green-500',
    loopExpanded: 'bg-green-500/10 border-green-500/40',
    loopCollapsed: 'bg-green-500/5 hover:bg-green-500/10',
  },
  indigo: {
    iconBg: 'bg-indigo-500/20 text-indigo-400',
    card: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400',
    border: 'border-l-indigo-500',
    loopExpanded: 'bg-indigo-500/10 border-indigo-500/40',
    loopCollapsed: 'bg-indigo-500/5 hover:bg-indigo-500/10',
  },
  gray: {
    iconBg: 'bg-gray-500/20 text-gray-400',
    card: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
    border: 'border-l-gray-500',
    loopExpanded: 'bg-gray-500/10 border-gray-500/40',
    loopCollapsed: 'bg-gray-500/5 hover:bg-gray-500/10',
  },
  yellow: {
    iconBg: 'bg-yellow-500/20 text-yellow-400',
    card: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    border: 'border-l-yellow-500',
    loopExpanded: 'bg-yellow-500/10 border-yellow-500/40',
    loopCollapsed: 'bg-yellow-500/5 hover:bg-yellow-500/10',
  },
  orange: {
    iconBg: 'bg-orange-500/20 text-orange-400',
    card: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
    border: 'border-l-orange-500',
    loopExpanded: 'bg-orange-500/10 border-orange-500/40',
    loopCollapsed: 'bg-orange-500/5 hover:bg-orange-500/10',
  },
  slate: {
    iconBg: 'bg-slate-500/20 text-slate-400',
    card: 'bg-slate-500/20 border-slate-500/50 text-slate-400',
    border: 'border-l-slate-500',
    loopExpanded: 'bg-slate-500/10 border-slate-500/40',
    loopCollapsed: 'bg-slate-500/5 hover:bg-slate-500/10',
  },
  rose: {
    iconBg: 'bg-rose-500/20 text-rose-400',
    card: 'bg-rose-500/20 border-rose-500/50 text-rose-400',
    border: 'border-l-rose-500',
    loopExpanded: 'bg-rose-500/10 border-rose-500/40',
    loopCollapsed: 'bg-rose-500/5 hover:bg-rose-500/10',
  },
  red: {
    iconBg: 'bg-red-500/20 text-red-400',
    card: 'bg-red-500/20 border-red-500/50 text-red-400',
    border: 'border-l-red-500',
    loopExpanded: 'bg-red-500/10 border-red-500/40',
    loopCollapsed: 'bg-red-500/5 hover:bg-red-500/10',
  },
  teal: {
    iconBg: 'bg-teal-500/20 text-teal-400',
    card: 'bg-teal-500/20 border-teal-500/50 text-teal-400',
    border: 'border-l-teal-500',
    loopExpanded: 'bg-teal-500/10 border-teal-500/40',
    loopCollapsed: 'bg-teal-500/5 hover:bg-teal-500/10',
  },
  fuchsia: {
    iconBg: 'bg-fuchsia-500/20 text-fuchsia-400',
    card: 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-400',
    border: 'border-l-fuchsia-500',
    loopExpanded: 'bg-fuchsia-500/10 border-fuchsia-500/40',
    loopCollapsed: 'bg-fuchsia-500/5 hover:bg-fuchsia-500/10',
  },
  sky: {
    iconBg: 'bg-sky-500/20 text-sky-400',
    card: 'bg-sky-500/20 border-sky-500/50 text-sky-400',
    border: 'border-l-sky-500',
    loopExpanded: 'bg-sky-500/10 border-sky-500/40',
    loopCollapsed: 'bg-sky-500/5 hover:bg-sky-500/10',
  },
};

const DEFAULT_CLASSES = COLOR_CLASSES['gray'];

@Injectable({ providedIn: 'root' })
export class ActionMetadataService {
  private appData = inject(AppDataService);

  /** Action metadata from AppDataService (loaded at app start) */
  readonly metadata = computed(() => this.appData.actionMetadata());

  /** Whether metadata has been loaded */
  readonly loaded = computed(() => this.appData.initialized());

  /** Get metadata for a specific action */
  getMetadata(actionType: string): ActionMetadata {
    const meta = this.metadata();
    return (
      meta[actionType] || {
        ...DEFAULT_METADATA,
        name: actionType,
        displayName: actionType,
      }
    );
  }

  /** Get Lucide icon name for an action */
  getIconName(actionType: string): string {
    return this.getMetadata(actionType).icon;
  }

  /** Get description for an action */
  getDescription(actionType: string): string {
    return this.getMetadata(actionType).description;
  }

  /** Get color for an action */
  getColor(actionType: string): string {
    return this.getMetadata(actionType).color;
  }

  /** Get the color classes object for an action */
  private getClasses(actionType: string): typeof DEFAULT_CLASSES {
    const color = this.getColor(actionType);
    return COLOR_CLASSES[color] || DEFAULT_CLASSES;
  }

  /** Get icon background classes */
  getIconBgClasses(actionType: string): string {
    return this.getClasses(actionType).iconBg;
  }

  /** Get card color classes */
  getColorClasses(actionType: string): string {
    return this.getClasses(actionType).card;
  }

  /** Get border classes */
  getBorderClasses(actionType: string): string {
    return this.getClasses(actionType).border;
  }

  /** Get loop expanded classes */
  getLoopExpandedClasses(actionType: string): string {
    return this.getClasses(actionType).loopExpanded;
  }

  /** Get loop collapsed classes */
  getLoopCollapsedClasses(actionType: string): string {
    return this.getClasses(actionType).loopCollapsed;
  }
}
