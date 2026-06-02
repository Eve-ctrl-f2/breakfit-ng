import { Injectable, computed, inject, signal } from '@angular/core';
import { IdbService } from './storage/idb.service';
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
  readonly summary = computed<InsightSummary>(() => buildSummary(this._entries()));
}

/** Pure function so it is trivially unit-testable. */
export function buildSummary(entries: HistoryEntry[]): InsightSummary {
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

  const { current, longest } = streaks(entries);

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

/** Day-streak of any completed break, counting back from today. */
function streaks(entries: HistoryEntry[]): { current: number; longest: number } {
  const days = new Set(
    entries
      .filter((e) => e.outcome === 'completed')
      .map((e) => new Date(e.startedAt).toISOString().slice(0, 10)),
  );
  if (days.size === 0) return { current: 0, longest: 0 };

  const sorted = [...days].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const gap = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    run = gap === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // current streak counts back from today (or yesterday, grace day)
  let current = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (current === 0) {
      // allow today to be empty: step back one and retry
      cursor.setDate(cursor.getDate() - 1);
      if (!days.has(cursor.toISOString().slice(0, 10))) break;
    } else break;
  }

  return { current, longest };
}
