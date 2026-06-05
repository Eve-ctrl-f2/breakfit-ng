import { signal } from '@angular/core';
import { renderWith } from '../../testing/component-test';
import { InstallCardComponent } from './install-card.component';
import { PlatformService } from '@core/services/platform.service';

describe('InstallCardComponent', () => {
  it('falls back to the "unavailable" hint when no install path applies', () => {
    const { el, instance } = renderWith(InstallCardComponent, [
      {
        provide: PlatformService,
        useValue: {
          isStandalone: signal(false),
          installed: signal(false),
          canInstall: signal(false),
          showIosInstallHint: signal(false),
          promptInstall: async () => undefined,
        },
      },
    ]);
    expect(instance).toBeTruthy();
    expect(el.textContent).toContain('install.unavailable');
  });
});
