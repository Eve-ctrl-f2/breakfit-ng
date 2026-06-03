/** ============================ Domain models ============================ */

export type ExerciseCategory =
  | 'kraft'
  | 'cardio'
  | 'core'
  | 'dehnen'
  | 'schultern'
  | 'ruecken'
  | 'beine';

export type Difficulty = 'leicht' | 'mittel' | 'fortgeschritten';

/** A single exercise definition. Names stay German in all locales (domain content). */
export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  difficulty: Difficulty;
  /** Either rep-based or duration-based. */
  unit: 'reps' | 'seconds';
  /** Suggested default count (reps) or duration (seconds). */
  defaultAmount: number;
  /** Rough energy cost 1–5, used by the adaptive engine for balancing. */
  intensity: number;
  /** true => part of the user's active pool. Custom exercises are user-created. */
  enabled: boolean;
  custom?: boolean;
  /** primeicons class, e.g. "pi-bolt". Never an emoji (notification surface rule). */
  icon: string;
}

export type SelectionMode = 'adaptive' | 'random' | 'rotation';

/** Persisted user preferences. */
export interface UserSettings {
  /** focus interval before a break is suggested, in minutes */
  focusMinutes: number;
  /** break length in minutes */
  breakMinutes: number;
  /** long-break interval (every N breaks) */
  longBreakEvery: number;
  longBreakMinutes: number;
  difficulty: Difficulty;
  selectionMode: SelectionMode;
  /** categories the user wants to focus on (empty => all) */
  focusCategories: ExerciseCategory[];
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  autoStartNextFocus: boolean;
  locale: 'de' | 'en' | 'fr';
}

export const DEFAULT_SETTINGS: UserSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakEvery: 4,
  longBreakMinutes: 15,
  difficulty: 'mittel',
  selectionMode: 'adaptive',
  focusCategories: [],
  notificationsEnabled: true,
  soundEnabled: true,
  autoStartNextFocus: false,
  locale: 'de',
};

/** Outcome of a completed (or skipped) break. */
export type BreakOutcome = 'completed' | 'skipped' | 'snoozed';

export interface HistoryEntry {
  id: string;
  /** ISO timestamp of when the break started */
  startedAt: string;
  outcome: BreakOutcome;
  exerciseId: string | null;
  exerciseName: string | null;
  category: ExerciseCategory | null;
  /** reps done / seconds held — what the user actually logged */
  amountDone: number;
  /** the user's RPE-style feedback after the exercise: -1 too easy, 0 ok, +1 too hard */
  feedback: -1 | 0 | 1 | null;
  /** for syncing: 'local' until pushed, then 'synced' */
  syncState: 'local' | 'synced';
}

/** A recommendation produced by the adaptive engine. */
export interface Recommendation {
  exercise: Exercise;
  reason: string;
  amount: number;
  /** 0–1 score, for debugging / "why this" UI */
  score: number;
}

/** Aggregated stats surfaced on the Insights page. */
export interface InsightSummary {
  totalBreaks: number;
  completedBreaks: number;
  skippedBreaks: number;
  completionRate: number;
  currentStreakDays: number;
  longestStreakDays: number;
  /** count per category over the lookback window */
  byCategory: Record<ExerciseCategory, number>;
  /** breaks per weekday index 0..6 (Mon..Sun) */
  byWeekday: number[];
}
