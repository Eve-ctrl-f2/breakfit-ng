import { describe, it, expect } from 'vitest';
import { formatMMSS } from './timer.service';

describe('formatMMSS', () => {
  it('formats whole minutes', () => {
    expect(formatMMSS(0)).toBe('00:00');
    expect(formatMMSS(60)).toBe('01:00');
    expect(formatMMSS(1500)).toBe('25:00');
  });

  it('formats seconds with zero padding', () => {
    expect(formatMMSS(5)).toBe('00:05');
    expect(formatMMSS(65)).toBe('01:05');
    expect(formatMMSS(599)).toBe('09:59');
  });

  it('handles long durations beyond an hour as minutes', () => {
    expect(formatMMSS(3661)).toBe('61:01');
  });
});
