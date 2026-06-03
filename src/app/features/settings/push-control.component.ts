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
  template: `
    @if (push.available) {
      <div class="set__toggle">
        <span>{{ 'push.serverLabel' | t }}</span>
        <p-toggleswitch [ngModel]="push.subscribed()" [disabled]="push.busy()"
                        (ngModelChange)="toggle($event)" />
      </div>
      @if (push.subscribed()) {
        <div class="set__toggle">
          <span>{{ 'push.reminderLabel' | t }}</span>
          <p-toggleswitch [ngModel]="push.reminderEnabled()" [disabled]="push.busy()"
                          (ngModelChange)="push.setReminder($event)" />
        </div>
        @if (isDev) {
          <p-button [label]="'push.test' | t" icon="pi pi-send" [text]="true" size="small"
                    (onClick)="push.sendTest()" />
        }
      }
    } @else if (showIosHint()) {
      <p class="muted set__hint">{{ 'push.iosHint' | t }}</p>
    }
  `,
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
