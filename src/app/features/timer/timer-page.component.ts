import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { KnobModule } from 'primeng/knob';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { TimerService } from '@core/services/timer.service';
import { SettingsService } from '@core/services/settings.service';
import { MeetingService, MEETING_PRESETS } from '@core/services/meeting.service';
import { TPipe } from '@core/i18n/t.pipe';

@Component({
  selector: 'bf-timer-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, KnobModule, TagModule, FormsModule, TPipe],
  templateUrl: './timer-page.component.html',
  styleUrl: './timer-page.component.scss',
})
export class TimerPageComponent {
  readonly timer = inject(TimerService);
  readonly settings = inject(SettingsService);
  readonly meeting = inject(MeetingService);
  readonly state = this.timer.state;

  readonly meetingPresets = MEETING_PRESETS;
  readonly meetingMenu = signal(false);

  startMeeting(minutes: number): void {
    this.meeting.start(minutes);
    this.meetingMenu.set(false);
  }
  readonly dialValue = computed(() => Math.round(this.timer.progress() * 100));
  readonly cyclePips = computed(() =>
    Array.from({ length: this.settings.settings().longBreakEvery }, (_, i) => i),
  );
  phaseKey(): string {
    return { idle:'timer.phase.idle', focus:'timer.phase.focus', break:'timer.phase.break', longBreak:'timer.phase.longBreak' }[this.state().phase];
  }
  subKey(): string {
    const s = this.state();
    if (s.phase === 'idle') return 'timer.sub.idle';
    if (s.phase === 'focus') return 'timer.sub.focus';
    return 'timer.sub.break';
  }
}
