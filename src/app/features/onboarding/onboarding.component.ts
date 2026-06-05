import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, effect, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PresetService, type FocusPreset } from '@core/services/preset.service';
import { NotificationService } from '@core/services/notification.service';
import { PlatformService } from '@core/services/platform.service';
import { OnboardingService } from '@core/services/onboarding.service';
import { TPipe } from '@core/i18n/t.pipe';

/**
 * OnboardingComponent — first-run wizard, shown over the app on a fresh install.
 *
 * Steps: welcome → pick a focus rhythm (applies a preset) → notifications
 * (requests permission on tap; iOS gets an "add to home screen" hint instead) →
 * done. Fully keyboard- and screen-reader-navigable, all copy via i18n. Skipping
 * at any point still marks onboarding complete so it never nags again.
 */
@Component({
  selector: 'bf-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TPipe],
  host: { '(keydown)': 'onKeydown($event)' },
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
})
export class OnboardingComponent {
  private presetSvc = inject(PresetService);
  readonly notify = inject(NotificationService);
  readonly platform = inject(PlatformService);
  private onboarding = inject(OnboardingService);
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly lastStep = 3;
  readonly stepIndices = [0, 1, 2, 3];
  readonly step = signal(0);
  readonly chosen = signal<string | null>(null);

  readonly presets = PresetService.BUILT_INS;

  constructor() {
    // move focus into the wizard once it's rendered, and to the new step's
    // heading on each step change (so screen readers announce it)
    afterNextRender(() => this.focusHeading());
    effect(() => {
      this.step();
      queueMicrotask(() => this.focusHeading());
    });
  }

  /** Keep Tab focus inside the dialog; Escape skips onboarding. */
  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { e.preventDefault(); this.finish(); return; }
    if (e.key !== 'Tab') return;
    const f = this.focusables();
    if (f.length === 0) return;
    const first = f[0];
    const last = f[f.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || active === this.heading())) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault(); first.focus();
    }
  }

  private heading(): HTMLElement | null {
    return this.el.nativeElement.querySelector<HTMLElement>('#ob-title');
  }
  private focusHeading(): void {
    this.heading()?.focus();
  }
  private focusables(): HTMLElement[] {
    return Array.from(
      this.el.nativeElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
  }

  next(): void {
    if (this.step() < this.lastStep) this.step.update((s) => s + 1);
  }
  back(): void {
    if (this.step() > 0) this.step.update((s) => s - 1);
  }

  choosePreset(p: FocusPreset): void {
    this.chosen.set(p.id);
    this.presetSvc.apply(p);
  }

  async enableNotifications(): Promise<void> {
    await this.notify.requestPermission();
  }

  finish(): void {
    void this.onboarding.complete();
  }
}
