import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { HistoryService } from '@core/services/history.service';
import { CATEGORY_LABELS, CATEGORY_COLOR_VAR } from '@core/data/exercises.data';
import { TPipe } from '@core/i18n/t.pipe';
import type { ExerciseCategory } from '@core/models/models';

const WINDOW_MS = 7 * 86_400_000;

/**
 * BodyHeatmapComponent — a stylised front-body silhouette whose regions are
 * tinted by how much each muscle group was trained in the last 7 days. Purely
 * derived from history; opacity encodes relative volume so imbalances pop.
 */
@Component({
  selector: 'bf-body-heatmap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  templateUrl: './body-heatmap.component.html',
  styleUrl: './body-heatmap.component.scss',
})
export class BodyHeatmapComponent {
  private history = inject(HistoryService);

  readonly categories = Object.keys(CATEGORY_LABELS) as ExerciseCategory[];

  /** completed-break counts per category over the last 7 days */
  private readonly counts = computed<Record<ExerciseCategory, number>>(() => {
    const since = Date.now() - WINDOW_MS;
    const acc = { kraft: 0, cardio: 0, core: 0, dehnen: 0, schultern: 0, ruecken: 0, beine: 0 };
    for (const e of this.history.entries()) {
      if (e.outcome === 'completed' && e.category && new Date(e.startedAt).getTime() >= since) {
        acc[e.category] += 1;
      }
    }
    return acc;
  });

  private readonly max = computed(() => Math.max(1, ...Object.values(this.counts())));
  readonly total = computed(() => Object.values(this.counts()).reduce((a, b) => a + b, 0));

  count(c: ExerciseCategory): number { return this.counts()[c]; }
  label(c: ExerciseCategory): string { return CATEGORY_LABELS[c]; }
  color(c: ExerciseCategory): string { return CATEGORY_COLOR_VAR[c]; }

  /** fill-opacity: faint baseline so untrained regions stay visible, scaling with volume */
  op(c: ExerciseCategory): number {
    const n = this.counts()[c];
    if (n === 0) return 0.06;
    return 0.2 + 0.8 * (n / this.max());
  }
}
