import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { RecommendationService } from '@core/services/recommendation.service';
import { TimerService } from '@core/services/timer.service';
import { HistoryService } from '@core/services/history.service';
import { MeetingService, MEETING_PRESETS } from '@core/services/meeting.service';
import { SyncService } from '@core/api/sync.service';
import { HealthService } from '@core/services/health.service';
import { CATEGORY_LABELS, CATEGORY_COLOR_VAR } from '@core/data/exercises.data';
import { TPipe } from '@core/i18n/t.pipe';
import type { Recommendation } from '@core/models/models';

type Step = 'exercise' | 'feedback' | 'meeting' | 'snooze';

const SNOOZE_PRESETS = [2, 5, 10] as const;

@Component({
  selector: 'bf-break-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DialogModule, ButtonModule, TPipe],
  templateUrl: './break-modal.component.html',
  styleUrl: './break-modal.component.scss',
})
export class BreakModalComponent {
  private reco = inject(RecommendationService);
  private timer = inject(TimerService);
  private history = inject(HistoryService);
  private meetingSvc = inject(MeetingService);
  private sync = inject(SyncService);
  private health = inject(HealthService);

  readonly meetingPresets = MEETING_PRESETS;
  readonly snoozePresets = SNOOZE_PRESETS;

  /** controlled by the app shell */
  readonly open = input(false);
  readonly closed = output<void>();

  readonly rec = signal<Recommendation | null>(null);
  readonly amount = signal(0);
  readonly step = signal<Step>('exercise');
  /** how-to section expanded? reset each time the modal opens */
  readonly showHow = signal(false);
  /** internal dialog visibility, driven by the `open` input */
  readonly visible = signal(false);

  private startedAt = new Date().toISOString();

  constructor() {
    // mirror the `open` input into the dialog's visibility, and on each open
    // draw a fresh recommendation. The break countdown itself is started by the
    // app shell, so the exercise overlay is fully decoupled from the timer.
    effect(() => {
      const isOpen = this.open();
      this.visible.set(isOpen);
      if (isOpen) {
        this.startedAt = new Date().toISOString();
        this.step.set('exercise');
        this.showHow.set(false);
        const r = this.reco.next();
        this.rec.set(r);
        this.amount.set(r?.amount ?? 0);
      }
    });
  }

  /** keep our signal in sync if PrimeNG closes the dialog internally */
  onVisibleChange(v: boolean): void {
    this.visible.set(v);
    if (!v && this.open()) this.closed.emit();
  }

  catLabel(r: Recommendation): string { return CATEGORY_LABELS[r.exercise.category]; }
  catColor(r: Recommendation): string { return CATEGORY_COLOR_VAR[r.exercise.category]; }

  adjust(delta: number): void {
    this.amount.update((a) => Math.max(1, a + delta));
  }

  onAmountInput(value: string | number): void {
    const n = parseInt(String(value).replace(/\D/g, ''), 10);
    this.amount.set(Number.isFinite(n) && n > 0 ? n : 1);
  }

  reshuffle(): void {
    const r = this.reco.next();
    this.rec.set(r);
    this.amount.set(r?.amount ?? 0);
  }

  /** user finished the exercise -> ask for feedback */
  done(): void {
    this.step.set('feedback');
  }

  async finish(feedback: -1 | 0 | 1): Promise<void> {
    const ex = this.rec()?.exercise ?? null;
    await this.history.record({
      outcome: 'completed',
      exercise: ex,
      amountDone: this.amount(),
      feedback,
      startedAt: this.startedAt,
    });
    void this.sync.push();
    void this.health.logBreak(ex, this.amount(), this.startedAt);
    this.timer.completeBreak();
    this.close();
  }

  async skip(): Promise<void> {
    await this.history.record({
      outcome: 'skipped',
      exercise: this.rec()?.exercise ?? null,
      amountDone: 0,
      feedback: null,
      startedAt: this.startedAt,
    });
    this.timer.completeBreak();
    this.close();
  }

  async snooze(): Promise<void> {
    // open the duration chooser instead of postponing immediately
    this.step.set('snooze');
  }

  async startSnooze(minutes: number): Promise<void> {
    await this.history.record({
      outcome: 'snoozed',
      exercise: this.rec()?.exercise ?? null,
      amountDone: 0,
      feedback: null,
      startedAt: this.startedAt,
    });
    this.timer.snoozeFor(minutes);
    this.close();
  }

  meeting(): void {
    this.step.set('meeting');
  }

  startMeeting(minutes: number): void {
    this.meetingSvc.start(minutes);
    this.timer.startFocus();
    this.close();
  }

  headerKey(): string {
    const s = this.step();
    if (s === 'feedback') return 'break.title.feedback';
    if (s === 'meeting') return 'meeting.title';
    if (s === 'snooze') return 'snooze.title';
    return 'break.title';
  }

  private close(): void {
    this.step.set('exercise');
    this.closed.emit();
  }
}
