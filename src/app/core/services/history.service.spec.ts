import { describe, it, expect } from 'vitest';
import { buildSummary, weeklyRecap } from './history.service';
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

  it('rest days freeze the streak across an empty day', () => {
    // build keys for the last 3 days
    const day = (back: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - back);
      return d.toISOString().slice(0, 10);
    };
    const weekdayOf = (key: string) => (new Date(key + 'T00:00:00Z').getUTCDay() + 6) % 7;

    // breaks today and two days ago; the gap day (yesterday) is empty
    const entries = [
      entry({ startedAt: day(0) + 'T09:00:00Z' }),
      entry({ startedAt: day(2) + 'T09:00:00Z' }),
    ];

    // without rest days: yesterday breaks the chain -> streak counts only today
    expect(buildSummary(entries, []).currentStreakDays).toBe(1);

    // marking yesterday as a rest day freezes the gap -> today + 2-days-ago count
    const restDay = weekdayOf(day(1));
    expect(buildSummary(entries, [restDay]).currentStreakDays).toBe(2);
  });
});

describe('weeklyRecap', () => {
  const day = (back: number) => {
    const d = new Date();
    d.setDate(d.getDate() - back);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  };

  it('is all-zero with no entries', () => {
    const r = weeklyRecap([]);
    expect(r.thisWeek).toBe(0);
    expect(r.lastWeek).toBe(0);
    expect(r.delta).toBe(0);
  });

  it('counts only completed breaks from this week and computes delta', () => {
    // a fixed "now" mid-week (Wednesday) keeps the week windows deterministic
    const now = new Date('2026-06-03T12:00:00'); // Wed
    const at = (iso: string) => entry({ startedAt: iso, outcome: 'completed' });
    const r = weeklyRecap(
      [
        at('2026-06-01T09:00:00'), // Mon this week
        at('2026-06-03T09:00:00'), // Wed this week
        at('2026-05-28T09:00:00'), // Thu last week
        entry({ startedAt: '2026-06-02T09:00:00', outcome: 'skipped' }), // ignored
      ],
      now,
    );
    expect(r.thisWeek).toBe(2);
    expect(r.lastWeek).toBe(1);
    expect(r.delta).toBe(1);
    expect(r.thisWeekByDay[0]).toBe(1); // Mon
    expect(r.thisWeekByDay[2]).toBe(1); // Wed
  });
});
