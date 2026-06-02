import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { KnobModule } from 'primeng/knob';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { TimerService } from '@core/services/timer.service';
import { SettingsService } from '@core/services/settings.service';
import { TPipe } from '@core/i18n/t.pipe';

@Component({
  selector: 'bf-timer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, KnobModule, TagModule, FormsModule, TPipe],
  template: `
    <section class="container timer">
      <header class="timer__head">
        <p class="section-title">{{ phaseKey() | t }}</p>
        <p class="muted timer__sub">{{ subKey() | t }}</p>
      </header>

      <div class="timer__dial">
        <p-knob
          [ngModel]="dialValue()"
          [max]="100"
          [min]="0"
          [size]="240"
          [strokeWidth]="6"
          [readonly]="true"
          [showValue]="false"
          valueColor="var(--accent)"
          rangeColor="var(--border-2)"
        />
        <div class="timer__readout mono">{{ timer.mmss() }}</div>
      </div>

      <div class="timer__cycles" [attr.aria-label]="'a11y.cycles' | t">
        @for (i of cyclePips(); track i) {
          <span class="pip" [class.pip--done]="i < state().cyclesCompleted"></span>
        }
      </div>

      <div class="timer__actions">
        @if (state().phase === 'idle') {
          <p-button [label]="'timer.start' | t" icon="pi pi-play" size="large" (onClick)="timer.startFocus()" />
        } @else if (state().running) {
          <p-button [label]="'timer.pause' | t" icon="pi pi-pause" size="large"
                    severity="secondary" styleClass="timer__pause" (onClick)="timer.pause()" />
          <p-button [label]="'timer.stop' | t" icon="pi pi-stop" [text]="true" severity="danger" (onClick)="timer.reset()" />
        } @else {
          <p-button [label]="'timer.resume' | t" icon="pi pi-play" size="large" (onClick)="timer.resume()" />
          <p-button [label]="'timer.stop' | t" icon="pi pi-stop" [text]="true" severity="danger" (onClick)="timer.reset()" />
        }
      </div>

      @if (state().phase === 'idle') {
        <p class="muted timer__hint">
          {{ 'timer.hint' | t:{ focus: settings.settings().focusMinutes, break: settings.settings().breakMinutes } }}
        </p>
      }
    </section>
  `,
  styles: [`
    .timer { display: flex; flex-direction: column; align-items: center; gap: var(--s-4); padding-top: var(--s-6); }
    .timer__head { text-align: center; }
    .timer__sub { margin: var(--s-1) 0 0; font-size: 0.85rem; }
    .timer__dial { position: relative; display: grid; place-items: center; }
    .timer__readout {
      position: absolute; font-size: 3rem; font-weight: 700; letter-spacing: 0.02em; color: var(--text-1);
    }
    .timer__cycles { display: flex; gap: var(--s-2); }
    .pip { width: 10px; height: 10px; border-radius: 999px; background: var(--border-2); }
    .pip--done { background: var(--accent); }
    .timer__actions { display: flex; gap: var(--s-3); align-items: center; flex-wrap: wrap; justify-content: center; }
    .timer__hint { font-size: 0.85rem; }

    :host ::ng-deep .timer__pause .p-button-label,
    :host ::ng-deep .timer__pause .p-button-icon {
      color: var(--text-1);
    }
    :host ::ng-deep .timer__pause:hover {
      background: var(--surface-3);
      border-color: var(--border-3);
    }
  `],
})
export class TimerPageComponent {
  readonly timer = inject(TimerService);
  readonly settings = inject(SettingsService);

  readonly state = this.timer.state;
  readonly dialValue = computed(() => Math.round(this.timer.progress() * 100));

  readonly cyclePips = computed(() =>
    Array.from({ length: this.settings.settings().longBreakEvery }, (_, i) => i),
  );

  phaseKey(): string {
    return {
      idle: 'timer.phase.idle',
      focus: 'timer.phase.focus',
      break: 'timer.phase.break',
      longBreak: 'timer.phase.longBreak',
    }[this.state().phase];
  }

  subKey(): string {
    const s = this.state();
    if (s.phase === 'idle') return 'timer.sub.idle';
    if (s.phase === 'focus') return 'timer.sub.focus';
    return 'timer.sub.break';
  }
}
