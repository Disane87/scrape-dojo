import { Component, input, output, model, signal, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RunHistoryItem, RunActionItem, LoopIteration } from '@scrape-dojo/shared';
import { ActionTreeComponent } from '../action-tree/action-tree';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { DurationPipe } from '../../pipes/duration.pipe';
import 'iconify-icon';

export type StatusFilter = 'all' | 'running' | 'success' | 'failed';

@Component({
    selector: 'app-workflow-history',
    standalone: true,
    imports: [CommonModule, FormsModule, ActionTreeComponent, TranslocoModule, TimeAgoPipe, DurationPipe],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './workflow-history.html',
})
export class WorkflowHistoryComponent {
    private transloco = inject(TranslocoService);

    history = input.required<RunHistoryItem[]>();
    selectedRunId = input<string | null>(null);
    statusFilter = model<StatusFilter>('all');

    runSelected = output<string>();
    deleteRun = output<string>();
    deleteAllRuns = output<void>();

    // Track expanded steps and actions
    expandedSteps = signal<Set<string>>(new Set());
    expandedActions = signal<Set<string>>(new Set());

    selectRun(runId: string): void {
        this.runSelected.emit(runId);

        // Auto-expand running steps
        const run = this.history().find(r => r.id === runId);
        if (run?.steps) {
            const runningSteps = run.steps.filter(s => s.status === 'running');
            if (runningSteps.length > 0) {
                const expandedKeys = runningSteps.map(s => `${runId}-${s.name}`);
                this.expandedSteps.set(new Set(expandedKeys));
            }
        }
    }

    onDeleteRun(event: Event, runId: string): void {
        event.stopPropagation();
        this.deleteRun.emit(runId);
    }

    onDeleteAllRuns(): void {
        this.deleteAllRuns.emit();
    }

    toggleStep(runId: string, stepName: string): void {
        const key = `${runId}-${stepName}`;
        const current = new Set(this.expandedSteps());
        if (current.has(key)) {
            current.delete(key);
        } else {
            current.add(key);
        }
        this.expandedSteps.set(current);
    }

    isStepExpanded(runId: string, stepName: string): boolean {
        return this.expandedSteps().has(`${runId}-${stepName}`);
    }

    toggleAction(runId: string, stepName: string, actionName: string): void {
        const key = `${runId}-${stepName}-${actionName}`;
        const current = new Set(this.expandedActions());
        if (current.has(key)) {
            current.delete(key);
        } else {
            current.add(key);
        }
        this.expandedActions.set(current);
    }

    isActionExpanded(runId: string, stepName: string, actionName: string): boolean {
        return this.expandedActions().has(`${runId}-${stepName}-${actionName}`);
    }

    hasActionData(action: RunActionItem): boolean {
        return action.result !== undefined && action.result !== null;
    }

    isFilePath(value: unknown): boolean {
        if (typeof value !== 'string') return false;
        return value.startsWith('./') || value.startsWith('/') || /^[A-Z]:\\/.test(value);
    }

    isUrl(value: unknown): boolean {
        if (typeof value !== 'string') return false;
        return value.startsWith('http://') || value.startsWith('https://');
    }

    getResultPreview(result: unknown): string {
        if (result === null || result === undefined) return 'null';
        if (typeof result === 'string') {
            if (result.length > 50) return result.substring(0, 50) + '...';
            return result;
        }
        if (typeof result === 'number' || typeof result === 'boolean') {
            return String(result);
        }
        if (Array.isArray(result)) {
            return `Array[${result.length}]`;
        }
        if (typeof result === 'object') {
            const keys = Object.keys(result);
            return `Object{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
        }
        return String(result);
    }

    getResultType(result: unknown): string {
        if (result === null) return 'null';
        if (result === undefined) return 'undefined';
        if (Array.isArray(result)) return 'array';
        return typeof result;
    }

    // Loop-spezifische Methoden
    isLoopAction(action: RunActionItem): boolean {
        // Eine Action ist ein Loop wenn der actionType 'loop' ist
        return action.actionType === 'loop';
    }

    hasLoopIterations(action: RunActionItem): boolean {
        return action.loopIterations !== undefined && action.loopIterations.length > 0;
    }

    getLoopProgress(action: RunActionItem): number {
        if (!action.loopTotal || action.loopTotal === 0) return 0;
        return ((action.loopCurrent || 0) / action.loopTotal) * 100;
    }

    getCompletedIterations(action: RunActionItem): number {
        if (!action.loopIterations) return 0;
        return action.loopIterations.filter(it => it.status === 'success').length;
    }

    getIterationStatusIcon(iteration: LoopIteration): string {
        switch (iteration.status) {
            case 'success': return '✓';
            case 'failed': return '✗';
            case 'running': return '●';
            default: return '○';
        }
    }

    getIterationStatusClass(iteration: LoopIteration): string {
        switch (iteration.status) {
            case 'success': return 'text-dojo-success';
            case 'failed': return 'text-dojo-danger';
            case 'running': return 'text-dojo-warning animate-pulse';
            default: return 'text-dojo-text-subtle/50';
        }
    }

    toggleLoopExpanded(runId: string, stepName: string, actionName: string): void {
        const key = `${runId}-${stepName}-${actionName}-loop`;
        const current = new Set(this.expandedActions());
        if (current.has(key)) {
            current.delete(key);
        } else {
            current.add(key);
        }
        this.expandedActions.set(current);
    }

    isLoopExpanded(runId: string, stepName: string, actionName: string): boolean {
        return this.expandedActions().has(`${runId}-${stepName}-${actionName}-loop`);
    }

    getErrorType(error: string): 'http' | 'timeout' | 'other' {
        if (error.includes('Http failure response')) return 'http';
        if (error.toLowerCase().includes('timeout')) return 'timeout';
        return 'other';
    }

    getHttpErrorStatus(error: string): string {
        const statusMatch = error.match(/:\s*(\d{3})\s+/);
        if (statusMatch) {
            const code = statusMatch[1];

            const knownCodes = new Set(['400', '401', '403', '404', '500', '502', '503', '504']);
            if (knownCodes.has(code)) {
                return this.transloco.translate(`history.http_status.${code}`);
            }

            return this.transloco.translate('history.http_status.unknown', { code });
        }

        return this.transloco.translate('history.http_status.generic');
    }

    getHttpErrorMessage(error: string): string {
        const statusMatch = error.match(/:\s*(\d{3})\s+/);
        if (!statusMatch) return error;
        
        const code = statusMatch[1];
        const knownCodes = new Set(['400', '401', '403', '404', '500', '502', '503', '504']);
        if (knownCodes.has(code)) {
            return this.transloco.translate(`history.http_message.${code}`);
        }

        return this.transloco.translate('history.http_message.generic');
    }
}
