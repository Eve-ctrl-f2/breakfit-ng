/** ============================ Timer state ============================ */

export type TimerPhase = 'idle' | 'focus' | 'break' | 'longBreak';

export interface TimerState {
  phase: TimerPhase;
  /** seconds remaining in the active phase */
  remaining: number;
  /** total seconds of the active phase (for progress rings) */
  total: number;
  running: boolean;
  /** completed focus->break cycles in the current session */
  cyclesCompleted: number;
  /** epoch ms when the active phase was (re)started; null when idle/paused */
  startedAt: number | null;
}

export const INITIAL_TIMER_STATE: TimerState = {
  phase: 'idle',
  remaining: 0,
  total: 0,
  running: false,
  cyclesCompleted: 0,
  startedAt: null,
};
