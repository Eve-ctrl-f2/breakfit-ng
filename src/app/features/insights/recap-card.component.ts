import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { HistoryService } from '@core/services/history.service';
import { TranslationService } from '@core/i18n/translation.service';
import { TPipe } from '@core/i18n/t.pipe';

/**
 * RecapCardComponent — "this week vs last week" at a glance: the count, a signed
 * delta chip, and a compact 7-day bar (Mon–Sun) of this week's completed breaks.
 */
@Component({
  selector: 'bf-recap-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  template: `
    <div class="recap">
      <div class="recap__top">
        <div>
          <span class="recap__num mono">{{ r().thisWeek }}</span>
          <span class="muted recap__lbl">{{ 'recap.label' | t }}</span>
        </div>
        @if (r().thisWeek > 0 || r().lastWeek > 0) {
          <span class="recap__delta" [class]="'recap__delta--' + trend()">
            <i class="pi" [class.pi-arrow-up]="trend() === 'up'"
                          [class.pi-arrow-down]="trend() === 'down'"
                          [class.pi-minus]="trend() === 'same'" aria-hidden="true"></i>
            {{ deltaText() }}
          </span>
        }
      </div>

      @if (r().thisWeek === 0 && r().lastWeek === 0) {
        <p class="muted recap__empty">{{ 'recap.empty' | t }}</p>
      } @else {
        <div class="recap__bars" role="img" [attr.aria-label]="deltaText()">
          @for (d of days; track d.idx) {
            <div class="recap__col">
              <div class="recap__bar-track">
                <div class="recap__bar" [style.height.%]="barPct(d.idx)"></div>
              </div>
              <span class="recap__day muted">{{ d.label }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .recap { display: flex; flex-direction: column; gap: var(--s-3); }
    .recap__top { display: flex; align-items: baseline; justify-content: space-between; gap: var(--s-2); }
    .recap__num { font-size: 2.2rem; font-weight: 700; color: var(--accent); line-height: 1; }
    .recap__lbl { font-size: 0.85rem; margin-left: var(--s-2); }
    .recap__delta { display: inline-flex; align-items: center; gap: 4px; font-size: 0.82rem;
                    padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
    .recap__delta--up { background: rgba(125, 240, 168, 0.15); color: #7df0a8; }
    .recap__delta--down { background: var(--surface-2); color: var(--text-2); }
    .recap__delta--same { background: var(--surface-2); color: var(--text-2); }
    .recap__empty { font-size: 0.88rem; margin: 0; }
    .recap__bars { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; align-items: end; }
    .recap__col { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .recap__bar-track { width: 100%; height: 48px; display: flex; align-items: flex-end;
                        background: var(--surface-2); border-radius: 6px; overflow: hidden; }
    .recap__bar { width: 100%; background: var(--accent); border-radius: 6px 6px 0 0; min-height: 2px;
                  transition: height 0.2s ease; }
    .recap__day { font-size: 0.7rem; }
  `],
})
export class RecapCardComponent {
  private history = inject(HistoryService);
  private i18n = inject(TranslationService);

  readonly r = this.history.recap;
  readonly days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((label, idx) => ({ label, idx }));

  readonly trend = computed<'up' | 'down' | 'same'>(() => {
    const d = this.r().delta;
    return d > 0 ? 'up' : d < 0 ? 'down' : 'same';
  });

  readonly deltaText = computed(() => {
    const d = this.r().delta;
    if (d > 0) return this.i18n.t('recap.deltaUp', { n: d });
    if (d < 0) return this.i18n.t('recap.deltaDown', { n: Math.abs(d) });
    return this.i18n.t('recap.deltaSame');
  });

  private readonly peak = computed(() => Math.max(1, ...this.r().thisWeekByDay));

  barPct(idx: number): number {
    return Math.round((this.r().thisWeekByDay[idx] / this.peak()) * 100);
  }
}
