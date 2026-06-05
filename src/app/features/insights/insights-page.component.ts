import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { MeterGroupModule } from 'primeng/metergroup';
import { ButtonModule } from 'primeng/button';
import { HistoryService } from '@core/services/history.service';
import { CATEGORY_LABELS, CATEGORY_COLOR_VAR } from '@core/data/exercises.data';
import { TPipe } from '@core/i18n/t.pipe';
import { GoalCardComponent } from './goal-card.component';
import { RecapCardComponent } from './recap-card.component';
import { MilestoneCardComponent } from './milestone-card.component';
import { BodyHeatmapComponent } from './body-heatmap.component';
import { TranslationService } from '@core/i18n/translation.service';
import type { ExerciseCategory } from '@core/models/models';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

@Component({
  selector: 'bf-insights-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardModule, MeterGroupModule, ButtonModule, TPipe, GoalCardComponent, RecapCardComponent, MilestoneCardComponent, BodyHeatmapComponent],
  templateUrl: './insights-page.component.html',
  styleUrl: './insights-page.component.scss',
})
export class InsightsPageComponent {
  readonly history = inject(HistoryService);
  private i18n = inject(TranslationService);
  readonly s = this.history.summary;

  readonly ratePct = computed(() => Math.round(this.s().completionRate * 100));

  readonly meter = computed(() => {
    const by = this.s().byCategory;
    return (Object.keys(by) as ExerciseCategory[])
      .filter((c) => by[c] > 0)
      .map((c) => ({
        label: CATEGORY_LABELS[c],
        value: by[c],
        color: getComputedColor(CATEGORY_COLOR_VAR[c]),
      }));
  });

  readonly weekdayBars = computed(() => {
    const w = this.s().byWeekday;
    const max = Math.max(1, ...w);
    return w.map((v, i) => ({ label: WEEKDAYS[i], pct: (v / max) * 100 }));
  });

  readonly recent = computed(() => this.history.entries().slice(0, 12));

  time(iso: string): string {
    return new Date(iso).toLocaleTimeString(this.i18n.bcp47(), { hour: '2-digit', minute: '2-digit' });
  }
}

/** resolve a CSS var() to a concrete color for the MeterGroup API */
function getComputedColor(cssVar: string): string {
  const name = cssVar.replace('var(', '').replace(')', '').trim();
  if (typeof getComputedStyle === 'undefined') return '#c8f060';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#c8f060';
}
