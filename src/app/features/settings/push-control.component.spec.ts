import { signal } from '@angular/core';
import { renderWith } from '../../testing/component-test';
import { PushControlComponent } from './push-control.component';
import { PushService } from '@core/api/push.service';
import { PlatformService } from '@core/services/platform.service';

describe('PushControlComponent', () => {
  it('creates when push is unavailable on this platform', () => {
    const { instance } = renderWith(PushControlComponent, [
      {
        provide: PushService,
        useValue: {
          available: false,
          subscribed: signal(false),
          busy: signal(false),
          reminderEnabled: signal(false),
          setReminder: () => undefined,
          sendTest: async () => undefined,
          enable: async () => undefined,
          disable: async () => undefined,
        },
      },
      { provide: PlatformService, useValue: { isIOS: false, isStandalone: () => false } },
    ]);
    expect(instance).toBeTruthy();
  });
});
