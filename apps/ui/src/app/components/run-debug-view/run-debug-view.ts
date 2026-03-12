import {
  Component,
  input,
  signal,
  effect,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RunHistoryItem } from '@scrape-dojo/shared';
import { ScrapeService } from '../../services/scrape.service';
import { ArtifactViewerComponent, DisplayArtifact } from '../artifact-viewer';
import { StoreService } from '../../store/store.service';

@Component({
  selector: 'app-run-debug-view',
  standalone: true,
  imports: [CommonModule, ArtifactViewerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div
      class="h-full flex flex-col bg-dojo-surface border border-dojo-border rounded-md overflow-hidden relative"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-4 py-2 border-b border-dojo-border bg-dojo-surface-2"
      >
        <div class="flex items-center gap-2">
          <iconify-icon
            icon="lucide:eye"
            class="w-4 h-4 text-dojo-accent"
          ></iconify-icon>
          <span class="text-sm font-medium text-dojo-text">Artifacts</span>
        </div>
        @if (artifacts().length > 0) {
          <span
            class="text-xs px-2 py-1 bg-dojo-accent/10 text-dojo-accent rounded"
          >
            {{ artifacts().length }} Artifact{{
              artifacts().length > 1 ? 's' : ''
            }}
          </span>
        }
      </div>

      <!-- Content Container -->
      <div class="flex-1 overflow-y-auto">
        @if (!run()) {
          <div
            class="absolute inset-0 flex items-center justify-center bg-dojo-surface"
          >
            <div class="text-center text-dojo-text-muted">
              <iconify-icon
                icon="lucide:mouse-pointer-click"
                width="96"
                height="96"
                class="mx-auto mb-4"
              ></iconify-icon>
              <p class="text-sm">Select a workflow run to view artifacts</p>
            </div>
          </div>
        } @else if (isLoading()) {
          <div
            class="absolute inset-0 flex items-center justify-center bg-dojo-surface"
          >
            <div class="text-center text-dojo-text-muted">
              <iconify-icon
                icon="lucide:loader-2"
                width="64"
                height="64"
                class="mx-auto mb-4 animate-spin text-dojo-accent"
              ></iconify-icon>
              <p class="text-sm">Loading artifacts...</p>
            </div>
          </div>
        } @else {
          <div class="p-4 space-y-4">
            @if (artifacts().length > 0) {
              @for (artifact of artifacts(); track $index) {
                <app-artifact-viewer
                  [artifact]="artifact"
                ></app-artifact-viewer>
              }
            } @else {
              <div class="text-center text-dojo-text-muted py-8">
                <iconify-icon
                  icon="lucide:package-open"
                  width="48"
                  height="48"
                  class="mx-auto mb-3"
                ></iconify-icon>
                <p class="text-sm">No artifacts for this run</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class RunDebugViewComponent {
  run = input<RunHistoryItem | null>(null);

  private scrapeService = inject(ScrapeService);
  private store = inject(StoreService);
  private destroyRef = inject(DestroyRef);
  isLoading = signal(false);
  private lastLoadedRunId: string | null = null;

  // Reaktives Signal für Artifacts - liest direkt aus dem Store entities Signal
  artifacts = computed(() => {
    const currentRun = this.run();
    if (!currentRun?.id) return [];

    // Greife direkt auf das entities Signal zu für korrekte Reaktivität
    const allRuns = this.store.runs.entities();
    const storeRun = allRuns.find((r) => r.id === currentRun.id);
    return (storeRun?.artifacts || []) as DisplayArtifact[];
  });

  constructor() {
    effect(() => {
      const currentRun = this.run();
      if (currentRun && this.lastLoadedRunId !== currentRun.id) {
        this.lastLoadedRunId = currentRun.id;
        this.loadArtifacts(currentRun.id);
      }
    });
  }

  private loadArtifacts(runId: string) {
    // Prüfe ob bereits Artifacts im Store gecacht sind
    const cachedArtifacts = this.store.runs.getArtifacts(runId);
    if (cachedArtifacts.length > 0) {
      return;
    }

    this.isLoading.set(true);

    this.scrapeService
      .getRunArtifacts(runId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (artifacts) => {
          if (artifacts && artifacts.length > 0) {
            this.store.runs.cacheArtifacts(runId, artifacts);
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load artifacts:', err);
          this.isLoading.set(false);
        },
      });
  }
}
