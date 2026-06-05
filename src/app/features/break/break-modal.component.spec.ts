import { renderWith } from '../../testing/component-test';
import { BreakModalComponent } from './break-modal.component';
import { RecommendationService } from '@core/services/recommendation.service';
import { TimerService } from '@core/services/timer.service';
import { HistoryService } from '@core/services/history.service';
import { MeetingService } from '@core/services/meeting.service';
import { SyncService } from '@core/api/sync.service';
import { HealthService } from '@core/services/health.service';

describe('BreakModalComponent', () => {
  it('constructs with all its services wired', () => {
    const { instance } = renderWith(
      BreakModalComponent,
      [
        { provide: RecommendationService, useValue: {} },
        { provide: TimerService, useValue: {} },
        { provide: HistoryService, useValue: {} },
        { provide: MeetingService, useValue: {} },
        { provide: SyncService, useValue: {} },
        { provide: HealthService, useValue: {} },
      ],
      { detect: false },
    );
    expect(instance).toBeTruthy();
  });
});
