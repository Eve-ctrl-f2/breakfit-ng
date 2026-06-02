import { describe, it, expect } from 'vitest';
import { buildSummary } from './history.service';
import type { HistoryEntry } from '../models/models';

function entry(p: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    outcome: 'completed',
    exerciseId: 'plank',
    exerciseName: 'Plank',
    category: 'core',
    amountDone: 30,
    feedback: 0,
    syncState: 'local',
    ...p,
  };
}

describe('buildSummary', () => {
  it('returns zeroed summary for empty history', () => {
    const s = buildSummary([]);
    expect(s.totalBreaks).toBe(0);
    expect(s.completionRate).toBe(0);
    expect(s.currentStreakDays).toBe(0);
  });

  it('computes completion rate', () => {
    const s = buildSummary([
      entry({ outcome: 'completed' }),
      entry({ outcome: 'completed' }),
      entry({ outcome: 'skipped' }),
    ]);
    expect(s.totalBreaks).toBe(3);
    expect(s.completedBreaks).toBe(2);
    expect(s.completionRate).toBeCloseTo(2 / 3);
  });

  it('aggregates by category', () => {
    const s = buildSummary([
      entry({ category: 'core' }),
      entry({ category: 'core' }),
      entry({ category: 'kraft' }),
    ]);
    expect(s.byCategory.core).toBe(2);
    expect(s.byCategory.kraft).toBe(1);
  });

  it('counts a current streak for breaks done today', () => {
    const s = buildSummary([entry({ startedAt: new Date().toISOString() })]);
    expect(s.currentStreakDays).toBeGreaterThanOrEqual(1);
  });
});
