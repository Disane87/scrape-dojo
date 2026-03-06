import { Component, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RunActionItem, LoopIteration } from '@scrape-dojo/shared';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-action-tree',
  standalone: true,
  imports: [CommonModule, ActionTreeComponent, TranslocoModule],
  templateUrl: './action-tree.html',
})
export class ActionTreeComponent {
  private transloco = inject(TranslocoService);

  actions = input.required<RunActionItem[]>();
  runId = input.required<string>();
  stepName = input.required<string>();
  depth = input<number>(0);

  // Track expanded states
  expandedActions = signal<Set<string>>(new Set());
  expandedLoops = signal<Set<string>>(new Set());
  expandedIterations = signal<Set<string>>(new Set());

  // Helper methods
  isLoopAction(action: RunActionItem): boolean {
    return action.actionType === 'loop';
  }

  hasLoopIterations(action: RunActionItem): boolean {
    return (
      action.loopIterations !== undefined && action.loopIterations.length > 0
    );
  }

  hasActionData(action: RunActionItem): boolean {
    return action.result !== undefined && action.result !== null;
  }

  // Toggle methods
  toggleAction(actionName: string): void {
    const key = `${this.runId()}-${this.stepName()}-${actionName}-${this.depth()}`;
    const current = new Set(this.expandedActions());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.expandedActions.set(current);
  }

  isActionExpanded(actionName: string): boolean {
    return this.expandedActions().has(
      `${this.runId()}-${this.stepName()}-${actionName}-${this.depth()}`,
    );
  }

  toggleLoop(actionName: string): void {
    const key = `${this.runId()}-${this.stepName()}-${actionName}-loop-${this.depth()}`;
    const current = new Set(this.expandedLoops());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.expandedLoops.set(current);
  }

  isLoopExpanded(actionName: string): boolean {
    return this.expandedLoops().has(
      `${this.runId()}-${this.stepName()}-${actionName}-loop-${this.depth()}`,
    );
  }

  toggleIteration(actionName: string, iterationIndex: number): void {
    const key = `${this.runId()}-${this.stepName()}-${actionName}-iter-${iterationIndex}-${this.depth()}`;
    const current = new Set(this.expandedIterations());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.expandedIterations.set(current);
  }

  isIterationExpanded(actionName: string, iterationIndex: number): boolean {
    return this.expandedIterations().has(
      `${this.runId()}-${this.stepName()}-${actionName}-iter-${iterationIndex}-${this.depth()}`,
    );
  }

  // Progress helpers
  getLoopProgress(action: RunActionItem): number {
    if (!action.loopTotal || action.loopTotal === 0) return 0;
    return ((action.loopCurrent || 0) / action.loopTotal) * 100;
  }

  getCompletedIterations(action: RunActionItem): number {
    if (!action.loopIterations) return 0;
    return action.loopIterations.filter((it) => it.status === 'success').length;
  }

  getIterationStatusIcon(iteration: LoopIteration): string {
    switch (iteration.status) {
      case 'success':
        return '✓';
      case 'failed':
        return '✗';
      case 'running':
        return '●';
      default:
        return '○';
    }
  }

  getIterationStatusClass(iteration: LoopIteration): string {
    switch (iteration.status) {
      case 'success':
        return 'text-dojo-success';
      case 'failed':
        return 'text-dojo-danger';
      case 'running':
        return 'text-dojo-warning animate-pulse';
      default:
        return 'text-dojo-text-subtle';
    }
  }

  hasChildActions(iteration: LoopIteration): boolean {
    return (
      iteration.childActions !== undefined && iteration.childActions.length > 0
    );
  }

  // Format helpers
  formatDuration(start: number, end?: number): string {
    const duration = (end || Date.now()) - start;
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  }

  getResultPreview(result: unknown): string {
    if (result === null) return this.transloco.translate('common.preview.null');
    if (result === undefined)
      return this.transloco.translate('common.preview.undefined');
    if (typeof result === 'string') {
      if (result.length > 50) return result.substring(0, 50) + '...';
      return result;
    }
    if (typeof result === 'number' || typeof result === 'boolean') {
      return String(result);
    }
    if (Array.isArray(result)) {
      return this.transloco.translate('common.preview.array', {
        count: result.length,
      });
    }
    if (typeof result === 'object') {
      const keys = Object.keys(result);
      const preview = `${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`;
      return this.transloco.translate('common.preview.object', {
        keys: preview,
      });
    }
    return String(result);
  }

  isFilePath(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return (
      value.startsWith('./') || value.startsWith('/') || /^[A-Z]:\\/.test(value)
    );
  }

  isUrl(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('file://')
    );
  }

  getDepthPadding(): string {
    const depth = this.depth();
    return `pl-${Math.min(depth * 2, 8)}`;
  }
}
