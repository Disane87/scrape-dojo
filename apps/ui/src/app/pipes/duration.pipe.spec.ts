import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DurationPipe } from './duration.pipe';

describe('DurationPipe', () => {
  let pipe: DurationPipe;

  beforeEach(() => {
    pipe = new DurationPipe();
  });

  it('should format milliseconds for durations under 1 second', () => {
    expect(pipe.transform(1000, 1500)).toBe('500ms');
  });

  it('should format seconds for durations of 1 second or more', () => {
    expect(pipe.transform(1000, 3500)).toBe('2.5s');
  });

  it('should format minutes worth of seconds', () => {
    // 2 minutes = 120 seconds
    expect(pipe.transform(0, 120000)).toBe('120.0s');
  });

  it('should format hours worth of seconds', () => {
    // 1 hour = 3600 seconds
    expect(pipe.transform(0, 3600000)).toBe('3600.0s');
  });

  it('should handle zero duration', () => {
    expect(pipe.transform(1000, 1000)).toBe('0ms');
  });

  it('should use Date.now when end is not provided', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 5000);

    const result = pipe.transform(now);
    expect(result).toBe('5.0s');

    vi.restoreAllMocks();
  });
});
