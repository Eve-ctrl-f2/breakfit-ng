import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RecapCardComponent } from './recap-card.component';
import { HistoryService } from '@core/services/history.service';
import { TranslationService } from '@core/i18n/translation.service';
import type { WeeklyRecap } from '@core/services/history.service';

/**
 * Component spec pattern: stand the standalone component up in TestBed with the
 * services it injects replaced by lightweight stubs. No real IndexedDB/HTTP is
 * touched, so it runs fast and deterministically under vitest + jsdom.
 */
function setup(recap: WeeklyRecap) {
  TestBed.configureTestingModule({
    imports: [RecapCardComponent],
    providers: [
      provideZonelessChangeDetection(),
      { provide: HistoryService, useValue: { recap: signal(recap) } },
      { provide: TranslationService, useValue: { t: (key: string) => key } },
    ],
  });
  const fixture = TestBed.createComponent(RecapCardComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const empty: WeeklyRecap = { thisWeek: 0, lastWeek: 0, delta: 0, thisWeekByDay: [0, 0, 0, 0, 0, 0, 0] };

describe('RecapCardComponent', () => {
  it('renders the empty state when there are no breaks', () => {
    const el = setup(empty);
    expect(el.querySelector('.recap')).toBeTruthy();
    expect(el.querySelector('.recap__empty')).toBeTruthy();
    expect(el.querySelector('.recap__bars')).toBeNull();
  });

  it('shows the count, an up-trend delta and the 7-day bars', () => {
    const el = setup({ thisWeek: 5, lastWeek: 3, delta: 2, thisWeekByDay: [1, 0, 2, 0, 1, 1, 0] });
    expect(el.querySelector('.recap__num')?.textContent?.trim()).toBe('5');
    expect(el.querySelector('.recap__delta--up')).toBeTruthy();
    expect(el.querySelectorAll('.recap__col').length).toBe(7);
  });
});
