import { vi } from 'vitest';
import { ScrapeConfigService } from './scrape-config.service';
import * as fs from 'fs';

vi.mock('fs');

vi.mock('comment-json', () => ({
  parse: (text: string) => JSON.parse(text),
}));

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
      vi.mocked(fs.readdirSync).mockReturnValue(['test.json'] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify([{ id: 'test-1', metadata: {}, steps: [] }]),
      );

      const result = service.loadScrapeDefinitions();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-1');
    });

    it('should load scrapes from object with scrapes property', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['test.jsonc'] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ scrapes: [{ id: 's1', metadata: {}, steps: [] }] }),
      );

      const result = service.loadScrapeDefinitions();
      expect(result).toHaveLength(1);
    });

    it('should skip files with invalid structure', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['bad.json'] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ notScrapes: true }),
      );

      const result = service.loadScrapeDefinitions();
      expect(result).toEqual([]);
    });

    it('should handle parse errors gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['invalid.json'] as any);
      vi.mocked(fs.readFileSync).mockReturnValue('not valid json {{{');

      const result = service.loadScrapeDefinitions();
      expect(result).toEqual([]);
    });

    it('should filter only .json and .jsonc files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'a.json',
        'b.jsonc',
        'c.txt',
        'd.yaml',
      ] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([]));

      service.loadScrapeDefinitions();
      expect(fs.readFileSync).toHaveBeenCalledTimes(2);
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
});
