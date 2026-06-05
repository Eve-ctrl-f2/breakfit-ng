import { renderWith } from '../../testing/component-test';
import { TimerPageComponent } from './timer-page.component';
import { TimerService } from '@core/services/timer.service';
import { SettingsService } from '@core/services/settings.service';
import { MeetingService } from '@core/services/meeting.service';

describe('TimerPageComponent', () => {
  it('constructs with timer/settings/meeting wired', () => {
    const { instance } = renderWith(
      TimerPageComponent,
      [
        { provide: TimerService, useValue: {} },
        { provide: SettingsService, useValue: {} },
        { provide: MeetingService, useValue: {} },
      ],
      { detect: false },
    );
    expect(instance).toBeTruthy();
  });
});
