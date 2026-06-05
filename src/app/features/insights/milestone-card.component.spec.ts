import { signal } from '@angular/core';
import { renderWith } from '../../testing/component-test';
import { MilestoneCardComponent } from './milestone-card.component';
import { MilestoneService } from '@core/services/milestone.service';

describe('MilestoneCardComponent', () => {
  it('renders one row per milestone', () => {
    const { el, instance } = renderWith(MilestoneCardComponent, [
      {
        provide: MilestoneService,
        useValue: {
          milestones: signal([
            { id: 'streak3', icon: 'pi-bolt', labelKey: 'milestones.streak3', earned: true },
            { id: 'total10', icon: 'pi-star', labelKey: 'milestones.total10', earned: false },
          ]),
        },
      },
    ]);
    expect(instance).toBeTruthy();
    expect(el.querySelectorAll('.ms__label').length).toBe(2);
  });
});
