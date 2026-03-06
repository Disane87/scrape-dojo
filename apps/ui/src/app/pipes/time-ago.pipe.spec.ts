import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimeAgoPipe } from './time-ago.pipe';

describe('TimeAgoPipe', () => {
  let pipe: TimeAgoPipe;
  const fixedNow = 1700000000000;

  beforeEach(() => {
    pipe = new TimeAgoPipe();
    vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return "just now" for less than 60 seconds ago', () => {
    expect(pipe.transform(fixedNow - 30 * 1000)).toBe('just now');
  });

  it('should return minutes ago', () => {
    expect(pipe.transform(fixedNow - 5 * 60 * 1000)).toBe('5m ago');
  });

  it('should return hours ago', () => {
    expect(pipe.transform(fixedNow - 3 * 60 * 60 * 1000)).toBe('3h ago');
  });

  it('should return days ago', () => {
    expect(pipe.transform(fixedNow - 2 * 24 * 60 * 60 * 1000)).toBe('2d ago');
  });
});
