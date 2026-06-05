import { renderWith } from '../../testing/component-test';
import { OnboardingComponent } from './onboarding.component';
import { PresetService } from '@core/services/preset.service';
import { NotificationService } from '@core/services/notification.service';
import { PlatformService } from '@core/services/platform.service';
import { OnboardingService } from '@core/services/onboarding.service';

function providers() {
  return [
    { provide: PresetService, useValue: { apply: () => undefined } },
    { provide: NotificationService, useValue: {} },
    { provide: PlatformService, useValue: { isIOS: false, isStandalone: () => false } },
    { provide: OnboardingService, useValue: { complete: () => undefined } },
  ];
}

describe('OnboardingComponent', () => {
  it('starts on the welcome step', () => {
    const { instance } = renderWith(OnboardingComponent, providers());
    expect(instance.step()).toBe(0);
  });

  it('advances to the next step', () => {
    const { fixture, instance } = renderWith(OnboardingComponent, providers());
    instance.next();
    fixture.detectChanges();
    expect(instance.step()).toBe(1);
  });
});
