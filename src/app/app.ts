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
import { SyncCoordinatorService } from './core/services/sync-coordinator.service';
import { BreakModalComponent } from './features/break/break-modal.component';
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { OnboardingService } from './core/services/onboarding.service';
import { TPipe } from './core/i18n/t.pipe';

@Component({
  selector: 'bf-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BreakModalComponent, OnboardingComponent, TPipe],
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

      <!-- first-run onboarding overlay -->
      @if (onboarding.shouldShow()) {
        <bf-onboarding />
      }
    </div>
  `,
})
export class App {
  private timer = inject(TimerService);
  private notify = inject(NotificationService);
  private sync = inject(SyncCoordinatorService);
  readonly onboarding = inject(OnboardingService);
  private titleSvc = inject(Title);

  readonly breakOpen = signal(false);

  constructor() {
    // kick off offline-first sync (no-op unless cloud is enabled + authed)
    this.sync.init();
    // breakDue is a pure UI pulse from the timer (break + meeting logic lives
    // in TimerService). This effect ONLY opens the modal — it never writes
    // timer state, so there is no read/write feedback cycle (the previous
    // version read _state via isLongBreakDue() AND wrote it via startBreak(),
    // which self-triggered forever and froze the app).
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
