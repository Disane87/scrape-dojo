import { Component, input, signal, effect, computed, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RunHistoryItem } from '@scrape-dojo/shared';
import { ScrapeService } from '../../services/scrape.service';
import { ArtifactViewerComponent, DisplayArtifact } from '../artifact-viewer';
import { StoreService } from '../../store/store.service';

declare const monaco: typeof import('monaco-editor');

@Component({
    selector: 'app-run-debug-view',
    standalone: true,
    imports: [CommonModule, ArtifactViewerComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    template: `
        <div class="h-full flex flex-col bg-dojo-surface border border-dojo-border rounded-md overflow-hidden relative">
            <!-- Header -->
            <div class="flex items-center justify-between px-4 py-2 border-b border-dojo-border bg-dojo-surface-2">
                <div class="flex items-center gap-2">
                    <iconify-icon icon="lucide:bug" class="w-4 h-4 text-dojo-accent"></iconify-icon>
                    <span class="text-sm font-medium text-dojo-text">Debug Data & Artifacts</span>
                </div>
                <div class="flex items-center gap-2">
                    @if (artifacts().length > 0) {
                    <span class="text-xs px-2 py-1 bg-dojo-accent/10 text-dojo-accent rounded">
                        {{ artifacts().length }} Artifact{{ artifacts().length > 1 ? 's' : '' }}
                    </span>
                    }
                    @if (run()) {
                    <button 
                        class="text-xs px-2 py-1 bg-dojo-accent text-white rounded hover:bg-dojo-accent-strong transition-colors"
                        (click)="copyToClipboard()">
                        <iconify-icon icon="lucide:copy" class="w-3 h-3"></iconify-icon>
                    </button>
                    }
                </div>
            </div>
            
            <!-- Content Container -->
            <div class="flex-1 overflow-y-auto">
                @if (!run()) {
                <div class="absolute inset-0 flex items-center justify-center bg-dojo-surface">
                    <div class="text-center text-dojo-text-muted">
                        <iconify-icon icon="lucide:mouse-pointer-click" width="96" height="96" class="mx-auto mb-4"></iconify-icon>
                        <p class="text-sm">Select a workflow run to view debug data</p>
                    </div>
                </div>
                } @else if (isLoading()) {
                <div class="absolute inset-0 flex items-center justify-center bg-dojo-surface">
                    <div class="text-center text-dojo-text-muted">
                        <iconify-icon icon="lucide:loader-2" width="64" height="64" class="mx-auto mb-4 animate-spin text-dojo-accent"></iconify-icon>
                        <p class="text-sm">Loading debug data...</p>
                    </div>
                </div>
                } @else {
                <div class="p-4 space-y-4">
                    <!-- Artifacts Section -->
                    @if (artifacts().length > 0) {
                    <div>
                        <h3 class="text-sm font-semibold text-dojo-text-muted uppercase tracking-wide mb-3">Artifacts</h3>
                        @for (artifact of artifacts(); track $index) {
                        <app-artifact-viewer [artifact]="artifact"></app-artifact-viewer>
                        }
                    </div>
                    }

                    <!-- Raw Debug Data Section -->
                    <div class="space-y-3">
                        <h3 class="text-sm font-semibold text-dojo-text-muted uppercase tracking-wide">Raw Debug Data</h3>
                        @if (monacoLoaded()) {
                        <div id="run-debug-editor" class="min-h-100 border border-dojo-border rounded"></div>
                        } @else {
                        <pre class="min-h-100 border border-dojo-border rounded bg-dojo-surface p-3 text-xs text-dojo-text overflow-auto whitespace-pre-wrap wrap-break-word">{{ rawDebugText() }}</pre>
                        }
                    </div>
                </div>
                }
            </div>
        </div>
    `,
    styles: [`
        :host {
            display: block;
            height: 100%;
        }
    `]
})
export class RunDebugViewComponent implements AfterViewInit, OnDestroy {
    run = input<RunHistoryItem | null>(null);
    
    private scrapeService = inject(ScrapeService);
    private store = inject(StoreService);
    private destroyRef = inject(DestroyRef);
    private editor: import('monaco-editor').editor.IStandaloneCodeEditor | null = null;
    private destroyed = false;
    monacoLoaded = signal(false);
    private monacoFailed = signal(false);
    rawDebugText = signal('{}');
    isLoading = signal(false);
    private lastLoadedRunId: string | null = null;
    
    // Reaktives Signal für Artifacts - liest direkt aus dem Store entities Signal
    artifacts = computed(() => {
        const currentRun = this.run();
        if (!currentRun?.id) return [];
        
        // Greife direkt auf das entities Signal zu für korrekte Reaktivität
        const allRuns = this.store.runs.entities();
        const storeRun = allRuns.find(r => r.id === currentRun.id);
        return (storeRun?.artifacts || []) as DisplayArtifact[];
    });
    
    constructor() {
        effect(() => {
            const currentRun = this.run();
            const isViewerReady = this.monacoLoaded() || this.monacoFailed();
            console.log('🔍 Debug view effect:', { runId: currentRun?.id, isViewerReady, lastLoaded: this.lastLoadedRunId });
            
            if (currentRun && isViewerReady) {
                // Nur laden wenn es ein anderer Run ist
                if (this.lastLoadedRunId !== currentRun.id) {
                    this.lastLoadedRunId = currentRun.id;
                    console.log('📊 Loading debug data for run:', currentRun.id);
                    this.loadDebugData(currentRun);
                }
            }
        });
    }
    
    async ngAfterViewInit() {
        try {
            await this.loadMonaco();
            if (this.destroyed) return;
            this.initEditor();
            this.monacoLoaded.set(!!this.editor);
        } catch (error) {
            console.warn('⚠️ Monaco could not be loaded, falling back to plain text viewer.', error);
            this.monacoFailed.set(true);
            this.monacoLoaded.set(false);
        }
        
        if (this.run()) {
            this.loadDebugData(this.run()!);
        }
    }
    
    ngOnDestroy() {
        this.destroyed = true;
        this.editor?.dispose();
    }
    
    private async loadMonaco(): Promise<void> {
        if ((window as any).monaco) return;
        
        return new Promise((resolve, reject) => {
            const loaderScript = document.createElement('script');
            loaderScript.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
            
            loaderScript.onload = () => {
                (window as any).require.config({
                    paths: {
                        'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
                    }
                });
                
                (window as any).require(['vs/editor/editor.main'], () => {
                    resolve();
                });
            };
            
            loaderScript.onerror = reject;
            document.head.appendChild(loaderScript);
        });
    }
    
    private initEditor() {
        const container = document.getElementById('run-debug-editor');
        if (!container || !(window as any).monaco) return;
        
        // Define custom theme
        monaco.editor.defineTheme('dojo-debug', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#1a1b26',
                'editor.foreground': '#a9b1d6',
            }
        });
        
        this.editor = monaco.editor.create(container, {
            value: '{}',
            language: 'json',
            theme: 'dojo-debug',
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 13,
            lineNumbers: 'on',
            folding: true,
            formatOnPaste: true,
            formatOnType: true
        });
    }
    
    private loadDebugData(run: RunHistoryItem) {
        if (!run.id) return;
        
        // Prüfe ob Debug-Daten bereits gecacht sind
        const cachedDebugData = this.store.runs.getDebugData(run.id);
        if (cachedDebugData) {
            console.log('📦 Using cached debug data for run', run.id);
            this.displayDebugData(cachedDebugData);
            
            // Artifacts separat laden
            this.loadArtifacts(run.id);
            return;
        }
        
        // Lade Debug-Daten vom Server
        this.isLoading.set(true);
        
        this.scrapeService.getRunDebugData(run.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (debugData) => {
                // Cache debug data im Store
                this.store.runs.cacheDebugData(run.id, debugData);
                
                this.displayDebugData(debugData);
                
                // Artifacts separat laden
                this.loadArtifacts(run.id);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load debug data:', err);
                this.displayDebugData({});
                this.isLoading.set(false);
            }
        });
    }

    private loadArtifacts(runId: string) {
        // Prüfe ob bereits Artifacts im Store gecacht sind
        const cachedArtifacts = this.store.runs.getArtifacts(runId);
        if (cachedArtifacts.length > 0) {
            console.log('📦 Using cached artifacts for run', runId, cachedArtifacts.length);
            return; // Artifacts sind bereits im Store, computed Signal wird sie anzeigen
        }
        
        console.log('📥 Loading artifacts for run', runId);
        
        // Lade Artifacts vom Server und speichere im Store
        this.scrapeService.getRunArtifacts(runId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (artifacts) => {
                if (artifacts && artifacts.length > 0) {
                    // Cache artifacts im Store - das computed Signal reagiert automatisch
                    this.store.runs.cacheArtifacts(runId, artifacts);
                    console.log('📥 Loaded and cached artifacts for run', runId, artifacts.length);
                } else {
                    console.log('📭 No artifacts found for run', runId);
                }
            },
            error: (err) => {
                console.error('Failed to load artifacts:', err);
            }
        });
    }

    private displayDebugData(debugData: any): void {
        const formattedJson = JSON.stringify(debugData ?? {}, null, 2);
        this.rawDebugText.set(formattedJson);

        if (this.editor) {
            // Show raw JSON in editor (artifacts are loaded separately now)
            this.editor.setValue(formattedJson);
        }
    }
    
    async copyToClipboard() {
        const content = this.editor ? this.editor.getValue() : this.rawDebugText();
        try {
            await navigator.clipboard.writeText(content);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }
}
