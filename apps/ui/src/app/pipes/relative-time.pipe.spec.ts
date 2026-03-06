vi.mock('@jsverse/transloco', () => ({
  TranslocoService: class {},
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  let pipe: RelativeTimePipe;
  let mockTranslocoService: { getActiveLang: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockTranslocoService = {
      getActiveLang: vi.fn().mockReturnValue('en'),
    };

    pipe = Object.create(RelativeTimePipe.prototype);
    (pipe as any).translocoService = mockTranslocoService;
  });

  describe('English locale', () => {
    const now = 1700000000000;

    it('should return "just now" for less than 60 seconds ago', () => {
      const timestamp = now - 30 * 1000; // 30 seconds ago
      expect(pipe.transform(timestamp, now)).toBe('just now');
    });

    it('should return minutes ago', () => {
      const timestamp = now - 2 * 60 * 1000; // 2 minutes ago
      expect(pipe.transform(timestamp, now)).toBe('2m ago');
    });

    it('should return hours ago', () => {
      const timestamp = now - 3 * 60 * 60 * 1000; // 3 hours ago
      expect(pipe.transform(timestamp, now)).toBe('3h ago');
    });

    it('should return "yesterday" for 1 day ago', () => {
      const timestamp = now - 24 * 60 * 60 * 1000; // 1 day ago
      expect(pipe.transform(timestamp, now)).toBe('yesterday');
    });

    it('should return days ago for 2-6 days', () => {
      const timestamp = now - 3 * 24 * 60 * 60 * 1000; // 3 days ago
      expect(pipe.transform(timestamp, now)).toBe('3d ago');
    });

    it('should return formatted date for 7+ days ago', () => {
      const timestamp = now - 10 * 24 * 60 * 60 * 1000; // 10 days ago
      const result = pipe.transform(timestamp, now);
      // Should be a formatted date like MM/DD
      expect(result).toMatch(/\d{2}\/\d{2}/);
    });
  });

  describe('German locale', () => {
    const now = 1700000000000;

    beforeEach(() => {
      mockTranslocoService.getActiveLang.mockReturnValue('de');
    });

    it('should return "gerade eben" for less than 60 seconds ago', () => {
      const timestamp = now - 10 * 1000;
      expect(pipe.transform(timestamp, now)).toBe('gerade eben');
    });

    it('should return German minutes format', () => {
      const timestamp = now - 5 * 60 * 1000;
      expect(pipe.transform(timestamp, now)).toBe('vor 5 Min.');
    });

    it('should return German hours format', () => {
      const timestamp = now - 2 * 60 * 60 * 1000;
      expect(pipe.transform(timestamp, now)).toBe('vor 2 Std.');
    });

    it('should return "gestern" for 1 day ago', () => {
      const timestamp = now - 24 * 60 * 60 * 1000;
      expect(pipe.transform(timestamp, now)).toBe('gestern');
    });

    it('should return German days format', () => {
      const timestamp = now - 4 * 24 * 60 * 60 * 1000;
      expect(pipe.transform(timestamp, now)).toBe('vor 4 Tagen');
    });

    it('should return German formatted date for 7+ days ago', () => {
      const timestamp = now - 10 * 24 * 60 * 60 * 1000;
      const result = pipe.transform(timestamp, now);
      // German date format DD.MM
      expect(result).toMatch(/\d{2}\.\d{2}/);
    });
  });
});
