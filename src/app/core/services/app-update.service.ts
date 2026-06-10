import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { UiToastService } from './ui-toast.service';
import { TranslationService } from '@core/i18n/translation.service';

/**
 * AppUpdateService — closes the "testers see a stale build" gap.
 *
 * When the service worker fetches a new app version in the background, Angular
 * emits a VERSION_READY event. We surface a sticky toast inviting a reload;
 * tapping it activates the new version and reloads. We also poll for updates
 * periodically and on window focus, so a tester doesn't have to hard-refresh to
 * pick up a fix.
 *
 * No-op when the SW is disabled (dev, or unsupported browsers).
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly sw = inject(SwUpdate);
  private readonly toast = inject(UiToastService);
  private readonly i18n = inject(TranslationService);

  init(): void {
    if (!this.sw.isEnabled) return;

    this.sw.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => this.promptReload());

    // Proactively look for a newer build so the prompt appears without a manual
    // refresh. checkForUpdate() rejects if the SW isn't ready yet — swallow it.
    const check = () => { void this.sw.checkForUpdate().catch(() => undefined); };
    setInterval(check, 60_000);
    window.addEventListener('focus', check);
  }

  private promptReload(): void {
    this.toast.show(
      {
        message: this.i18n.t('update.available'),
        actionLabel: this.i18n.t('common.reload'),
        action: () => {
          void this.sw
            .activateUpdate()
            .catch(() => undefined)
            .then(() => document.location.reload());
        },
      },
      0, // sticky — must not time out before the user can reload
    );
  }
}
