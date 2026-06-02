import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { SettingsService } from './settings.service';
import { NotificationService } from './notification.service';
import { INITIAL_TIMER_STATE, type TimerState, type TimerPhase } from '../models/timer-state';

/**
 * TimerService — the Pomodoro engine.
 *
 * State is a single `TimerState` signal. Ticking uses wall-clock deltas
 * (`Date.now()` vs `startedAt`) rather than counting interval fires, so the
 * countdown stays accurate even when the tab is throttled or backgrounded —
 * when the user returns we recompute `remaining` from elapsed real time.
 *
 * Phase transitions:
 *   idle --start--> focus --(elapsed)--> break|longBreak --(elapsed/closed)--> focus
 */
@Injectable({ providedIn: 'root' })
export class TimerService {
  private settings = inject(SettingsService);
  private notify = inject(NotificationService);
  private zone = inject(NgZone);

  private readonly _state = signal<TimerState>(INITIAL_TIMER_STATE);
  readonly state = this._state.asReadonly();

  /** true exactly once when a focus interval elapses — UI opens the break modal */
  private readonly _breakDue = signal(0);
  readonly breakDue = this._breakDue.asReadonly();

  readonly progress = computed(() => {
    const s = this._state();
    return s.total ? 1 - s.remaining / s.total : 0;
  });

  readonly mmss = computed(() => formatMMSS(this._state().remaining));

  private handle: ReturnType<typeof setInterval> | null = null;

  startFocus(): void {
    this.beginPhase('focus', this.settings.focusSeconds());
  }

  startBreak(long = false): void {
    const phase: TimerPhase = long ? 'longBreak' : 'break';
    const secs = long ? this.settings.longBreakSeconds() : this.settings.breakSeconds();
    this.beginPhase(phase, secs);
  }

  pause(): void {
    this._state.update((s) => ({ ...s, running: false, startedAt: null }));
    this.stopTicking();
  }

  resume(): void {
    const s = this._state();
    if (s.phase === 'idle') return this.startFocus();
    this._state.update((st) => ({
      ...st,
      running: true,
      startedAt: Date.now() - (st.total - st.remaining) * 1000,
    }));
    this.startTicking();
  }

  reset(): void {
    this.stopTicking();
    this._state.set(INITIAL_TIMER_STATE);
  }

  /** Called when the user finishes/skips a break — advances the cycle. */
  completeBreak(): void {
    this._state.update((s) => ({ ...s, cyclesCompleted: s.cyclesCompleted + 1 }));
    if (this.settings.settings().autoStartNextFocus) {
      this.startFocus();
    } else {
      this.reset();
    }
  }

  /** Re-sync remaining time from the wall clock (call on visibilitychange). */
  resync(): void {
    const s = this._state();
    if (!s.running || s.startedAt == null) return;
    const elapsed = Math.floor((Date.now() - s.startedAt) / 1000);
    const remaining = Math.max(0, s.total - elapsed);
    this._state.update((st) => ({ ...st, remaining }));
    if (remaining === 0) this.onElapsed();
  }

  // ---- internals ----

  private beginPhase(phase: TimerPhase, seconds: number): void {
    this._state.set({
      phase,
      remaining: seconds,
      total: seconds,
      running: true,
      cyclesCompleted: this._state().cyclesCompleted,
      startedAt: Date.now(),
    });
    this.startTicking();
  }

  private startTicking(): void {
    this.stopTicking();
    // run the interval outside Angular's zone; signal writes still notify.
    this.zone.runOutsideAngular(() => {
      this.handle = setInterval(() => this.zone.run(() => this.tick()), 250);
    });
  }

  private stopTicking(): void {
    if (this.handle) clearInterval(this.handle);
    this.handle = null;
  }

  private tick(): void {
    const s = this._state();
    if (!s.running || s.startedAt == null) return;
    const elapsed = Math.floor((Date.now() - s.startedAt) / 1000);
    const remaining = Math.max(0, s.total - elapsed);
    if (remaining !== s.remaining) this._state.update((st) => ({ ...st, remaining }));
    if (remaining === 0) this.onElapsed();
  }

  private onElapsed(): void {
    const phase = this._state().phase;
    this.stopTicking();
    if (phase === 'focus') {
      this._state.update((s) => ({ ...s, running: false }));
      this.notify.fireBreakDue();
      this._breakDue.update((n) => n + 1); // signal the UI to open the break modal
    } else {
      // break finished on its own
      this._state.update((s) => ({ ...s, running: false }));
      this.notify.fireBreakOver();
    }
  }

  /** every Nth break is a long break */
  isLongBreakDue(): boolean {
    const every = this.settings.settings().longBreakEvery;
    const next = this._state().cyclesCompleted + 1;
    return every > 0 && next % every === 0;
  }
}

export function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
