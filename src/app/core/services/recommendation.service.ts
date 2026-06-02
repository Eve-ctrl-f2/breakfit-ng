import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';
import { ExercisePoolService } from './exercise-pool.service';
import { HistoryService } from './history.service';
import type {
  Exercise,
  Recommendation,
  Difficulty,
  HistoryEntry,
} from '../models/models';

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  leicht: 1,
  mittel: 2,
  fortgeschritten: 3,
};

/**
 * RecommendationService — the adaptive engine.
 *
 * Selection modes:
 *  - 'adaptive' (default): score every active exercise and pick the best,
 *    with a little randomness so it never feels deterministic.
 *  - 'random': uniform pick from the active pool.
 *  - 'rotation': least-recently-used.
 *
 * The adaptive score balances four signals:
 *  1. Recency      — penalise exercises done recently (avoid repetition)
 *  2. Difficulty   — prefer exercises matching the user's difficulty setting,
 *                    nudged by their recent RPE feedback (too easy -> harder).
 *  3. Category mix — boost under-represented categories (and any the user
 *                    explicitly focuses on).
 *  4. Variety jitter — small random term as a tie-breaker.
 */
@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private settings = inject(SettingsService);
  private pool = inject(ExercisePoolService);
  private history = inject(HistoryService);

  /** Produce the next recommendation, or null if the pool is empty. */
  next(): Recommendation | null {
    const active = this.pool.active();
    if (active.length === 0) return null;

    const mode = this.settings.settings().selectionMode;
    const recent = this.history.entries().slice(0, 30);

    if (mode === 'random') {
      const ex = active[Math.floor(Math.random() * active.length)];
      return this.toRecommendation(ex, 'Zufällig ausgewählt', 1);
    }

    if (mode === 'rotation') {
      const ex = this.leastRecentlyUsed(active, recent);
      return this.toRecommendation(ex, 'Länger nicht gemacht', 1);
    }

    // adaptive
    const effDifficulty = this.effectiveDifficulty(recent);
    const catCounts = this.categoryCounts(recent);
    const focus = this.settings.settings().focusCategories;

    let best: { ex: Exercise; score: number; reason: string } | null = null;
    for (const ex of active) {
      const recencyPenalty = this.recencyPenalty(ex, recent);
      const diffMatch = 1 - Math.abs(DIFFICULTY_RANK[ex.difficulty] - effDifficulty) / 2;
      const catCount = catCounts.get(ex.category) ?? 0;
      const maxCat = Math.max(1, ...catCounts.values());
      const mixBoost = 1 - catCount / maxCat; // rarer category -> higher
      const focusBoost = focus.length === 0 || focus.includes(ex.category) ? 1 : 0.4;
      const jitter = Math.random() * 0.12;

      const score =
        0.30 * (1 - recencyPenalty) +
        0.30 * diffMatch +
        0.22 * mixBoost +
        0.18 * focusBoost +
        jitter;

      if (!best || score > best.score) {
        best = { ex, score, reason: this.explain(diffMatch, mixBoost, recencyPenalty) };
      }
    }

    return best ? this.toRecommendation(best.ex, best.reason, best.score) : null;
  }

  // ---- helpers ----

  private toRecommendation(ex: Exercise, reason: string, score: number): Recommendation {
    return { exercise: ex, reason, amount: this.scaleAmount(ex), score: clamp01(score) };
  }

  /** Scale the suggested amount up/down with the user's difficulty preference. */
  private scaleAmount(ex: Exercise): number {
    const factor = { leicht: 0.8, mittel: 1, fortgeschritten: 1.25 }[
      this.settings.settings().difficulty
    ];
    return Math.max(1, Math.round(ex.defaultAmount * factor));
  }

  /** Shift target difficulty by recent feedback: many "too easy" -> harder. */
  private effectiveDifficulty(recent: HistoryEntry[]): number {
    const base = DIFFICULTY_RANK[this.settings.settings().difficulty];
    const fb = recent.filter((e) => e.feedback !== null).slice(0, 8);
    if (fb.length === 0) return base;
    const avg = fb.reduce((s, e) => s + (e.feedback ?? 0), 0) / fb.length;
    // feedback -1 (too easy) pushes difficulty up; +1 (too hard) pushes down
    return clamp(base - avg, 1, 3);
  }

  private recencyPenalty(ex: Exercise, recent: HistoryEntry[]): number {
    const idx = recent.findIndex((e) => e.exerciseId === ex.id);
    if (idx === -1) return 0;
    // most recent (idx 0) => penalty 1, decays linearly over the window
    return Math.max(0, 1 - idx / 12);
  }

  private categoryCounts(recent: HistoryEntry[]): Map<string, number> {
    const m = new Map<string, number>();
    for (const e of recent) if (e.category) m.set(e.category, (m.get(e.category) ?? 0) + 1);
    return m;
  }

  private leastRecentlyUsed(active: Exercise[], recent: HistoryEntry[]): Exercise {
    const lastIndex = new Map<string, number>();
    recent.forEach((e, i) => {
      if (e.exerciseId && !lastIndex.has(e.exerciseId)) lastIndex.set(e.exerciseId, i);
    });
    return [...active].sort(
      (a, b) => (lastIndex.get(b.id) ?? 999) - (lastIndex.get(a.id) ?? 999),
    )[0];
  }

  private explain(diffMatch: number, mixBoost: number, recency: number): string {
    if (recency > 0.6) return 'Etwas Abwechslung';
    if (mixBoost > 0.7) return 'Diese Muskelgruppe kam zu kurz';
    if (diffMatch > 0.85) return 'Passt zu deinem Level';
    return 'Empfohlen für dich';
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
function clamp01(v: number): number {
  return clamp(v, 0, 1);
}
