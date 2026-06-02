import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { IdbService } from '../services/storage/idb.service';
import { HistoryService } from '../services/history.service';

const KV_KEY = 'weekly-goal';
const DEFAULT_GOAL = 20; // 20 completed breaks per week

/**
 * GoalService — weekly break target.
 *
 * Edge case fixed: ISO timestamps in IDB are UTC. toISOString().slice(0,10)
 * returns the UTC date which can differ from the user's local date (e.g. a
 * break at 23:30 CET is midnight UTC = next day). All date comparisons here
 * use toLocaleDateString('sv') which returns YYYY-MM-DD in local time.
 */
@Injectable({ providedIn: 'root' })
export class GoalService {
  private idb = inject(IdbService);
  private history = inject(HistoryService);

  private readonly _weeklyTarget = signal<number>(DEFAULT_GOAL);
  private hydrated = false;

  readonly weeklyTarget = this._weeklyTarget.asReadonly();

  constructor() {
    void this.hydrate();
    effect(() => {
      const val = this._weeklyTarget();
      if (this.hydrated) void this.idb.setKv(KV_KEY, val);
    });
  }

  private async hydrate(): Promise<void> {
    const stored = await this.idb.getKv<number>(KV_KEY);
    if (typeof stored === 'number') this._weeklyTarget.set(stored);
    this.hydrated = true;
  }

  setTarget(n: number): void {
    this._weeklyTarget.set(Math.max(1, Math.min(100, n)));
  }

  /** Completed breaks in the current calendar week (Mon–Sun, local timezone). */
  readonly weeklyProgress = computed<number>(() => {
    const monday = getLocalMondayISO();
    return this.history
      .entries()
      .filter(
        (e) => e.outcome === 'completed' && toLocalDateStr(e.startedAt) >= monday,
      ).length;
  });

  readonly weeklyPercent = computed<number>(() =>
    Math.min(100, Math.round((this.weeklyProgress() / this._weeklyTarget()) * 100)),
  );

  readonly weeklyDone = computed<boolean>(
    () => this.weeklyProgress() >= this._weeklyTarget(),
  );
}

/** Returns the YYYY-MM-DD of the most recent Monday in local time */
function getLocalMondayISO(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun 6=Sat
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  return toLocalDateStr(mon.toISOString());
}

/** Convert ISO string to local YYYY-MM-DD using 'sv' locale trick */
function toLocalDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('sv'); // 'sv' locale gives YYYY-MM-DD
}
