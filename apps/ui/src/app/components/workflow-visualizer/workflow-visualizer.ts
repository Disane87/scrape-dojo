import {
  Component,
  input,
  computed,
  signal,
  inject,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Scrape, ScrapeStep, ScrapeAction } from '@scrape-dojo/shared';
import { ActionMetadataService } from '../../services/action-metadata.service';
import { toIconify } from '../../utils/icon.utils';
import { TranslocoModule } from '@jsverse/transloco';
import 'iconify-icon';

interface VisualNode {
  id: string;
  type: 'step' | 'action' | 'loop';
  name: string;
  actionType?: string;
  params?: Record<string, unknown>;
  children?: VisualNode[];
  isExpanded?: boolean;
}

@Component({
  selector: 'app-workflow-visualizer',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './workflow-visualizer.html',
  host: {
    class: 'block h-full',
  },
})
export class WorkflowVisualizerComponent {
  private actionMetadata = inject(ActionMetadataService);

  protected readonly toIconify = toIconify;

  definition = input<Scrape | undefined>();

  expandedNodes = signal<Set<string>>(new Set(['step-0']));
  selectedNode = signal<string | null>(null);

  visualNodes = computed<VisualNode[]>(() => {
    const def = this.definition();
    if (!def?.steps) return [];

    return def.steps.map((step, stepIndex) => this.stepToNode(step, stepIndex));
  });

  private stepToNode(step: ScrapeStep, index: number): VisualNode {
    return {
      id: `step-${index}`,
      type: 'step',
      name: step.name || `Step ${index + 1}`,
      children: step.actions.map((action, actionIndex) =>
        this.actionToNode(action, `step-${index}`, actionIndex),
      ),
      isExpanded: this.expandedNodes().has(`step-${index}`),
    };
  }

  private actionToNode(
    action: ScrapeAction,
    parentId: string,
    index: number,
  ): VisualNode {
    const id = `${parentId}-action-${index}`;
    const isLoop = action.action === 'loop';

    const node: VisualNode = {
      id,
      type: isLoop ? 'loop' : 'action',
      name: action.name || action.action,
      actionType: action.action,
      params: action.params,
      isExpanded: this.expandedNodes().has(id),
    };

    // Process nested loop actions
    if (isLoop && action.params?.['actions']) {
      const nestedActions = action.params['actions'] as ScrapeAction[];
      node.children = nestedActions.map((nestedAction, nestedIndex) =>
        this.actionToNode(nestedAction, id, nestedIndex),
      );
    }

    return node;
  }

  toggleNode(nodeId: string): void {
    const current = this.expandedNodes();
    const newSet = new Set(current);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    this.expandedNodes.set(newSet);
  }

  selectNode(nodeId: string): void {
    this.selectedNode.set(this.selectedNode() === nodeId ? null : nodeId);
  }

  expandAll(): void {
    const allIds = new Set<string>();
    const collectIds = (nodes: VisualNode[]) => {
      for (const node of nodes) {
        allIds.add(node.id);
        if (node.children) {
          collectIds(node.children);
        }
      }
    };
    collectIds(this.visualNodes());
    this.expandedNodes.set(allIds);
  }

  collapseAll(): void {
    this.expandedNodes.set(new Set());
  }

  // Get Lucide icon name for an action type
  getActionIconName(actionType: string | undefined): string {
    if (!actionType) return 'Code';
    return this.actionMetadata.getIconName(actionType);
  }

  // Get action description
  getActionDescription(actionType: string | undefined): string {
    if (!actionType) return '';
    return this.actionMetadata.getMetadata(actionType).description;
  }

  getActionColor(actionType: string | undefined): string {
    if (!actionType)
      return 'bg-dojo-surface-2 border-dojo-border text-dojo-text-muted';
    return this.actionMetadata.getColorClasses(actionType);
  }

  getActionIconBg(actionType: string | undefined): string {
    if (!actionType) return 'bg-white/10 text-white/60';
    return this.actionMetadata.getIconBgClasses(actionType);
  }

  getActionCardClass(
    actionType: string | undefined,
    isLoop: boolean,
    isExpanded: boolean | undefined,
  ): string {
    const baseClass = 'bg-dojo-surface hover:bg-dojo-surface-2';

    // Get border color from metadata
    const borderColor = actionType
      ? this.actionMetadata.getBorderClasses(actionType)
      : 'border-l-dojo-border';

    if (isLoop) {
      const loopBase = isExpanded
        ? this.actionMetadata.getLoopExpandedClasses('loop')
        : this.actionMetadata.getLoopCollapsedClasses('loop');
      return `${loopBase} ${borderColor}`;
    }

    return `${baseClass} ${borderColor}`;
  }

  formatParamValue(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') {
      // Truncate long strings
      return value.length > 60 ? value.slice(0, 60) + '...' : value;
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `[${value.length} items]`;
      }
      return '{...}';
    }
    return String(value);
  }

  getImportantParams(
    params: Record<string, unknown> | undefined,
  ): Array<{ key: string; value: string }> {
    if (!params) return [];

    // Priority params to show
    const priorityKeys = [
      'url',
      'selector',
      'text',
      'message',
      'path',
      'filename',
      'expression',
      'elementKey',
      'condition',
    ];
    const result: Array<{ key: string; value: string }> = [];

    for (const key of priorityKeys) {
      if (params[key] !== undefined) {
        result.push({ key, value: this.formatParamValue(params[key]) });
      }
      if (result.length >= 2) break; // Show max 2 params
    }

    return result;
  }
}
