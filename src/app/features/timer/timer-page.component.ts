import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { KnobModule } from 'primeng/knob';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { TimerService } from '@core/services/timer.service';
import { SettingsService } from '@core/services/settings.service';

@Component({
  selector: 'bf-timer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, KnobModule, TagModule, FormsModule],
  template: `
    <section class="container timer">
      <header class="timer__head">
        <p class="section-title">{{ phaseLabel() }}</p>
        <p class="muted timer__sub">{{ subLabel() }}</p>
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

      <div class="timer__cycles" aria-label="Abgeschlossene Zyklen">
        @for (i of cyclePips(); track i) {
          <span class="pip" [class.pip--done]="i < state().cyclesCompleted"></span>
        }
      </div>

      <div class="timer__actions">
        @if (state().phase === 'idle') {
          <p-button label="Fokus starten" icon="pi pi-play" size="large" (onClick)="timer.startFocus()" />
        } @else if (state().running) {
          <p-button label="Pause" icon="pi pi-pause" severity="secondary" size="large" (onClick)="timer.pause()" />
          <p-button label="Stop" icon="pi pi-stop" [text]="true" severity="danger" (onClick)="timer.reset()" />
        } @else {
          <p-button label="Weiter" icon="pi pi-play" size="large" (onClick)="timer.resume()" />
          <p-button label="Stop" icon="pi pi-stop" [text]="true" severity="danger" (onClick)="timer.reset()" />
        }
      </div>

      @if (state().phase === 'idle') {
        <p class="muted timer__hint">
          {{ settings.settings().focusMinutes }} Min Fokus · {{ settings.settings().breakMinutes }} Min Pause
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

  phaseLabel(): string {
    return {
      idle: 'Bereit',
      focus: 'Fokus',
      break: 'Pause',
      longBreak: 'Lange Pause',
    }[this.state().phase];
  }

  subLabel(): string {
    const s = this.state();
    if (s.phase === 'idle') return 'Starte einen Fokus-Block.';
    if (s.phase === 'focus') return 'Konzentriert bleiben.';
    return 'Zeit für eine Übung.';
  }
}
