import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { IdbService } from './storage/idb.service';

const KV_KEY = 'meeting-until';

/** Selectable meeting durations in minutes. */
export const MEETING_PRESETS = [15, 30, 60, 90] as const;

/**
 * MeetingService — temporarily suppresses break reminders ("I'm in a meeting").
 *
 * State is a single epoch-ms deadline (`activeUntil`). Storing an absolute
 * timestamp (not a countdown) makes it wall-clock correct for free: after a
 * reload or backgrounded tab we just compare against `Date.now()`. Persisted to
 * IDB so a meeting survives a refresh.
 *
 * `tick` is a 1 Hz signal that drives `isActive`/`remaining` re-evaluation so
 * the UI strip counts down and auto-clears when the window ends.
 */
@Injectable({ providedIn: 'root' })
export class MeetingService {
  private idb = inject(IdbService);

  private readonly _until = signal<number | null>(null);
  private readonly _now = signal<number>(Date.now());
  private hydrated = false;
  private handle: ReturnType<typeof setInterval> | null = null;

  readonly isActive = computed(() => {
    const until = this._until();
    return until !== null && until > this._now();
  });

  /** seconds remaining, clamped at 0 */
  readonly remaining = computed(() => {
    const until = this._until();
    if (until === null) return 0;
    return Math.max(0, Math.round((until - this._now()) / 1000));
  });

  readonly remainingLabel = computed(() => {
    const s = this.remaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  });

  constructor() {
    void this.hydrate();
    this.startTicking();
    effect(() => {
      const v = this._until();
      if (this.hydrated) void this.idb.setKv(KV_KEY, v);
    });
  }

  private async hydrate(): Promise<void> {
    const stored = await this.idb.getKv<number | null>(KV_KEY);
    // discard a stale meeting that already ended while the app was closed
    if (typeof stored === 'number' && stored > Date.now()) this._until.set(stored);
    else this._until.set(null);
    this.hydrated = true;
  }

  start(minutes: number): void {
    this._until.set(Date.now() + minutes * 60_000);
  }

  end(): void {
    this._until.set(null);
  }

  private startTicking(): void {
    if (this.handle) return;
    this.handle = setInterval(() => {
      this._now.set(Date.now());
      // auto-clear once the window passes
      const until = this._until();
      if (until !== null && until <= Date.now()) this._until.set(null);
    }, 1000);
  }
}
