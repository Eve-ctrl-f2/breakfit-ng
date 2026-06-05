import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideI18nStub } from '../../testing/component-test';
import { SettingsPageComponent } from './settings-page.component';
import { SettingsService } from '@core/services/settings.service';
import { ExercisePoolService } from '@core/services/exercise-pool.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/api/auth.service';
import { SyncService } from '@core/api/sync.service';
import { HealthService } from '@core/services/health.service';

/**
 * Shallow smoke test: the settings page is a container that pulls in several
 * child cards (push-control -> SwPush, install-card -> matchMedia, ...) whose
 * real services need browser/SW APIs jsdom doesn't provide. We override the
 * template to empty so we verify the page constructs and its own DI resolves,
 * without standing up the whole subtree. Interactions are covered by the
 * Playwright settings e2e.
 */
describe('SettingsPageComponent', () => {
  it('constructs with its own services wired (shallow)', () => {
    TestBed.configureTestingModule({
      imports: [SettingsPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideI18nStub(),
        { provide: SettingsService, useValue: { patch: () => undefined } },
        { provide: ExercisePoolService, useValue: {} },
        { provide: NotificationService, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: SyncService, useValue: {} },
        { provide: HealthService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(SettingsPageComponent, { set: { template: '' } });
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
