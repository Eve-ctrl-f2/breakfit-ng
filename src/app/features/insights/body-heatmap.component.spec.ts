import { signal } from '@angular/core';
import { renderWith } from '../../testing/component-test';
import { BodyHeatmapComponent } from './body-heatmap.component';
import { HistoryService } from '@core/services/history.service';

describe('BodyHeatmapComponent', () => {
  it('shows the empty state when there is no recent history', () => {
    const { el, instance } = renderWith(BodyHeatmapComponent, [
      { provide: HistoryService, useValue: { entries: signal([]) } },
    ]);
    expect(instance).toBeTruthy();
    expect(el.querySelector('.muted')).toBeTruthy();
  });
});
