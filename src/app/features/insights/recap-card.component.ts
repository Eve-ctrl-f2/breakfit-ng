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
  templateUrl: './recap-card.component.html',
  styleUrl: './recap-card.component.scss',
})
export class RecapCardComponent {
  private readonly history = inject(HistoryService);
  private readonly i18n = inject(TranslationService);

  protected readonly r = this.history.recap;
  protected readonly days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((label, idx) => ({ label, idx }));

  protected readonly trend = computed<'up' | 'down' | 'same'>(() => {
    const d = this.r().delta;
    return d > 0 ? 'up' : d < 0 ? 'down' : 'same';
  });

  protected readonly deltaText = computed(() => {
    const d = this.r().delta;
    if (d > 0) return this.i18n.t('recap.deltaUp', { n: d });
    if (d < 0) return this.i18n.t('recap.deltaDown', { n: Math.abs(d) });
    return this.i18n.t('recap.deltaSame');
  });

  private readonly peak = computed(() => Math.max(1, ...this.r().thisWeekByDay));

  protected barPct(idx: number): number {
    return Math.round((this.r().thisWeekByDay[idx] / this.peak()) * 100);
  }
}
