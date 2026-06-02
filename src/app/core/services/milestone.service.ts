import { Injectable, computed, inject } from '@angular/core';
import { HistoryService } from './history.service';
import { GoalService } from './goal.service';

export type MilestoneKind = 'streak' | 'total' | 'weekly';

export interface MilestoneDef {
  id: string;
  kind: MilestoneKind;
  threshold: number;
  /** primeicons class */
  icon: string;
  /** i18n key for the label */
  labelKey: string;
}

export interface MilestoneState extends MilestoneDef {
  earned: boolean;
  /** current progress value toward the threshold */
  current: number;
  /** 0–1 */
  progress: number;
}

/** Ordered milestone ladder. Names kept generic + i18n-keyed. */
const DEFS: MilestoneDef[] = [
  { id: 'streak-3',  kind: 'streak', threshold: 3,   icon: 'pi-bolt',   labelKey: 'milestones.streak3' },
  { id: 'streak-7',  kind: 'streak', threshold: 7,   icon: 'pi-bolt',   labelKey: 'milestones.streak7' },
  { id: 'streak-30', kind: 'streak', threshold: 30,  icon: 'pi-star-fill', labelKey: 'milestones.streak30' },
  { id: 'total-10',  kind: 'total',  threshold: 10,  icon: 'pi-check-circle', labelKey: 'milestones.total10' },
  { id: 'total-50',  kind: 'total',  threshold: 50,  icon: 'pi-check-circle', labelKey: 'milestones.total50' },
  { id: 'total-100', kind: 'total',  threshold: 100, icon: 'pi-trophy', labelKey: 'milestones.total100' },
  { id: 'weekly-1',  kind: 'weekly', threshold: 1,   icon: 'pi-flag',   labelKey: 'milestones.weekly1' },
];

/**
 * MilestoneService — derives badge state from history + weekly goal.
 * Purely reactive (computed), no persistence: the underlying facts already live
 * in HistoryService, so milestones are always recomputed, never stored stale.
 */
@Injectable({ providedIn: 'root' })
export class MilestoneService {
  private history = inject(HistoryService);
  private goal = inject(GoalService);

  readonly milestones = computed<MilestoneState[]>(() => {
    const summary = this.history.summary();
    const weeklyDoneCount = this.goal.weeklyDone() ? 1 : 0;

    return DEFS.map((d) => {
      const current =
        d.kind === 'streak' ? summary.longestStreakDays
        : d.kind === 'total' ? summary.completedBreaks
        : weeklyDoneCount;
      return {
        ...d,
        current,
        earned: current >= d.threshold,
        progress: Math.min(1, current / d.threshold),
      };
    });
  });

  readonly earnedCount = computed(() => this.milestones().filter((m) => m.earned).length);

  /** the next not-yet-earned milestone, for a "next up" hint */
  readonly next = computed<MilestoneState | null>(
    () => this.milestones().find((m) => !m.earned) ?? null,
  );
}
