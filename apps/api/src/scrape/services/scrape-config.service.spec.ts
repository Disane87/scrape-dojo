import { vi } from 'vitest';
import { ScrapeConfigService } from './scrape-config.service';
import * as fs from 'fs';

vi.mock('fs');

vi.mock('comment-json', () => ({
  parse: (text: string) => JSON.parse(text),
}));

/** Helper to create mock Dirent objects */
function mockDirent(name: string, isDir = false): fs.Dirent {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    path: '',
    parentPath: '',
  } as fs.Dirent;
}

describe('ScrapeConfigService', () => {
  let service: ScrapeConfigService;

  beforeEach(() => {
    service = new ScrapeConfigService();
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loadScrapeDefinitions', () => {
    it('should return empty array when sites directory does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const result = service.loadScrapeDefinitions();
      expect(result).toEqual([]);
    });

    it('should load scrapes from JSON files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        mockDirent('test.json'),
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify([{ id: 'test-1', metadata: {}, steps: [] }]),
      );

      const result = service.loadScrapeDefinitions();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-1');
    });

    it('should load scrapes from object with scrapes property', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        mockDirent('test.jsonc'),
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ scrapes: [{ id: 's1', metadata: {}, steps: [] }] }),
      );

      const result = service.loadScrapeDefinitions();
      expect(result).toHaveLength(1);
    });

    it('should skip files with invalid structure', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        mockDirent('bad.json'),
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ notScrapes: true }),
      );

      const result = service.loadScrapeDefinitions();
      expect(result).toEqual([]);
    });

    it('should handle parse errors gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        mockDirent('invalid.json'),
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue('not valid json {{{');

      const result = service.loadScrapeDefinitions();
      expect(result).toEqual([]);
    });

    it('should filter only .json and .jsonc files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        mockDirent('a.json'),
        mockDirent('b.jsonc'),
        mockDirent('c.txt'),
        mockDirent('d.yaml'),
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([]));

      service.loadScrapeDefinitions();
      expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });

    it('should handle files that return empty scrapes array', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        mockDirent('empty.json'),
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([]));

      const result = service.loadScrapeDefinitions();
      expect(result).toEqual([]);
    });

    it('should handle scrapes property that is not an array', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        mockDirent('bad-scrapes.json'),
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ scrapes: 'not-an-array' }),
      );

      const result = service.loadScrapeDefinitions();
      expect(result).toEqual([]);
    });

    it('should merge scrapes from multiple files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        mockDirent('a.json'),
        mockDirent('b.json'),
      ] as any);
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(JSON.stringify([{ id: 'scrape-1', steps: [] }]))
        .mockReturnValueOnce(JSON.stringify([{ id: 'scrape-2', steps: [] }]));

      const result = service.loadScrapeDefinitions();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('scrape-1');
      expect(result[1].id).toBe('scrape-2');
    });

    it('should warn about duplicate scrape IDs', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        mockDirent('dupes.json'),
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify([
          { id: 'dup', steps: [] },
          { id: 'dup', steps: [] },
        ]),
      );

      // Should not throw, just warn
      const result = service.loadScrapeDefinitions();
      expect(result).toHaveLength(2);
    });

    it('should sort files alphabetically', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        mockDirent('z.json'),
        mockDirent('a.json'),
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([]));

      service.loadScrapeDefinitions();

      // readFileSync called for a.json first (sorted), then z.json
      const calls = vi.mocked(fs.readFileSync).mock.calls;
      expect(calls[0][0]).toContain('a.json');
      expect(calls[1][0]).toContain('z.json');
    });

    it('should recursively load scrapes from subdirectories', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync)
        .mockReturnValueOnce([
          mockDirent('root.json'),
          mockDirent('e-commerce', true),
        ] as any)
        .mockReturnValueOnce([mockDirent('amazon.json')] as any);
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(
          JSON.stringify([{ id: 'scrape-a', metadata: {}, steps: [] }]),
        )
        .mockReturnValueOnce(
          JSON.stringify([{ id: 'scrape-b', metadata: {}, steps: [] }]),
        );

      const result = service.loadScrapeDefinitions();
      expect(result).toHaveLength(2);
    });

    it('should use folder name as category when not defined in config', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync)
        .mockReturnValueOnce([mockDirent('shopping', true)] as any)
        .mockReturnValueOnce([mockDirent('store.json')] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify([{ id: 'store-1', metadata: {}, steps: [] }]),
      );

      const result = service.loadScrapeDefinitions();
      expect(result).toHaveLength(1);
      expect(result[0].metadata.category).toBe('shopping');
    });

    it('should not override existing category from config', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync)
        .mockReturnValueOnce([mockDirent('shopping', true)] as any)
        .mockReturnValueOnce([mockDirent('store.json')] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify([
          { id: 'store-1', metadata: { category: 'Custom' }, steps: [] },
        ]),
      );

      const result = service.loadScrapeDefinitions();
      expect(result[0].metadata.category).toBe('Custom');
    });

    it('should use nested folder path as category', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync)
        .mockReturnValueOnce([mockDirent('shopping', true)] as any)
        .mockReturnValueOnce([mockDirent('europe', true)] as any)
        .mockReturnValueOnce([mockDirent('store.json')] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify([{ id: 'store-eu', metadata: {}, steps: [] }]),
      );

      const result = service.loadScrapeDefinitions();
      expect(result[0].metadata.category).toBe('shopping / europe');
    });
  });

  describe('getSitesPath', () => {
    it('should return the sites path', () => {
      const result = service.getSitesPath();
      expect(result).toContain('config');
      expect(result).toContain('sites');
    });
  });

  describe('ensureSitesDirectory', () => {
    it('should create directory if not exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);

      service.ensureSitesDirectory();

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), {
        recursive: true,
      });
    });

    it('should not create directory if exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      service.ensureSitesDirectory();

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('private formatSiteConfigError', () => {
    it('should format error with file path', () => {
      const result = (service as any).formatSiteConfigError(
        'test.json',
        new Error('Parse error'),
      );
      expect(result).toContain('Parse error');
      expect(result).toContain('test.json');
    });

    it('should include line and column when error has them', () => {
      const error = new Error('Syntax error') as any;
      error.line = 5;
      error.column = 10;
      const result = (service as any).formatSiteConfigError('test.json', error);
      expect(result).toContain('5');
      expect(result).toContain('10');
    });

    it('should handle error with position and file content', () => {
      const error = new Error('Unexpected token') as any;
      error.position = 15;
      error.fileContent = '{\n  "id": "test",\n  bad-json\n}';
      error.filePath = '/path/to/test.json';

      const result = (service as any).formatSiteConfigError('test.json', error);
      expect(result).toContain('Unexpected token');
    });

    it('should handle non-Error objects', () => {
      const result = (service as any).formatSiteConfigError(
        'test.json',
        'string error',
      );
      expect(result).toContain('string error');
    });
  });

  describe('private coerceNumber', () => {
    it('should return number for valid number', () => {
      expect((service as any).coerceNumber(5)).toBe(5);
    });

    it('should return number for valid string number', () => {
      expect((service as any).coerceNumber('42')).toBe(42);
    });

    it('should return undefined for non-numeric string', () => {
      expect((service as any).coerceNumber('abc')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect((service as any).coerceNumber('')).toBeUndefined();
    });

    it('should return undefined for NaN', () => {
      expect((service as any).coerceNumber(NaN)).toBeUndefined();
    });

    it('should return undefined for Infinity', () => {
      expect((service as any).coerceNumber(Infinity)).toBeUndefined();
    });

    it('should return undefined for null/undefined', () => {
      expect((service as any).coerceNumber(null)).toBeUndefined();
      expect((service as any).coerceNumber(undefined)).toBeUndefined();
    });
  });

  describe('private resolveLineColumnFromPosition', () => {
    it('should return line and column from existing values', () => {
      const result = (service as any).resolveLineColumnFromPosition(
        'content',
        undefined,
        3,
        5,
      );
      expect(result).toEqual({ line: 3, column: 5 });
    });

    it('should return undefined when no position and no line/column', () => {
      const result = (service as any).resolveLineColumnFromPosition(
        'content',
        undefined,
        undefined,
        undefined,
      );
      expect(result).toBeUndefined();
    });

    it('should resolve position to line and column', () => {
      const content = 'line1\nline2\nline3';
      const result = (service as any).resolveLineColumnFromPosition(
        content,
        8,
        undefined,
        undefined,
      );
      // Position 8 is 'i' in 'line2' -> line 2, column 3
      expect(result.line).toBe(2);
      expect(result.column).toBe(3);
    });

    it('should clamp position to content length', () => {
      const content = 'short';
      const result = (service as any).resolveLineColumnFromPosition(
        content,
        1000,
        undefined,
        undefined,
      );
      expect(result).toBeDefined();
      expect(result.line).toBe(1);
    });

    it('should handle position 0', () => {
      const content = 'hello';
      const result = (service as any).resolveLineColumnFromPosition(
        content,
        0,
        undefined,
        undefined,
      );
      expect(result).toEqual({ line: 1, column: 1 });
    });
  });

  describe('private getLineExcerpt', () => {
    it('should return the correct line', () => {
      const content = 'line1\nline2\nline3';
      expect((service as any).getLineExcerpt(content, 2)).toBe('line2');
    });

    it('should handle line number beyond content', () => {
      const content = 'only one line';
      const result = (service as any).getLineExcerpt(content, 999);
      expect(result).toBe('only one line');
    });

    it('should truncate long lines', () => {
      const longLine = 'a'.repeat(300);
      const result = (service as any).getLineExcerpt(longLine, 1);
      expect(result.length).toBeLessThanOrEqual(240);
      expect(result).toContain('...');
    });
  });

  describe('private getCaretLine', () => {
    it('should return caret at correct position', () => {
      expect((service as any).getCaretLine(1)).toBe('^');
      expect((service as any).getCaretLine(5)).toBe('    ^');
    });

    it('should clamp column to valid range', () => {
      const result = (service as any).getCaretLine(0);
      expect(result).toBe('^'); // Clamped to 1
    });
  });
});
