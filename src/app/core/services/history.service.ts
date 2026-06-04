import { Injectable, computed, inject, signal } from '@angular/core';
import { IdbService } from './storage/idb.service';
import { SettingsService } from './settings.service';
import { environment } from '@env/environment';
import type {
  HistoryEntry,
  InsightSummary,
  ExerciseCategory,
  BreakOutcome,
  Exercise,
} from '../models/models';

const EMPTY_BY_CATEGORY: Record<ExerciseCategory, number> = {
  kraft: 0, cardio: 0, core: 0, dehnen: 0, schultern: 0, ruecken: 0, beine: 0,
};

/**
 * HistoryService — append-only log of break outcomes plus derived insights.
 * Records are persisted to IDB and, when cloud is enabled, enqueued for sync.
 */
@Injectable({ providedIn: 'root' })
export class HistoryService {
  private idb = inject(IdbService);
  private settings = inject(SettingsService);

  private readonly _entries = signal<HistoryEntry[]>([]);
  readonly entries = this._entries.asReadonly();

  constructor() {
    void this.hydrate();
  }

  private async hydrate(): Promise<void> {
    this._entries.set(await this.idb.allHistory());
  }

  /** Record a completed/skipped/snoozed break. Returns the stored entry. */
  async record(input: {
    outcome: BreakOutcome;
    exercise: Exercise | null;
    amountDone: number;
    feedback: -1 | 0 | 1 | null;
    startedAt?: string;
  }): Promise<HistoryEntry> {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      startedAt: input.startedAt ?? new Date().toISOString(),
      outcome: input.outcome,
      exerciseId: input.exercise?.id ?? null,
      exerciseName: input.exercise?.name ?? null,
      category: input.exercise?.category ?? null,
      amountDone: input.amountDone,
      feedback: input.feedback,
      syncState: 'local',
    };
    await this.idb.putHistory(entry);
    if (environment.cloudEnabled) await this.idb.enqueueSync(entry);
    this._entries.update((list) => [entry, ...list]);
    return entry;
  }

  async clear(): Promise<void> {
    await this.idb.clearHistory();
    this._entries.set([]);
  }

  /** Aggregated stats over the full log. Pure derivation -> computed signal. */
  readonly summary = computed<InsightSummary>(() =>
    buildSummary(this._entries(), this.settings.settings().restDays ?? []),
  );

  /** This-week vs last-week recap. */
  readonly recap = computed<WeeklyRecap>(() => weeklyRecap(this._entries()));
}

export interface WeeklyRecap {
  thisWeek: number;
  lastWeek: number;
  delta: number;
  /** completed breaks per weekday this week, 0=Mon..6=Sun */
  thisWeekByDay: number[];
}

/** Monday 00:00 (local) of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // 0=Mon..6=Sun
  x.setDate(x.getDate() - dow);
  return x;
}

/** Compare completed breaks this week vs last week (pure, testable). */
export function weeklyRecap(entries: HistoryEntry[], now: Date = new Date()): WeeklyRecap {
  const thisStart = startOfWeek(now).getTime();
  const lastStart = thisStart - 7 * 86_400_000;
  let thisWeek = 0;
  let lastWeek = 0;
  const byDay = [0, 0, 0, 0, 0, 0, 0];
  for (const e of entries) {
    if (e.outcome !== 'completed') continue;
    const t = new Date(e.startedAt).getTime();
    if (t >= thisStart) {
      thisWeek += 1;
      const d = new Date(e.startedAt);
      byDay[(d.getDay() + 6) % 7] += 1;
    } else if (t >= lastStart) {
      lastWeek += 1;
    }
  }
  return { thisWeek, lastWeek, delta: thisWeek - lastWeek, thisWeekByDay: byDay };
}

/** Pure function so it is trivially unit-testable. */
export function buildSummary(entries: HistoryEntry[], restDays: number[] = []): InsightSummary {
  const total = entries.length;
  const completed = entries.filter((e) => e.outcome === 'completed').length;
  const skipped = entries.filter((e) => e.outcome === 'skipped').length;

  const byCategory = { ...EMPTY_BY_CATEGORY };
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const e of entries) {
    if (e.category) byCategory[e.category] += 1;
    const d = new Date(e.startedAt);
    // JS getDay: 0=Sun..6=Sat -> remap to 0=Mon..6=Sun
    byWeekday[(d.getDay() + 6) % 7] += 1;
  }

  const { current, longest } = streaks(entries, restDays);

  return {
    totalBreaks: total,
    completedBreaks: completed,
    skippedBreaks: skipped,
    completionRate: total ? completed / total : 0,
    currentStreakDays: current,
    longestStreakDays: longest,
    byCategory,
    byWeekday,
  };
}

/** weekday (0=Mon..6=Sun) of a YYYY-MM-DD key, computed in UTC for determinism */
function weekdayOf(key: string): number {
  return (new Date(key + 'T00:00:00Z').getUTCDay() + 6) % 7;
}

/** Day-streak of any completed break, counting back from today.
 *  Rest days (0=Mon..6=Sun) with no activity "freeze" the streak: they neither
 *  increment nor break it. */
function streaks(entries: HistoryEntry[], restDays: number[] = []): { current: number; longest: number } {
  const rest = new Set(restDays);
  const isRest = (key: string) => rest.has(weekdayOf(key));

  const days = new Set(
    entries
      .filter((e) => e.outcome === 'completed')
      .map((e) => new Date(e.startedAt).toISOString().slice(0, 10)),
  );
  if (days.size === 0) return { current: 0, longest: 0 };

  const sorted = [...days].sort();
  const earliest = sorted[0];

  // longest: consecutive break-days, allowing gaps made up entirely of rest days
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00Z');
    const cur = new Date(sorted[i] + 'T00:00:00Z');
    let continuous = true;
    for (let t = prev.getTime() + 86_400_000; t < cur.getTime(); t += 86_400_000) {
      if (!isRest(new Date(t).toISOString().slice(0, 10))) { continuous = false; break; }
    }
    run = continuous ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // current streak counts back from today; rest days freeze, today may be empty
  let current = 0;
  let first = true;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (key < earliest) break; // no activity before this point
    if (days.has(key)) current += 1;
    else if (isRest(key)) { /* frozen: neither count nor break */ }
    else if (first) { /* grace: allow today to be empty */ }
    else break;
    first = false;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest };
}
