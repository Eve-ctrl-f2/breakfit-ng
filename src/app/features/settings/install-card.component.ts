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
  template: `
    @if (platform.isStandalone() || platform.installed()) {
      <p class="muted install__ok"><i class="pi pi-check-circle"></i> {{ 'install.done' | t }}</p>
    } @else if (platform.canInstall()) {
      <p class="muted install__txt">{{ 'install.benefit' | t }}</p>
      <p-button [label]="'install.cta' | t" icon="pi pi-download" (onClick)="install()" />
    } @else if (platform.showIosInstallHint()) {
      <p class="muted install__txt">{{ 'install.iosHint' | t }}</p>
      <ol class="install__steps muted">
        <li>{{ 'install.iosStep1' | t }}</li>
        <li>{{ 'install.iosStep2' | t }}</li>
      </ol>
    } @else {
      <p class="muted install__txt">{{ 'install.unavailable' | t }}</p>
    }
  `,
  styles: [`
    .install__txt { font-size: 0.85rem; margin: 0 0 var(--s-2); }
    .install__ok { font-size: 0.9rem; color: var(--accent); display: inline-flex; align-items: center; gap: 6px; }
    .install__steps { font-size: 0.82rem; margin: 0; padding-left: 1.1rem; line-height: 1.6; }
  `],
})
export class InstallCardComponent {
  readonly platform = inject(PlatformService);

  install(): void {
    void this.platform.promptInstall();
  }
}
