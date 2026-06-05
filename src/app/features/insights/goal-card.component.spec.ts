import { signal } from '@angular/core';
import { renderWith } from '../../testing/component-test';
import { GoalCardComponent } from './goal-card.component';
import { GoalService } from '@core/services/goal.service';

describe('GoalCardComponent', () => {
  it('renders weekly progress and target', () => {
    const { el, instance } = renderWith(GoalCardComponent, [
      {
        provide: GoalService,
        useValue: {
          weeklyDone: signal(false),
          weeklyProgress: signal(2),
          weeklyTarget: signal(5),
          weeklyPercent: signal(40),
          setTarget: () => undefined,
        },
      },
    ]);
    expect(instance).toBeTruthy();
    expect(el.querySelector('.goal')).toBeTruthy();
    expect(el.querySelector('.goal__num')?.textContent).toContain('2');
  });
});
