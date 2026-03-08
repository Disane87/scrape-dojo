import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  effect,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  inject,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { TranslocoModule } from '@jsverse/transloco';
import 'iconify-icon';

declare const monaco: typeof import('monaco-editor');

// 🥋 Dojo Dark Theme - Deep blacks with warm orange accents
const DOJO_DARK_THEME: import('monaco-editor').editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Comments - subtle warm gray
    { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },

    // Strings - warm orange
    { token: 'string', foreground: 'fb923c' },
    { token: 'string.key.json', foreground: 'f5f5f5' },
    { token: 'string.value.json', foreground: 'fb923c' },

    // Numbers - gold
    { token: 'number', foreground: 'eab308' },

    // Keywords - red
    { token: 'keyword', foreground: 'ef4444' },
    { token: 'keyword.json', foreground: 'ef4444' },

    // Types - purple
    { token: 'type', foreground: 'a855f7' },

    // Variables - light text
    { token: 'variable', foreground: 'f5f5f5' },

    // Operators - muted
    { token: 'delimiter', foreground: 'a3a3a3' },
    { token: 'delimiter.bracket', foreground: 'a3a3a3' },

    // Constants
    { token: 'constant', foreground: 'f97316' },
  ],
  colors: {
    // Editor background
    'editor.background': '#0a0a0a',
    'editor.foreground': '#f5f5f5',

    // Line numbers
    'editorLineNumber.foreground': '#525252',
    'editorLineNumber.activeForeground': '#a3a3a3',

    // Cursor & selection
    'editorCursor.foreground': '#fb923c',
    'editor.selectionBackground': '#fb923c33',
    'editor.inactiveSelectionBackground': '#fb923c22',

    // Current line
    'editor.lineHighlightBackground': '#1f1f1f',
    'editor.lineHighlightBorder': '#00000000',

    // Indentation guides
    'editorIndentGuide.background': '#262626',
    'editorIndentGuide.activeBackground': '#404040',

    // Bracket matching
    'editorBracketMatch.background': '#fb923c33',
    'editorBracketMatch.border': '#fb923c',

    // Scrollbar
    'scrollbarSlider.background': '#33333380',
    'scrollbarSlider.hoverBackground': '#404040',
    'scrollbarSlider.activeBackground': '#525252',

    // Minimap
    'minimap.background': '#0a0a0a',

    // Widget (autocomplete, etc)
    'editorWidget.background': '#141414',
    'editorWidget.border': '#333333',
    'editorSuggestWidget.background': '#141414',
    'editorSuggestWidget.border': '#333333',
    'editorSuggestWidget.selectedBackground': '#fb923c33',

    // Find/Replace
    'editor.findMatchBackground': '#fb923c44',
    'editor.findMatchHighlightBackground': '#fb923c22',

    // Overview ruler
    'editorOverviewRuler.border': '#00000000',
  },
};

// ☀️ Dojo Light Theme - Warm paper tones with orange accents
const DOJO_LIGHT_THEME: import('monaco-editor').editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    // Comments - warm gray
    { token: 'comment', foreground: '78716c', fontStyle: 'italic' },

    // Strings - deep orange
    { token: 'string', foreground: 'c2410c' },
    { token: 'string.key.json', foreground: '1c1917' },
    { token: 'string.value.json', foreground: 'c2410c' },

    // Numbers - amber
    { token: 'number', foreground: 'a16207' },

    // Keywords - red
    { token: 'keyword', foreground: 'dc2626' },
    { token: 'keyword.json', foreground: 'dc2626' },

    // Types - purple
    { token: 'type', foreground: '7c3aed' },

    // Variables - dark text
    { token: 'variable', foreground: '1c1917' },

    // Operators - muted
    { token: 'delimiter', foreground: '57534e' },
    { token: 'delimiter.bracket', foreground: '57534e' },

    // Constants
    { token: 'constant', foreground: 'ea580c' },
  ],
  colors: {
    // Editor background - warm paper
    'editor.background': '#fafaf9',
    'editor.foreground': '#1c1917',

    // Line numbers
    'editorLineNumber.foreground': '#a8a29e',
    'editorLineNumber.activeForeground': '#57534e',

    // Cursor & selection
    'editorCursor.foreground': '#ea580c',
    'editor.selectionBackground': '#ea580c33',
    'editor.inactiveSelectionBackground': '#ea580c22',

    // Current line
    'editor.lineHighlightBackground': '#f5f5f4',
    'editor.lineHighlightBorder': '#00000000',

    // Indentation guides
    'editorIndentGuide.background': '#e7e5e4',
    'editorIndentGuide.activeBackground': '#d6d3d1',

    // Bracket matching
    'editorBracketMatch.background': '#ea580c33',
    'editorBracketMatch.border': '#ea580c',

    // Scrollbar
    'scrollbarSlider.background': '#d6d3d180',
    'scrollbarSlider.hoverBackground': '#a8a29e',
    'scrollbarSlider.activeBackground': '#78716c',

    // Minimap
    'minimap.background': '#fafaf9',

    // Widget (autocomplete, etc)
    'editorWidget.background': '#f5f5f4',
    'editorWidget.border': '#d6d3d1',
    'editorSuggestWidget.background': '#f5f5f4',
    'editorSuggestWidget.border': '#d6d3d1',
    'editorSuggestWidget.selectedBackground': '#ea580c22',

    // Find/Replace
    'editor.findMatchBackground': '#ea580c44',
    'editor.findMatchHighlightBackground': '#ea580c22',

    // Overview ruler
    'editorOverviewRuler.border': '#00000000',
  },
};

@Component({
  selector: 'app-json-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './json-editor.html',
  styleUrl: './json-editor.scss',
  host: {
    class: 'block h-full',
  },
})
export class JsonEditorComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private themeService = inject(ThemeService);
  private editor: import('monaco-editor').editor.IStandaloneCodeEditor | null =
    null;
  private editorContainer: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private initTimeout: ReturnType<typeof setTimeout> | null = null;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;
  private themesRegistered = false;
  private editorReady = signal(false);

  @Input()
  set data(value: unknown) {
    this._data.set(value);
    if (this.editor && !this.isEditing()) {
      const json = JSON.stringify(value, null, 2);
      if (this.editor.getValue() !== json) {
        this.editor.setValue(json);
      }
    }
  }

  @Input() readOnly = true;
  @Input() showMinimap = false;
  @Input() fileName = 'config.jsonc';
  @Input() schema: any = null;

  @Output() dataChange = new EventEmitter<unknown>();
  @Output() validationError = new EventEmitter<string | null>();

  private _data = signal<unknown>(null);

  isEditing = signal(false);
  hasChanges = signal(false);
  error = signal<string | null>(null);
  copied = signal(false);
  isLoading = signal(true);
  wordWrap = signal(false);

  constructor() {
    // React to theme changes - must be in constructor for injection context
    effect(() => {
      const theme = this.themeService.resolvedTheme();
      const ready = this.editorReady();
      if (ready) {
        this.updateEditorTheme(theme);
      }
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadMonaco();
    }
  }

  ngOnDestroy() {
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
      this.initTimeout = null;
    }
    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
      this.copiedTimeout = null;
    }
    this.resizeObserver?.disconnect();
    this.editor?.dispose();
  }

  private async loadMonaco() {
    this.isLoading.set(true);

    // Dynamically load Monaco
    if (typeof window !== 'undefined') {
      // @ts-expect-error - Monaco loader
      if (!window.monaco) {
        await this.loadMonacoScript();
      }

      // Wait a tick for container to be ready
      this.initTimeout = setTimeout(() => {
        this.initTimeout = null;
        this.initEditor();
        this.isLoading.set(false);
      }, 100);
    }
  }

  private loadMonacoScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      // @ts-expect-error - monaco is loaded dynamically via script tag
      if (window.monaco) {
        resolve();
        return;
      }

      // Use AMD loader
      const loaderScript = document.createElement('script');
      loaderScript.src =
        'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
      loaderScript.onload = () => {
        // @ts-expect-error - AMD require
        window.require.config({
          paths: {
            vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
          },
        });

        // @ts-expect-error - AMD require
        window.require(['vs/editor/editor.main'], () => {
          resolve();
        });
      };
      loaderScript.onerror = reject;
      document.head.appendChild(loaderScript);
    });
  }

  private initEditor() {
    const container = document.getElementById('monaco-editor-container');
    if (!container) return;

    this.editorContainer = container;

    // Register custom themes
    if (!this.themesRegistered) {
      monaco.editor.defineTheme('dojo-dark', DOJO_DARK_THEME);
      monaco.editor.defineTheme('dojo-light', DOJO_LIGHT_THEME);
      this.themesRegistered = true;
    }

    // Get current theme
    const currentTheme =
      this.themeService.resolvedTheme() === 'dark' ? 'dojo-dark' : 'dojo-light';

    // Create editor
    this.editor = monaco.editor.create(container, {
      value: JSON.stringify(this._data(), null, 2),
      language: 'json',
      theme: currentTheme,
      readOnly: this.readOnly,
      automaticLayout: true,
      minimap: { enabled: this.showMinimap },
      scrollBeyondLastLine: false,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      wordWrap: this.wordWrap() ? 'on' : 'off',
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      padding: { top: 10, bottom: 10 },
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      formatOnPaste: true,
      formatOnType: true,
    });

    // Listen for changes
    this.editor.onDidChangeModelContent(() => {
      this.hasChanges.set(true);
      this.validateJson();
    });

    // Listen for focus
    this.editor.onDidFocusEditorText(() => {
      if (!this.readOnly) {
        this.isEditing.set(true);
      }
    });

    this.editor.onDidBlurEditorText(() => {
      this.isEditing.set(false);
    });

    // Configure JSON schema validation
    this.configureSchemaValidation();

    // Setup resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.editor?.layout();
    });
    this.resizeObserver.observe(container);

    // Mark editor as ready - this triggers the theme effect
    this.editorReady.set(true);
  }

  /**
   * Configures Monaco JSON diagnostics with the provided schema
   */
  private configureSchemaValidation() {
    if (!this.schema) return;

    try {
      // Access jsonDefaults via any cast - Monaco is loaded dynamically via CDN
      // and the type declarations mark this as deprecated, but it works at runtime
      const jsonLanguage = (monaco.languages as any).json;
      if (jsonLanguage?.jsonDefaults?.setDiagnosticsOptions) {
        jsonLanguage.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          schemas: [
            {
              uri: 'scrape-dojo://scrapes.schema.json',
              fileMatch: ['*'],
              schema: this.schema,
            },
          ],
          allowComments: true,
          trailingCommas: 'warning',
        });
      }
    } catch (e) {
      console.warn('Failed to configure JSON schema validation:', e);
    }
  }

  private validateJson() {
    if (!this.editor) return;

    const value = this.editor.getValue();
    try {
      JSON.parse(value);
      this.error.set(null);
      this.validationError.emit(null);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Invalid JSON';
      this.error.set(errorMsg);
      this.validationError.emit(errorMsg);
    }
  }

  formatDocument() {
    if (!this.editor) return;
    this.editor.getAction('editor.action.formatDocument')?.run();
  }

  toggleWordWrap() {
    this.wordWrap.update((v) => !v);
    this.editor?.updateOptions({
      wordWrap: this.wordWrap() ? 'on' : 'off',
    });
  }

  copyToClipboard() {
    if (!this.editor) return;

    const value = this.editor.getValue();
    navigator.clipboard.writeText(value).then(() => {
      this.copied.set(true);
      if (this.copiedTimeout) clearTimeout(this.copiedTimeout);
      this.copiedTimeout = setTimeout(() => {
        this.copiedTimeout = null;
        this.copied.set(false);
      }, 2000);
    });
  }

  expandAll() {
    if (!this.editor) return;
    this.editor.getAction('editor.unfoldAll')?.run();
  }

  collapseAll() {
    if (!this.editor) return;
    this.editor.getAction('editor.foldAll')?.run();
  }

  saveChanges() {
    if (!this.editor || this.error()) return;

    try {
      const parsed = JSON.parse(this.editor.getValue());
      this.dataChange.emit(parsed);
      this.hasChanges.set(false);
    } catch {
      // Already handled by validation
    }
  }

  discardChanges() {
    if (!this.editor) return;

    this.editor.setValue(JSON.stringify(this._data(), null, 2));
    this.hasChanges.set(false);
    this.error.set(null);
  }

  goToLine() {
    this.editor?.getAction('editor.action.gotoLine')?.run();
  }

  search() {
    this.editor?.getAction('actions.find')?.run();
  }

  private updateEditorTheme(theme: 'light' | 'dark') {
    if (!this.editor) return;
    const monacoTheme = theme === 'dark' ? 'dojo-dark' : 'dojo-light';
    monaco.editor.setTheme(monacoTheme);
  }
}
