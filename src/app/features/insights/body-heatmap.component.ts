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
  template: `
    @if (total() === 0) {
      <p class="muted">{{ 'heatmap.empty' | t }}</p>
    } @else {
      <div class="hm">
        <svg viewBox="0 0 220 430" class="hm__svg" role="img"
             [attr.aria-label]="'heatmap.title' | t">
          <!-- base silhouette outline -->
          <g fill="var(--surface-3)" stroke="var(--border-3)" stroke-width="1">
            <circle cx="110" cy="40" r="26" />
            <rect x="100" y="64" width="20" height="16" rx="6" />
            <rect x="62" y="80" width="96" height="120" rx="26" />
            <rect x="44" y="92" width="22" height="120" rx="11" />
            <rect x="154" y="92" width="22" height="120" rx="11" />
            <rect x="74" y="196" width="32" height="150" rx="14" />
            <rect x="114" y="196" width="32" height="150" rx="14" />
          </g>

          <!-- tinted regions (fill-opacity = relative 7-day volume) -->
          <g stroke="none">
            <!-- dehnen: neck -->
            <rect x="100" y="64" width="20" height="16" rx="6"
                  [attr.fill]="color('dehnen')" [attr.fill-opacity]="op('dehnen')" />
            <!-- schultern -->
            <ellipse cx="68" cy="92" rx="16" ry="11"
                     [attr.fill]="color('schultern')" [attr.fill-opacity]="op('schultern')" />
            <ellipse cx="152" cy="92" rx="16" ry="11"
                     [attr.fill]="color('schultern')" [attr.fill-opacity]="op('schultern')" />
            <!-- kraft: arms -->
            <rect x="44" y="96" width="22" height="116" rx="11"
                  [attr.fill]="color('kraft')" [attr.fill-opacity]="op('kraft')" />
            <rect x="154" y="96" width="22" height="116" rx="11"
                  [attr.fill]="color('kraft')" [attr.fill-opacity]="op('kraft')" />
            <!-- cardio: chest centre -->
            <rect x="80" y="92" width="60" height="44" rx="14"
                  [attr.fill]="color('cardio')" [attr.fill-opacity]="op('cardio')" />
            <!-- core: abdomen -->
            <rect x="78" y="138" width="64" height="34" rx="10"
                  [attr.fill]="color('core')" [attr.fill-opacity]="op('core')" />
            <!-- ruecken: lower torso band -->
            <rect x="70" y="172" width="80" height="26" rx="10"
                  [attr.fill]="color('ruecken')" [attr.fill-opacity]="op('ruecken')" />
            <!-- beine -->
            <rect x="74" y="200" width="32" height="144" rx="14"
                  [attr.fill]="color('beine')" [attr.fill-opacity]="op('beine')" />
            <rect x="114" y="200" width="32" height="144" rx="14"
                  [attr.fill]="color('beine')" [attr.fill-opacity]="op('beine')" />
          </g>
        </svg>

        <ul class="hm__legend">
          @for (c of categories; track c) {
            <li class="hm__row">
              <span class="hm__dot" [style.background]="color(c)" [style.opacity]="op(c)"></span>
              <span class="hm__name">{{ label(c) }}</span>
              <span class="hm__count mono muted">{{ count(c) }}</span>
            </li>
          }
        </ul>
      </div>
      <p class="muted hm__hint">{{ 'heatmap.hint' | t }}</p>
    }
  `,
  styles: [`
    .hm { display: grid; grid-template-columns: 160px 1fr; gap: var(--s-4); align-items: center; }
    .hm__svg { width: 100%; max-width: 160px; height: auto; }
    .hm__legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .hm__row { display: flex; align-items: center; gap: var(--s-2); }
    .hm__dot { width: 12px; height: 12px; border-radius: 4px; flex: 0 0 auto; }
    .hm__name { flex: 1 1 auto; font-size: 0.85rem; color: var(--text-1); }
    .hm__count { font-size: 0.82rem; }
    .hm__hint { font-size: 0.78rem; margin: var(--s-3) 0 0; }
    @media (max-width: 420px) { .hm { grid-template-columns: 120px 1fr; gap: var(--s-3); } }
  `],
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
