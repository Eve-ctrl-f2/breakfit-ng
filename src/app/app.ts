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
import { BreakModalComponent } from './features/break/break-modal.component';

@Component({
  selector: 'bf-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BreakModalComponent],
  template: `
    <div class="app-shell dark">
      <!-- desktop / mouse: top pill nav -->
      <nav class="top-nav" aria-label="Hauptnavigation">
        <a routerLink="/timer" routerLinkActive="active"><i class="pi pi-clock"></i> Timer</a>
        <a routerLink="/insights" routerLinkActive="active"><i class="pi pi-chart-bar"></i> Insights</a>
        <a routerLink="/settings" routerLinkActive="active"><i class="pi pi-cog"></i> Einstellungen</a>
      </nav>

      <main class="app-main">
        <router-outlet />
      </main>

      <!-- phone + touch: bottom nav -->
      <nav class="bottom-nav" aria-label="Hauptnavigation">
        <a routerLink="/timer" routerLinkActive="active"><i class="pi pi-clock"></i><span>Timer</span></a>
        <a routerLink="/insights" routerLinkActive="active"><i class="pi pi-chart-bar"></i><span>Insights</span></a>
        <a routerLink="/settings" routerLinkActive="active"><i class="pi pi-cog"></i><span>Settings</span></a>
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
  private titleSvc = inject(Title);

  readonly breakOpen = signal(false);

  constructor() {
    // open the break modal whenever the timer signals a break is due
    effect(() => {
      if (this.timer.breakDue() > 0) this.breakOpen.set(true);
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
