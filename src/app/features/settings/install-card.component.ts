import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PlatformService } from '@core/services/platform.service';
import { TPipe } from '@core/i18n/t.pipe';

/**
 * InstallCardComponent — surfaces the right install affordance per platform.
 *  - Chromium/Android: a native install button (beforeinstallprompt captured).
 *  - iOS Safari: a manual "Add to Home Screen" hint (iOS has no install API).
 *  - already installed / unsupported: a confirmation or nothing.
 * Installing as a PWA is also what unlocks reliable notifications on iOS, so
 * this card does double duty.
 */
@Component({
  selector: 'bf-install-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TPipe],
  templateUrl: './install-card.component.html',
  styleUrl: './install-card.component.scss',
})
export class InstallCardComponent {
  readonly platform = inject(PlatformService);

  install(): void {
    void this.platform.promptInstall();
  }
}
