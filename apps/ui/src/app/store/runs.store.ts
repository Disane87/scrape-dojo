import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  RunHistoryItem,
  ScrapeEvent,
  RunStepItem,
  RunActionItem,
} from '@scrape-dojo/shared';
import { ScrapeService } from '../services/scrape.service';
import { EntityStore } from './entity-store.base';
import { ScrapesStore } from './scrapes.store';

/**
 * Store für Run-History
 * Verwaltet alle Workflow-Ausführungen
 */
@Injectable({ providedIn: 'root' })
export class RunsStore extends EntityStore<RunHistoryItem> {
  private scrapeService = inject(ScrapeService);
  private scrapesStore = inject(ScrapesStore);

  constructor() {
    super({
      storeName: 'Runs',
      loadFn: async () => {
        return firstValueFrom(this.scrapeService.getRuns(undefined, 50));
      },
      eventTypes: [
        'scrape-start',
        'scrape-end',
        'scrape-complete',
        'step-start',
        'step-complete',
        'step-status',
        'action-start',
        'action-complete',
        'action-status',
        'loop-iteration',
        'error',
      ],
    });
  }

  /**
   * Debug-Daten für einen Run cachen
   */
  cacheDebugData(runId: string, debugData: any): void {
    this.updateWith(runId, (run) => ({
      ...run,
      debugData,
    }));
  }

  /**
   * Debug-Daten für einen Run abrufen
   */
  getDebugData(runId: string): any | null {
    const run = this.getById(runId)();
    return run?.debugData || null;
  }

  /**
   * Artifacts für einen Run cachen (ersetzt existierende)
   */
  cacheArtifacts(runId: string, artifacts: any[]): void {
    this.updateWith(runId, (run) => ({
      ...run,
      artifacts,
    }));
  }

  /**
   * Ein einzelnes Artifact zu einem Run hinzufügen (vermeidet Duplikate)
   */
  addArtifact(runId: string, artifact: any): void {
    this.updateWith(runId, (run) => {
      const existingArtifacts = run.artifacts || [];

      // Prüfe auf Duplikate basierend auf title oder name
      const isDuplicate = existingArtifacts.some((a) => {
        if (artifact.title && a.title) return a.title === artifact.title;
        if (artifact.name && a.name) return a.name === artifact.name;
        // Fallback: Vergleiche JSON wenn möglich
        return JSON.stringify(a) === JSON.stringify(artifact);
      });

      if (isDuplicate) {
        console.log(
          `⚠️ Artifact already exists, skipping:`,
          artifact.title || artifact.name,
        );
        return run;
      }

      return {
        ...run,
        artifacts: [...existingArtifacts, artifact],
      };
    });
  }

  /**
   * Artifacts für einen Run abrufen
   */
  getArtifacts(runId: string): any[] {
    const run = this.getById(runId)();
    return run?.artifacts || [];
  }

  /**
   * Run-History laden und Scrapes synchronisieren
   */
  override async load(): Promise<void> {
    await super.load();
    this.syncScrapesWithLatestRuns();
    await this.reconnectRunningJobs();
  }

  /**
   * Laufende Jobs beim Start wiederherstellen
   */
  private async reconnectRunningJobs(): Promise<void> {
    const runningRuns = this.entities().filter(
      (run) => run.status === 'running',
    );

    if (runningRuns.length === 0) {
      console.log('✅ No running jobs to reconnect');
      return;
    }

    console.log(`🔄 Reconnecting ${runningRuns.length} running job(s)...`);

    for (const run of runningRuns) {
      try {
        // Hole aktuellen Status vom Server
        const updatedRun = await firstValueFrom(
          this.scrapeService.getRun(run.id),
        );

        // Aktualisiere Run im Store
        this.update(updatedRun.id, updatedRun);

        // Wenn immer noch running, aktualisiere auch Scrape-Status
        if (updatedRun.status === 'running') {
          console.log(
            `✅ Reconnected to running job: ${run.id} (${run.scrapeId})`,
          );

          // Aktualisiere Scrape-Status auf "running"
          this.scrapesStore.update(updatedRun.scrapeId, {
            lastRun: {
              status: 'running',
              startTime: updatedRun.startTime,
              runId: updatedRun.id,
            },
          } as any);
        } else {
          console.log(
            `ℹ️ Job ${run.id} is no longer running (${updatedRun.status})`,
          );

          // Aktualisiere Scrape mit finalem Status
          this.scrapesStore.update(updatedRun.scrapeId, {
            lastRun: {
              status: updatedRun.status === 'success' ? 'completed' : 'failed',
              startTime: updatedRun.startTime,
              endTime: updatedRun.endTime,
              runId: updatedRun.id,
            },
          } as any);
        }
      } catch (error) {
        console.error(`❌ Failed to reconnect job ${run.id}:`, error);
      }
    }
  }

  /**
   * SSE Event verarbeiten
   */
  override handleEvent(event: ScrapeEvent): void {
    // scrape-start/-end Events brauchen kein runId zu Beginn
    switch (event.type) {
      case 'scrape-start':
        this.handleScrapeStart(event);
        return;

      case 'scrape-end':
      case 'scrape-complete':
        this.handleScrapeEnd(event);
        return;
    }

    const runId = event.runId;
    if (!runId) return;

    switch (event.type) {
      case 'step-start':
      case 'step-complete':
      case 'step-status':
        this.handleStepEvent(runId, event);
        break;

      case 'action-start':
      case 'action-complete':
      case 'action-status':
        this.handleActionEvent(runId, event);
        break;

      case 'loop-iteration':
        this.handleLoopIteration(runId, event);
        break;

      case 'error':
        this.handleError(runId, event);
        break;
    }
  }

  /**
   * Scrape-Start: Neuen Run hinzufügen oder existierenden aktualisieren
   */
  private handleScrapeStart(event: ScrapeEvent): void {
    if (!event.runId || !event.scrapeId) return;

    const existingRun = this.getById(event.runId)();

    if (existingRun) {
      // Run existiert bereits, aktualisiere Status
      this.updateWith(event.runId, (run) => ({
        ...run,
        status: 'running',
        startTime: event.timestamp || Date.now(),
      }));
    } else {
      // Neuen Run hinzufügen - Struktur wird vom Backend oder reconnect geladen
      const scrape = this.scrapesStore.getById(event.scrapeId)();

      const newRun: RunHistoryItem = {
        id: event.runId,
        scrapeId: event.scrapeId,
        status: 'running',
        trigger: 'manual',
        startTime: event.timestamp || Date.now(),
        steps: scrape?.stepsCount
          ? this.createEmptySteps(scrape.stepsCount)
          : [],
      };

      this.add(newRun);
      console.log('➕ New run added to store:', event.runId);
    }
  }

  /**
   * Erstellt leere Step-Struktur für neuen Run
   */
  private createEmptySteps(count: number): RunStepItem[] {
    return Array.from({ length: count }, (_, i) => ({
      name: `Step ${i + 1}`,
      status: 'pending',
      actions: [],
    }));
  }

  /**
   * Scrape-End: Run-Status aktualisieren und Daten laden
   */
  private handleScrapeEnd(event: ScrapeEvent): void {
    if (!event.runId) return;

    const status = event.error ? 'failed' : 'success';

    this.updateWith(event.runId, (run) => ({
      ...run,
      status,
      endTime: event.timestamp || Date.now(),
      error: event.error,
    }));

    console.log(`✅ Run ${event.runId} ${status}`);

    // Nach erfolgreichem Abschluss: Lade Debug-Daten und Artifacts
    if (status === 'success' && event.scrapeId) {
      this.loadRunData(event.runId, event.scrapeId);
    }
  }

  /**
   * Lädt Debug-Daten und Artifacts für einen Run
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async loadRunData(runId: string, scrapeId: string): Promise<void> {
    try {
      // Debug-Daten laden
      const debugData = await firstValueFrom(
        this.scrapeService.getRunDebugData(runId),
      );
      if (debugData) {
        this.cacheDebugData(runId, debugData);
        console.log(`📊 Debug data loaded for run ${runId}`);
      }

      // Artifacts laden
      const artifacts = (await firstValueFrom(
        this.scrapeService.getRunArtifacts(runId),
      )) as any[];
      if (artifacts && artifacts.length > 0) {
        this.cacheArtifacts(runId, artifacts);
        console.log(`📦 ${artifacts.length} artifacts loaded for run ${runId}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load run data for ${runId}:`, error);
    }
  }

  /**
   * Step-Events verarbeiten
   */
  private handleStepEvent(runId: string, event: ScrapeEvent): void {
    if (!event.stepName) return;

    this.updateWith(runId, (run) => ({
      ...run,
      steps: run.steps?.map((step) => {
        if (step.name !== event.stepName) return step;

        const updates: Partial<RunStepItem> = {};

        if (event.type === 'step-start' || event.status === 'running') {
          updates.status = 'running';
          updates.startTime = Date.now();
        } else if (
          event.type === 'step-complete' ||
          event.status === 'completed'
        ) {
          updates.status = 'success';
          updates.endTime = Date.now();
        } else if (event.status === 'error') {
          updates.status = 'failed';
          updates.endTime = Date.now();
        }

        return { ...step, ...updates };
      }),
    }));
  }

  /**
   * Action-Events verarbeiten
   */
  private handleActionEvent(runId: string, event: ScrapeEvent): void {
    if (!event.stepName || !event.actionName) return;

    this.updateWith(runId, (run) => ({
      ...run,
      steps: run.steps?.map((step) => {
        if (step.name !== event.stepName) return step;

        return {
          ...step,
          actions: step.actions?.map((action) => {
            if (action.name !== event.actionName) return action;

            const updates: Partial<RunActionItem> = {};

            if (event.type === 'action-start' || event.status === 'running') {
              updates.status = 'running';
              updates.startTime = Date.now();
            } else if (
              event.type === 'action-complete' ||
              event.status === 'completed'
            ) {
              updates.status = 'success';
              updates.endTime = Date.now();
              if (event.data || event.result) {
                const result = event.data ?? event.result;
                updates.result = result;
                // Artifacts werden nicht mehr hier hinzugefügt - sie werden nach Scrape-Ende
                // via loadRunData() geladen, um Duplikate zu vermeiden
              }
            } else if (event.status === 'error') {
              updates.status = 'failed';
              updates.endTime = Date.now();
              if (event.error) {
                updates.error = event.error;
              }
            } else if (event.status === 'skipped') {
              updates.status = 'success'; // skipped wird als success behandelt
              updates.endTime = Date.now();
            }

            // Loop-Iterationen abschließen - aber nur wenn sie existieren!
            if (
              updates.status &&
              (updates.status === 'success' || updates.status === 'failed')
            ) {
              const loopIterations = action.loopIterations;
              if (loopIterations && loopIterations.length > 0) {
                const lastIteration = loopIterations[loopIterations.length - 1];
                if (lastIteration.status === 'running') {
                  updates.loopIterations = loopIterations.map((it, idx) =>
                    idx === loopIterations.length - 1
                      ? {
                          ...it,
                          status: updates.status as 'success' | 'failed',
                          endTime: Date.now(),
                        }
                      : it,
                  );
                }
              }
            }

            // WICHTIG: Überschreibe Loop-Daten NICHT wenn die Action ein Loop ist
            if (action.actionType === 'loop') {
              // Bewahre loopCurrent und loopTotal
              if (!updates.loopCurrent && action.loopCurrent)
                updates.loopCurrent = action.loopCurrent;
              if (!updates.loopTotal && action.loopTotal)
                updates.loopTotal = action.loopTotal;
              if (!updates.loopIterations && action.loopIterations)
                updates.loopIterations = action.loopIterations;
            }

            return { ...action, ...updates };
          }),
        };
      }),
    }));

    // Bei Action-Fehler auch Step als failed markieren
    if (event.status === 'error') {
      this.handleStepEvent(runId, { ...event, status: 'error' });
    }
  }

  /**
   * Loop-Iteration Event verarbeiten
   */
  private handleLoopIteration(runId: string, event: ScrapeEvent): void {
    if (!event.loopName) {
      console.warn('⚠️ Loop iteration event without loopName:', event);
      return;
    }

    const loopName = event.loopName;
    const loopIndex = event.loopIndex ?? 0;
    const loopTotal = event.loopTotal ?? 0;
    const loopValue = event.loopValue;
    const loopPath = event.loopPath || [];
    const iterationStatus = event.status || 'running';

    console.log('🔄 Store: Loop iteration:', {
      loopName,
      loopIndex,
      loopTotal,
      loopValue,
      loopPath,
      iterationStatus,
      runId,
    });

    const run = this.entities().find((r) => r.id === runId);
    if (!run) {
      console.error('❌ Run not found for loop iteration:', runId);
      return;
    }

    console.log('📊 Current run:', run);

    this.updateWith(runId, (run) => ({
      ...run,
      steps: run.steps?.map((step) => ({
        ...step,
        actions: this.updateActionsWithLoopIteration(
          step.actions || [],
          loopName,
          loopIndex,
          loopTotal,
          loopValue,
          loopPath,
          0,
          iterationStatus,
        ),
      })),
    }));

    // Log updated run
    const updatedRun = this.entities().find((r) => r.id === runId);
    console.log('✅ Updated run:', updatedRun);
  }

  /**
   * Rekursiv Actions durchsuchen und Loop-Iterationen aktualisieren
   */
  private updateActionsWithLoopIteration(
    actions: RunActionItem[],
    loopName: string,
    loopIndex: number,
    loopTotal: number,
    loopValue?: any,
    loopPath: Array<{ name: string; index: number }> = [],
    currentDepth: number = 0,
    iterationStatus: string = 'running',
  ): RunActionItem[] {
    console.log(
      `🔍 updateActionsWithLoopIteration: depth=${currentDepth}, loopName="${loopName}", status=${iterationStatus}, loopPath=`,
      loopPath,
      'actions count=',
      actions.length,
    );

    // Map status to UI status
    const uiStatus =
      iterationStatus === 'completed'
        ? 'success'
        : iterationStatus === 'failed'
          ? 'failed'
          : 'running';

    return actions.map((action) => {
      // Ziel-Loop gefunden
      if (currentDepth === loopPath.length && action.name === loopName) {
        console.log(
          `🎯 Found target loop: ${loopName}, actionType: ${action.actionType}, status: ${iterationStatus}`,
        );

        const iterations = [...(action.loopIterations || [])];
        console.log(`📝 Current iterations:`, iterations);

        // Existierende Iteration aktualisieren
        const existingIdx = iterations.findIndex(
          (it) => it.index === loopIndex,
        );
        if (existingIdx >= 0) {
          console.log(
            `✏️ Updating existing iteration at index ${existingIdx} to status: ${uiStatus}`,
          );
          iterations[existingIdx] = {
            ...iterations[existingIdx],
            status: uiStatus as 'running' | 'success' | 'failed',
            value: loopValue,
            endTime:
              iterationStatus === 'completed' || iterationStatus === 'failed'
                ? Date.now()
                : iterations[existingIdx].endTime,
          };
        } else if (iterationStatus === 'running') {
          // Nur neue Iteration hinzufügen wenn Status "running" ist
          // Vorherige Iteration abschließen
          if (iterations.length > 0) {
            const lastIdx = iterations.length - 1;
            if (iterations[lastIdx].status === 'running') {
              console.log(
                `✅ Completing previous iteration at index ${lastIdx}`,
              );
              iterations[lastIdx] = {
                ...iterations[lastIdx],
                status: 'success',
                endTime: Date.now(),
              };
            }
          }

          // Neue Iteration hinzufügen
          const childActionsTemplate =
            action.nestedActions?.map((na) => ({
              ...na,
              status: 'pending' as const,
              loopIterations: na.actionType === 'loop' ? [] : undefined,
            })) || [];

          console.log(
            `➕ Adding new iteration ${loopIndex}/${loopTotal}, value: ${loopValue}`,
          );
          iterations.push({
            index: loopIndex,
            value: loopValue,
            status: 'running',
            startTime: Date.now(),
            childActions: childActionsTemplate,
          });
        }

        const updatedAction = {
          ...action,
          loopIterations: iterations,
          loopTotal,
          loopCurrent: loopIndex + 1,
        };

        console.log(`🔄 Updated action:`, updatedAction);

        return updatedAction;
      }

      // Parent-Loop traversieren
      if (
        currentDepth < loopPath.length &&
        action.name === loopPath[currentDepth].name
      ) {
        console.log(`🔗 Traversing parent loop: ${action.name}`);
        const parentIterationIndex = loopPath[currentDepth].index;

        const updatedNestedActions = this.updateActionsWithLoopIteration(
          action.nestedActions || [],
          loopName,
          loopIndex,
          loopTotal,
          loopValue,
          loopPath,
          currentDepth + 1,
          iterationStatus,
        );

        const updatedIterations = (action.loopIterations || []).map(
          (iteration) => {
            if (iteration.index === parentIterationIndex) {
              return {
                ...iteration,
                childActions: this.updateActionsWithLoopIteration(
                  iteration.childActions || [],
                  loopName,
                  loopIndex,
                  loopTotal,
                  loopValue,
                  loopPath,
                  currentDepth + 1,
                  iterationStatus,
                ),
              };
            }
            return iteration;
          },
        );

        return {
          ...action,
          nestedActions: updatedNestedActions,
          loopIterations: updatedIterations,
        };
      }

      return action;
    });
  }

  /**
   * Error Event verarbeiten
   */
  private handleError(runId: string, event: ScrapeEvent): void {
    if (event.stepName && event.actionName) {
      // Action-Fehler
      this.handleActionEvent(runId, { ...event, status: 'error' });
    } else if (event.stepName) {
      // Step-Fehler
      this.handleStepEvent(runId, { ...event, status: 'error' });
    }
  }

  /**
   * Scrapes mit den neuesten Runs synchronisieren
   */
  private syncScrapesWithLatestRuns(): void {
    const runs = this._entities();
    const latestByScrap = new Map<string, RunHistoryItem>();

    // Finde den neuesten Run pro Scrape
    for (const run of runs) {
      const existing = latestByScrap.get(run.scrapeId);
      if (!existing || run.startTime > existing.startTime) {
        latestByScrap.set(run.scrapeId, run);
      }
    }

    // Aktualisiere Scrapes
    latestByScrap.forEach((run, scrapeId) => {
      this.scrapesStore.updateLastRunFromHistory(scrapeId, {
        status: run.status === 'success' ? 'completed' : run.status,
        startTime: run.startTime,
        endTime: run.endTime,
      });
    });
  }

  /**
   * Runs eines bestimmten Scrapes
   */
  getRunsByScrapeId(scrapeId: string) {
    return this.filter((run) => run.scrapeId === scrapeId);
  }

  /**
   * Letzten Run eines Scrapes holen
   */
  getLatestRunForScrape(scrapeId: string) {
    return this.filter((run) => run.scrapeId === scrapeId);
  }

  /**
   * Step-Status in einem Run aktualisieren
   */
  updateStepStatus(
    runId: string,
    stepName: string,
    status: 'pending' | 'running' | 'success' | 'failed',
    startTime?: number,
    endTime?: number,
  ): void {
    this.updateWith(runId, (run) => ({
      ...run,
      steps: run.steps?.map((step) =>
        step.name === stepName
          ? {
              ...step,
              status,
              startTime: startTime ?? step.startTime,
              endTime: endTime ?? step.endTime,
            }
          : step,
      ),
    }));
  }

  /**
   * Action-Status in einem Run aktualisieren
   */
  updateActionStatus(
    runId: string,
    stepName: string,
    actionName: string,
    status: 'pending' | 'running' | 'success' | 'failed',
    startTime?: number,
    endTime?: number,
    result?: any,
    error?: string,
  ): void {
    this.updateWith(runId, (run) => ({
      ...run,
      steps: run.steps?.map((step) => {
        if (step.name !== stepName) return step;
        return {
          ...step,
          actions: step.actions?.map((action) => {
            if (action.name !== actionName) return action;

            // Bei Loop-Actions: Letzte Iteration abschließen
            let loopIterations = action.loopIterations;
            if (
              loopIterations &&
              loopIterations.length > 0 &&
              (status === 'success' || status === 'failed')
            ) {
              const lastIteration = loopIterations[loopIterations.length - 1];
              if (lastIteration.status === 'running') {
                loopIterations = loopIterations.map((it, idx) =>
                  idx === loopIterations!.length - 1
                    ? {
                        ...it,
                        status: status as 'success' | 'failed',
                        endTime: Date.now(),
                      }
                    : it,
                );
              }
            }

            return {
              ...action,
              status,
              startTime: startTime ?? action.startTime,
              endTime: endTime ?? action.endTime,
              result: result ?? action.result,
              error: error ?? action.error,
              loopIterations,
            };
          }),
        };
      }),
    }));
  }
}
