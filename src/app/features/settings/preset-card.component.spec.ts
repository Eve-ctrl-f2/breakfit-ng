import { signal } from '@angular/core';
import { renderWith } from '../../testing/component-test';
import { PresetCardComponent } from './preset-card.component';
import { PresetService } from '@core/services/preset.service';

describe('PresetCardComponent', () => {
  it('creates and renders without presets', () => {
    const { el, instance } = renderWith(PresetCardComponent, [
      {
        provide: PresetService,
        useValue: { all: signal([]), apply: () => undefined, save: () => undefined, delete: () => undefined },
      },
    ]);
    expect(instance).toBeTruthy();
    expect(el.innerHTML.length).toBeGreaterThan(0);
  });
});
