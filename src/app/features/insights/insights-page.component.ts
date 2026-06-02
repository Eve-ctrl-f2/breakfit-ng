import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { MeterGroupModule } from 'primeng/metergroup';
import { ButtonModule } from 'primeng/button';
import { HistoryService } from '@core/services/history.service';
import { CATEGORY_LABELS, CATEGORY_COLOR_VAR } from '@core/data/exercises.data';
import { TPipe } from '@core/i18n/t.pipe';
import { GoalCardComponent } from './goal-card.component';
import { MilestoneCardComponent } from './milestone-card.component';
import { TranslationService } from '@core/i18n/translation.service';
import type { ExerciseCategory } from '@core/models/models';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

@Component({
  selector: 'bf-insights-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardModule, MeterGroupModule, ButtonModule, TPipe, GoalCardComponent, MilestoneCardComponent],
  template: `
    <section class="container">
      <p class="section-title">{{ 'insights.title' | t }}</p>

      <!-- headline stats -->
      <div class="stats">
        <div class="stat">
          <span class="stat__num mono">{{ s().completedBreaks }}</span>
          <span class="stat__lbl muted">{{ 'insights.stat.done' | t }}</span>
        </div>
        <div class="stat">
          <span class="stat__num mono" style="color: var(--streak)">{{ s().currentStreakDays }}</span>
          <span class="stat__lbl muted">{{ 'insights.stat.streak' | t }}</span>
        </div>
        <div class="stat">
          <span class="stat__num mono">{{ ratePct() }}%</span>
          <span class="stat__lbl muted">{{ 'insights.stat.rate' | t }}</span>
        </div>
      </div>

      <!-- weekly goal -->
      <p-card styleClass="ins-card">
        <p class="section-title">{{ 'goal.title' | t }}</p>
        <bf-goal-card />
      </p-card>

      <!-- milestones -->
      <p-card styleClass="ins-card">
        <p class="section-title">{{ 'milestones.title' | t }}</p>
        <bf-milestone-card />
      </p-card>

      <!-- category distribution -->
      <p-card styleClass="ins-card">
        <p class="section-title">{{ 'insights.muscle' | t }}</p>
        @if (meter().length) {
          <p-metergroup [value]="meter()" />
        } @else {
          <p class="muted">{{ 'insights.noData' | t }}</p>
        }
      </p-card>

      <!-- weekday activity -->
      <p-card styleClass="ins-card">
        <p class="section-title">{{ 'insights.week' | t }}</p>
        <div class="bars">
          @for (d of weekdayBars(); track d.label) {
            <div class="bar">
              <div class="bar__track">
                <div class="bar__fill" [style.height.%]="d.pct"></div>
              </div>
              <span class="bar__lbl muted">{{ d.label }}</span>
            </div>
          }
        </div>
      </p-card>

      <!-- recent -->
      <p-card styleClass="ins-card">
        <div class="ins-card__head">
          <p class="section-title" style="margin:0">{{ 'insights.history' | t }}</p>
          @if (history.entries().length) {
            <p-button [label]="'insights.delete' | t" [text]="true" size="small" severity="danger"
                      (onClick)="history.clear()" />
          }
        </div>
        @for (e of recent(); track e.id) {
          <div class="hist">
            <span class="hist__dot" [class.hist__dot--skip]="e.outcome !== 'completed'"></span>
            <span class="hist__name">{{ e.exerciseName ?? ('insights.skipped' | t) }}</span>
            @if (e.outcome === 'completed') {
              <span class="hist__amt muted mono">{{ e.amountDone }}</span>
            }
            <span class="hist__time muted">{{ time(e.startedAt) }}</span>
          </div>
        } @empty {
          <p class="muted">{{ 'insights.empty' | t }}</p>
        }
      </p-card>
    </section>
  `,
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-3); margin-bottom: var(--s-4); }
    .stat { background: var(--surface-1); border: 1px solid var(--border-1); border-radius: var(--radius);
            padding: var(--s-3); text-align: center; display: flex; flex-direction: column; gap: 4px; }
    .stat__num { font-size: 2rem; font-weight: 700; color: var(--accent); }
    .stat__lbl { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
    :host ::ng-deep .ins-card { margin-bottom: var(--s-3); }
    .ins-card__head { display: flex; justify-content: space-between; align-items: center; }
    .bars { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: var(--s-2); height: 120px; align-items: end; }
    .bar { display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: end; }
    .bar__track { width: 60%; height: 90px; display: flex; align-items: end; }
    .bar__fill { width: 100%; min-height: 3px; background: var(--accent); border-radius: 4px 4px 0 0; transition: height .3s; }
    .bar__lbl { font-size: 0.72rem; }
    .hist { display: flex; align-items: center; gap: var(--s-2); padding: 8px 0; border-bottom: 1px solid var(--border-1); }
    .hist:last-child { border-bottom: none; }
    .hist__dot { width: 8px; height: 8px; border-radius: 999px; background: var(--accent); flex: 0 0 auto; }
    .hist__dot--skip { background: var(--text-3); }
    .hist__name { flex: 1 1 auto; }
    .hist__amt { flex: 0 0 auto; }
    .hist__time { flex: 0 0 auto; font-size: 0.78rem; }
  `],
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
    const loc = this.i18n.locale() === 'en' ? 'en-GB' : 'de-DE';
    return new Date(iso).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  }
}

/** resolve a CSS var() to a concrete color for the MeterGroup API */
function getComputedColor(cssVar: string): string {
  const name = cssVar.replace('var(', '').replace(')', '').trim();
  if (typeof getComputedStyle === 'undefined') return '#c8f060';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#c8f060';
}
