import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ButtonModule } from 'primeng/button';
import { PushService } from '@core/api/push.service';
import { PlatformService } from '@core/services/platform.service';
import { TPipe } from '@core/i18n/t.pipe';
import { environment } from '@env/environment';

/**
 * PushControlComponent — opt-in toggle for server Web Push. Only renders when
 * push is actually available on this platform; on iOS not-yet-installed it
 * shows a short hint pointing at the install card instead of a dead toggle.
 */
@Component({
  selector: 'bf-push-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ToggleSwitchModule, ButtonModule, TPipe],
  templateUrl: './push-control.component.html',
})
export class PushControlComponent {
  readonly push = inject(PushService);
  private platform = inject(PlatformService);
  readonly isDev = !environment.production;

  showIosHint(): boolean {
    // cloud + key configured, on iOS but not installed yet
    return (
      environment.cloudEnabled &&
      !!environment.vapidPublicKey &&
      this.platform.isIOS &&
      !this.platform.isStandalone()
    );
  }

  async toggle(on: boolean): Promise<void> {
    if (on) await this.push.enable();
    else await this.push.disable();
  }
}
