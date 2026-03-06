vi.mock('@jsverse/transloco', () => ({
  TranslocoService: class {},
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DateLocalizationService } from './date-localization.service';

describe('DateLocalizationService', () => {
  let service: DateLocalizationService;
  let mockTranslocoService: { getActiveLang: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockTranslocoService = {
      getActiveLang: vi.fn().mockReturnValue('en'),
    };

    service = Object.create(DateLocalizationService.prototype);
    (service as any).translocoService = mockTranslocoService;
  });

  describe('formatDate', () => {
    it('should return empty string for falsy value', () => {
      expect(service.formatDate(null as any)).toBe('');
      expect(service.formatDate(undefined as any)).toBe('');
      expect(service.formatDate('' as any)).toBe('');
      expect(service.formatDate(0 as any)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(service.formatDate('not-a-date')).toBe('');
    });

    it('should format a Date object', () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      const result = service.formatDate(date);
      expect(result).toBeTruthy();
      expect(result).toContain('2025');
    });

    it('should format with custom options', () => {
      const date = new Date(2025, 0, 15);
      const result = service.formatDate(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(result).toContain('January');
      expect(result).toContain('2025');
    });

    it('should use German locale when language is de', () => {
      mockTranslocoService.getActiveLang.mockReturnValue('de');
      const date = new Date(2025, 0, 15);
      const result = service.formatDate(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(result).toContain('Januar');
      expect(result).toContain('2025');
    });

    it('should format a number timestamp', () => {
      const timestamp = new Date(2025, 0, 15).getTime();
      const result = service.formatDate(timestamp);
      expect(result).toBeTruthy();
      expect(result).toContain('2025');
    });

    it('should format a string date', () => {
      const result = service.formatDate('2025-01-15');
      expect(result).toBeTruthy();
      expect(result).toContain('2025');
    });
  });

  describe('formatDateTime', () => {
    it('should return empty string for falsy value', () => {
      expect(service.formatDateTime(null as any)).toBe('');
      expect(service.formatDateTime(undefined as any)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(service.formatDateTime('invalid')).toBe('');
    });

    it('should format a datetime with default options', () => {
      const date = new Date(2025, 0, 15, 14, 30);
      const result = service.formatDateTime(date);
      expect(result).toBeTruthy();
      expect(result).toContain('2025');
      // Should include time portion
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatTime', () => {
    it('should return empty string for falsy value', () => {
      expect(service.formatTime(null as any)).toBe('');
      expect(service.formatTime(undefined as any)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(service.formatTime('invalid')).toBe('');
    });

    it('should format time', () => {
      const date = new Date(2025, 0, 15, 14, 30);
      const result = service.formatTime(date);
      expect(result).toBeTruthy();
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatRelativeTime', () => {
    it('should return empty string for falsy value', () => {
      expect(service.formatRelativeTime(null as any)).toBe('');
      expect(service.formatRelativeTime(undefined as any)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(service.formatRelativeTime('invalid')).toBe('');
    });

    it('should return "just now" for recent timestamps', () => {
      const recent = new Date(Date.now() - 10000); // 10 seconds ago
      expect(service.formatRelativeTime(recent)).toBe('just now');
    });

    it('should return German relative time for recent timestamps', () => {
      mockTranslocoService.getActiveLang.mockReturnValue('de');
      const recent = new Date(Date.now() - 10000);
      expect(service.formatRelativeTime(recent)).toBe('gerade eben');
    });

    it('should return minutes ago for timestamps within the hour', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60000);
      expect(service.formatRelativeTime(fiveMinAgo)).toBe('5 min ago');
    });

    it('should return hours ago for timestamps within the day', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600000);
      expect(service.formatRelativeTime(threeHoursAgo)).toBe('3 hrs ago');
    });

    it('should return formatted date for old timestamps (>7 days)', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);
      const result = service.formatRelativeTime(twoWeeksAgo);
      // Should be a formatted date, not a relative string
      expect(result).toBeTruthy();
      expect(result).not.toContain('ago');
      expect(result).not.toBe('just now');
    });
  });
});
