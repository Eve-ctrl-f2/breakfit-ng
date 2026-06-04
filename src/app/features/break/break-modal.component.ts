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
import { CATEGORY_LABELS, CATEGORY_COLOR_VAR } from '@core/data/exercises.data';
import { TPipe } from '@core/i18n/t.pipe';
import type { Recommendation } from '@core/models/models';

type Step = 'exercise' | 'feedback' | 'meeting' | 'snooze';

const SNOOZE_PRESETS = [2, 5, 10] as const;

@Component({
  selector: 'bf-break-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DialogModule, ButtonModule, TPipe],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [closable]="false"
      [dismissableMask]="false"
      [draggable]="false"
      appendTo="body"
      [style]="{ width: 'min(440px, 92vw)' }"
      styleClass="break-dialog"
    >
      <ng-template #header>
        <span class="break__title">{{ headerKey() | t }}</span>
      </ng-template>

      @if (rec(); as r) {
        @if (step() === 'exercise') {
          <!-- recommendation -->
          <div class="break__rec">
            <span class="break__cat" [style.color]="catColor(r)">
              <i class="pi {{ r.exercise.icon }}"></i> {{ catLabel(r) }}
            </span>
            <h2 class="break__name">{{ r.exercise.name }}</h2>
            <p class="break__reason muted">{{ r.reason | t }}</p>
          </div>

          <!-- amount stepper: buttons + real input on one row, caption BELOW -->
          <div class="reps">
            <div class="reps__row">
              <p-button icon="pi pi-minus" [rounded]="true" [text]="true"
                        (onClick)="adjust(-1)" [ariaLabel]="'break.aria.less' | t" />
              <input
                class="reps-counter"
                type="text"
                inputmode="numeric"
                [ngModel]="amount()"
                (ngModelChange)="onAmountInput($event)"
                [attr.aria-label]="'break.aria.amount' | t"
              />
              <p-button icon="pi pi-plus" [rounded]="true" [text]="true"
                        (onClick)="adjust(1)" [ariaLabel]="'break.aria.more' | t" />
            </div>
            <p class="reps__caption muted">
              {{ (r.exercise.unit === 'reps' ? 'break.unit.reps' : 'break.unit.seconds') | t }}
            </p>
          </div>

          <p-button [label]="'break.other' | t" icon="pi pi-refresh" [text]="true"
                    size="small" styleClass="break__shuffle" (onClick)="reshuffle()" />
        } @else if (step() === 'feedback') {
          <!-- feedback -->
          <p class="break__fb-q muted">{{ 'break.fb.question' | t }}</p>
          <div class="break__fb">
            <p-button [label]="'break.fb.tooEasy' | t" [outlined]="true" (onClick)="finish(-1)" />
            <p-button [label]="'break.fb.ok' | t" (onClick)="finish(0)" />
            <p-button [label]="'break.fb.tooHard' | t" [outlined]="true" (onClick)="finish(1)" />
          </div>
        } @else if (step() === 'meeting') {
          <p class="break__fb-q muted">{{ 'meeting.choose' | t }}</p>
          <div class="break__meeting">
            @for (m of meetingPresets; track m) {
              <p-button [label]="m + ' min'" [outlined]="true" (onClick)="startMeeting(m)" />
            }
          </div>
          <p-button [label]="'common.cancel' | t" severity="secondary" [text]="true"
                    size="small" styleClass="break__shuffle" (onClick)="step.set('exercise')" />
        } @else if (step() === 'snooze') {
          <p class="break__fb-q muted">{{ 'snooze.choose' | t }}</p>
          <div class="break__meeting">
            @for (m of snoozePresets; track m) {
              <p-button [label]="m + ' min'" [outlined]="true" (onClick)="startSnooze(m)" />
            }
          </div>
          <p-button [label]="'common.cancel' | t" severity="secondary" [text]="true"
                    size="small" styleClass="break__shuffle" (onClick)="step.set('exercise')" />
        }
      } @else {
        <p class="muted">{{ 'break.emptyPool' | t }}</p>
        <p-button [label]="'break.close' | t" (onClick)="skip()" />
      }

      @if (step() === 'exercise' && rec()) {
        <ng-template #footer>
          <div class="break__actions">
            <!-- row 1: postpone actions, equal weight -->
            <div class="break__row">
              <p-button [label]="'break.meeting' | t" icon="pi pi-calendar" severity="secondary"
                        [outlined]="true" styleClass="break__flex" (onClick)="meeting()" />
              <p-button [label]="'break.snooze' | t" icon="pi pi-clock" severity="secondary"
                        [outlined]="true" styleClass="break__flex" (onClick)="snooze()" />
            </div>
            <!-- row 2: skip = discard intent, ghost-danger -->
            <p-button [label]="'break.skip' | t" [text]="true" severity="danger"
                      styleClass="break__skip" (onClick)="skip()" />
            <!-- primary: done -->
            <p-button [label]="'break.done' | t" icon="pi pi-check" size="large"
                      styleClass="break__done" (onClick)="done()" />
          </div>
        </ng-template>
      }
    </p-dialog>
  `,
  styles: [`
    .break__title { font-family: var(--font-display); font-weight: 700; }
    .break__rec { text-align: center; padding: var(--s-2) 0 var(--s-3); }
    .break__cat { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem;
                  text-transform: uppercase; letter-spacing: 0.06em; }
    .break__name { margin: var(--s-2) 0 4px; font-size: 1.6rem; }
    .break__reason { margin: 0; font-size: 0.9rem; }

    .reps { display: flex; flex-direction: column; align-items: center; gap: var(--s-2);
            margin: var(--s-2) 0 var(--s-3); }
    .reps__row { display: flex; align-items: center; gap: var(--s-3); justify-content: center; }
    .reps__caption { margin: 0; font-size: 0.8rem; letter-spacing: 0.04em; text-transform: uppercase; }

    .break__shuffle { display: block; margin: 0 auto; }

    .break__fb-q { text-align: center; }
    .break__fb { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--s-2); }
    .break__meeting { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-2); }

    .break__actions { display: flex; flex-direction: column; gap: var(--s-2); width: 100%; }
    .break__row { display: flex; gap: var(--s-2); }
    :host ::ng-deep .break__flex { flex: 1 1 0; min-width: 0; }
    :host ::ng-deep .break__flex .p-button { width: 100%; }
    :host ::ng-deep .break__done .p-button { width: 100%; }
    .break__skip { align-self: center; }
  `],
})
export class BreakModalComponent {
  private reco = inject(RecommendationService);
  private timer = inject(TimerService);
  private history = inject(HistoryService);
  private meetingSvc = inject(MeetingService);
  private sync = inject(SyncService);

  readonly meetingPresets = MEETING_PRESETS;
  readonly snoozePresets = SNOOZE_PRESETS;

  /** controlled by the app shell */
  readonly open = input(false);
  readonly closed = output<void>();

  readonly rec = signal<Recommendation | null>(null);
  readonly amount = signal(0);
  readonly step = signal<Step>('exercise');
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
    await this.history.record({
      outcome: 'completed',
      exercise: this.rec()?.exercise ?? null,
      amountDone: this.amount(),
      feedback,
      startedAt: this.startedAt,
    });
    void this.sync.push();
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
