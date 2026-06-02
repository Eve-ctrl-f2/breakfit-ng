import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TimerService } from './core/services/timer.service';
import { NotificationService } from './core/services/notification.service';
import { MeetingService } from './core/services/meeting.service';
import { BreakModalComponent } from './features/break/break-modal.component';
import { TPipe } from './core/i18n/t.pipe';

@Component({
  selector: 'bf-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BreakModalComponent, TPipe],
  template: `
    <div class="app-shell dark">
      <!-- desktop / mouse: top pill nav -->
      <nav class="top-nav" [attr.aria-label]="'a11y.nav' | t">
        <a routerLink="/timer" routerLinkActive="active"><i class="pi pi-clock"></i> {{ 'nav.timer' | t }}</a>
        <a routerLink="/insights" routerLinkActive="active"><i class="pi pi-chart-bar"></i> {{ 'nav.insights' | t }}</a>
        <a routerLink="/settings" routerLinkActive="active"><i class="pi pi-cog"></i> {{ 'nav.settings' | t }}</a>
      </nav>

      <main class="app-main">
        <router-outlet />
      </main>

      <!-- phone + touch: bottom nav -->
      <nav class="bottom-nav" [attr.aria-label]="'a11y.nav' | t">
        <a routerLink="/timer" routerLinkActive="active"><i class="pi pi-clock"></i><span>{{ 'nav.timer' | t }}</span></a>
        <a routerLink="/insights" routerLinkActive="active"><i class="pi pi-chart-bar"></i><span>{{ 'nav.insights' | t }}</span></a>
        <a routerLink="/settings" routerLinkActive="active"><i class="pi pi-cog"></i><span>{{ 'nav.settings' | t }}</span></a>
      </nav>

      <!-- global break modal, opened when a focus interval elapses -->
      <bf-break-modal
        [open]="breakOpen()"
        (closed)="breakOpen.set(false)"
      />
    </div>
  `,
})
export class App {
  private timer = inject(TimerService);
  private notify = inject(NotificationService);
  private meeting = inject(MeetingService);
  private titleSvc = inject(Title);

  readonly breakOpen = signal(false);

  constructor() {
    // open the break modal whenever the timer signals a break is due,
    // UNLESS a meeting is active — then silently restart focus.
    effect(() => {
      if (this.timer.breakDue() > 0) {
        if (this.meeting.isActive()) {
          this.timer.startFocus();
        } else {
          this.breakOpen.set(true);
        }
      }
    });

    // tab-title alert cue (🔔 lives here, not in system notifications)
    effect(() => {
      const base = 'BreakFit';
      this.titleSvc.setTitle(this.notify.titleAlert() ? `🔔 ${base}` : base);
    });
  }

  @HostListener('document:visibilitychange')
  onVisibility(): void {
    if (document.visibilityState === 'visible') {
      this.timer.resync();
      this.notify.clearTitleAlert();
    }
  }
}
