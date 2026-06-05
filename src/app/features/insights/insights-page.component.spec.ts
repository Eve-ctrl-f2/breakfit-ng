import { renderWith } from '../../testing/component-test';
import { InsightsPageComponent } from './insights-page.component';
import { HistoryService } from '@core/services/history.service';

describe('InsightsPageComponent', () => {
  it('constructs with its services wired', () => {
    const { instance } = renderWith(
      InsightsPageComponent,
      [{ provide: HistoryService, useValue: {} }],
      { detect: false },
    );
    expect(instance).toBeTruthy();
  });
});
