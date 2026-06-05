import { renderWith } from '../../testing/component-test';
import { CustomExerciseFormComponent } from './custom-exercise-form.component';
import { ExercisePoolService } from '@core/services/exercise-pool.service';

describe('CustomExerciseFormComponent', () => {
  it('shows the add trigger when closed and the form when opened', () => {
    const { fixture, el, instance } = renderWith(CustomExerciseFormComponent, [
      { provide: ExercisePoolService, useValue: {} },
    ]);
    // closed: no form, just the add trigger button
    expect(el.querySelector('.exf')).toBeNull();
    expect(el.querySelector('button')).toBeTruthy();

    // open it via the component's public signal
    instance.open.set(true);
    fixture.detectChanges();
    expect(el.querySelector('.exf')).toBeTruthy();
  });
});
