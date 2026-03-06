vi.mock('@jsverse/transloco', () => ({
  TranslocoService: class {},
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocaleDatePipe } from './locale-date.pipe';

describe('LocaleDatePipe', () => {
  let pipe: LocaleDatePipe;
  let mockTranslocoService: { getActiveLang: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockTranslocoService = {
      getActiveLang: vi.fn().mockReturnValue('en'),
    };

    pipe = Object.create(LocaleDatePipe.prototype);
    (pipe as any).translocoService = mockTranslocoService;
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return empty string for invalid date string', () => {
    expect(pipe.transform('not-a-date')).toBe('');
  });

  it('should format a Date object', () => {
    const date = new Date(2025, 0, 15); // Jan 15, 2025
    const result = pipe.transform(date);
    expect(result).toBeTruthy();
    expect(result).toContain('2025');
  });

  it('should format a number timestamp', () => {
    const timestamp = new Date(2025, 0, 15).getTime();
    const result = pipe.transform(timestamp);
    expect(result).toBeTruthy();
    expect(result).toContain('2025');
  });

  it('should format a string date', () => {
    const result = pipe.transform('2025-01-15');
    expect(result).toBeTruthy();
    expect(result).toContain('2025');
  });

  it('should use German locale when language is de', () => {
    mockTranslocoService.getActiveLang.mockReturnValue('de');
    const date = new Date(2025, 0, 15); // January 15, 2025
    const result = pipe.transform(date, 'long');
    expect(result).toContain('Januar');
  });

  it('should format with short style', () => {
    const date = new Date(2025, 0, 15);
    const result = pipe.transform(date, 'short');
    expect(result).toBeTruthy();
    expect(result).toContain('2025');
  });

  it('should format with medium style', () => {
    const date = new Date(2025, 0, 15);
    const result = pipe.transform(date, 'medium');
    expect(result).toBeTruthy();
    expect(result).toContain('2025');
  });

  it('should format with long style', () => {
    const date = new Date(2025, 0, 15);
    const result = pipe.transform(date, 'long');
    expect(result).toBeTruthy();
    expect(result).toContain('2025');
  });

  it('should format with full style', () => {
    const date = new Date(2025, 0, 15);
    const result = pipe.transform(date, 'full');
    expect(result).toBeTruthy();
    expect(result).toContain('2025');
  });

  it('should include time when includeTime is true', () => {
    const date = new Date(2025, 0, 15, 14, 30, 0);
    const result = pipe.transform(date, 'medium', true);
    expect(result).toBeTruthy();
    // Time portion should be included - check for colon separator typical in time
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});
