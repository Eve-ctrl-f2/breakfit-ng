import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TimerService } from './core/services/timer.service';
import { NotificationService } from './core/services/notification.service';
import { SyncCoordinatorService } from './core/services/sync-coordinator.service';
import { NativeReminderService } from './core/services/native-reminder.service';
import { BreakModalComponent } from './features/break/break-modal.component';
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { ToastComponent } from './shared/toast.component';
import { OnboardingService } from './core/services/onboarding.service';
import { TPipe } from './core/i18n/t.pipe';

@Component({
  selector: 'bf-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BreakModalComponent, OnboardingComponent, ToastComponent, TPipe],
  host: { '(document:visibilitychange)': 'onVisibility()' },
  template: `
    <div class="app-shell">
      <a class="skip-link" href="#main">{{ 'a11y.skip' | t }}</a>

      <!-- desktop / mouse: top pill nav -->
      <nav class="top-nav" [attr.aria-label]="'a11y.nav' | t">
        <a routerLink="/timer" routerLinkActive="active" ariaCurrentWhenActive="page"><i class="pi pi-clock" aria-hidden="true"></i> {{ 'nav.timer' | t }}</a>
        <a routerLink="/insights" routerLinkActive="active" ariaCurrentWhenActive="page"><i class="pi pi-chart-bar" aria-hidden="true"></i> {{ 'nav.insights' | t }}</a>
        <a routerLink="/settings" routerLinkActive="active" ariaCurrentWhenActive="page"><i class="pi pi-cog" aria-hidden="true"></i> {{ 'nav.settings' | t }}</a>
      </nav>

      <main class="app-main" id="main" tabindex="-1">
        <router-outlet />
      </main>

      <!-- phone + touch: bottom nav -->
      <nav class="bottom-nav" [attr.aria-label]="'a11y.nav' | t">
        <a routerLink="/timer" routerLinkActive="active" ariaCurrentWhenActive="page"><i class="pi pi-clock" aria-hidden="true"></i><span>{{ 'nav.timer' | t }}</span></a>
        <a routerLink="/insights" routerLinkActive="active" ariaCurrentWhenActive="page"><i class="pi pi-chart-bar" aria-hidden="true"></i><span>{{ 'nav.insights' | t }}</span></a>
        <a routerLink="/settings" routerLinkActive="active" ariaCurrentWhenActive="page"><i class="pi pi-cog" aria-hidden="true"></i><span>{{ 'nav.settings' | t }}</span></a>
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

      <!-- transient snackbar (e.g. undo after stopping a session) -->
      <bf-toast />
    </div>
  `,
})
export class App {
  private timer = inject(TimerService);
  private notify = inject(NotificationService);
  private sync = inject(SyncCoordinatorService);
  private nativeReminder = inject(NativeReminderService);
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

    // tab-title + app-icon alert cue. A browser tab title can't hold an icon,
    // so we use a neutral typographic marker (not an emoji); installed PWAs also
    // get a real app-icon badge via the Badging API where it's supported.
    effect(() => {
      const alert = this.notify.titleAlert();
      const base = 'BreakFit';
      this.titleSvc.setTitle(alert ? `\u25CF ${base}` : base);
      const nav = navigator as Navigator & {
        setAppBadge?: (n?: number) => Promise<void>;
        clearAppBadge?: () => Promise<void>;
      };
      try {
        if (alert) void nav.setAppBadge?.(1);
        else void nav.clearAppBadge?.();
      } catch {
        /* badging unsupported — ignore */
      }
    });
  }

  onVisibility(): void {
    if (document.visibilityState === 'visible') {
      this.timer.resync();
      this.notify.clearTitleAlert();
    }
  }
}
