import { ChangeDetectionStrategy, Component, ElementRef, HostListener, afterNextRender, computed, effect, inject, signal } from '@angular/core';
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
  template: `
    <div class="ob" role="dialog" aria-modal="true" aria-labelledby="ob-title">
      <div class="ob__card">
        <!-- progress -->
        <div class="ob__dots" aria-hidden="true">
          @for (i of stepIndices; track i) {
            <span class="ob__dot" [class.ob__dot--active]="i === step()"></span>
          }
        </div>

        @switch (step()) {
          @case (0) {
            <div class="ob__body">
              <div class="ob__icon"><i class="pi pi-bolt"></i></div>
              <h2 class="ob__title" id="ob-title" tabindex="-1">{{ 'onboard.welcome.title' | t }}</h2>
              <p class="ob__text muted">{{ 'onboard.welcome.text' | t }}</p>
            </div>
          }
          @case (1) {
            <div class="ob__body">
              <h2 class="ob__title" id="ob-title" tabindex="-1">{{ 'onboard.rhythm.title' | t }}</h2>
              <p class="ob__text muted">{{ 'onboard.rhythm.text' | t }}</p>
              <div class="ob__presets">
                @for (p of presets; track p.id) {
                  <button class="ob__preset" [class.ob__preset--sel]="chosen() === p.id"
                          (click)="choosePreset(p)">
                    <span class="ob__preset-name">{{ p.name }}</span>
                    <span class="ob__preset-meta muted mono">{{ p.focusMinutes }}/{{ p.breakMinutes }}</span>
                  </button>
                }
              </div>
            </div>
          }
          @case (2) {
            <div class="ob__body">
              <div class="ob__icon"><i class="pi pi-bell"></i></div>
              <h2 class="ob__title" id="ob-title" tabindex="-1">{{ 'onboard.notif.title' | t }}</h2>
              <p class="ob__text muted">{{ 'onboard.notif.text' | t }}</p>
              @if (platform.isIOS) {
                <p class="ob__hint">{{ 'onboard.notif.ios' | t }}</p>
              } @else if (notify.permission() === 'granted') {
                <p class="ob__ok"><i class="pi pi-check-circle"></i> {{ 'onboard.notif.granted' | t }}</p>
              } @else {
                <p-button [label]="'onboard.notif.enable' | t" icon="pi pi-bell"
                          [outlined]="true" (onClick)="enableNotifications()" />
              }
            </div>
          }
          @case (3) {
            <div class="ob__body">
              <div class="ob__icon ob__icon--done"><i class="pi pi-check"></i></div>
              <h2 class="ob__title" id="ob-title" tabindex="-1">{{ 'onboard.done.title' | t }}</h2>
              <p class="ob__text muted">{{ 'onboard.done.text' | t }}</p>
            </div>
          }
        }

        <!-- nav -->
        <div class="ob__nav">
          @if (step() > 0) {
            <p-button [label]="'onboard.back' | t" [text]="true" severity="secondary"
                      (onClick)="back()" />
          } @else {
            <p-button [label]="'onboard.skip' | t" [text]="true" severity="secondary"
                      (onClick)="finish()" />
          }
          @if (step() < lastStep) {
            <p-button [label]="'onboard.next' | t" icon="pi pi-arrow-right" iconPos="right"
                      (onClick)="next()" />
          } @else {
            <p-button [label]="'onboard.start' | t" icon="pi pi-play"
                      (onClick)="finish()" />
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ob { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center;
          background: rgba(4, 4, 8, 0.92); backdrop-filter: blur(8px);
          padding: var(--s-3); padding-bottom: calc(var(--s-3) + env(safe-area-inset-bottom)); }
    .ob__card { width: 100%; max-width: 380px; background: var(--surface-1);
                border: 1px solid var(--border-2); border-radius: 20px; padding: var(--s-4);
                display: flex; flex-direction: column; gap: var(--s-4); }
    .ob__dots { display: flex; gap: 6px; justify-content: center; }
    .ob__dot { width: 7px; height: 7px; border-radius: 999px; background: var(--border-3); transition: background .2s, width .2s; }
    .ob__dot--active { background: var(--accent); width: 20px; }
    .ob__body { display: flex; flex-direction: column; align-items: center; gap: var(--s-2);
                text-align: center; min-height: 220px; justify-content: center; }
    .ob__icon { width: 64px; height: 64px; border-radius: 999px; display: grid; place-items: center;
                background: var(--accent-15); color: var(--accent); font-size: 1.8rem; margin-bottom: var(--s-1); }
    .ob__icon--done { background: rgba(125, 240, 168, 0.15); color: #7df0a8; }
    .ob__title { margin: 0; font-size: 1.4rem; color: var(--text-1); }
    .ob__title:focus { outline: none; }
    .ob__text { margin: 0; font-size: 0.92rem; line-height: 1.5; }
    .ob__hint { font-size: 0.82rem; color: var(--warn); margin: var(--s-1) 0 0; }
    .ob__ok { color: #7df0a8; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 6px; }
    .ob__presets { display: flex; flex-direction: column; gap: var(--s-2); width: 100%; margin-top: var(--s-2); }
    .ob__preset { display: flex; justify-content: space-between; align-items: center;
                  background: var(--surface-2); border: 1px solid var(--border-2); color: var(--text-1);
                  border-radius: 12px; padding: 12px 14px; cursor: pointer; transition: border-color .15s, background .15s; }
    .ob__preset:hover { border-color: var(--border-3); }
    .ob__preset--sel { border-color: var(--accent); background: var(--accent-08); }
    .ob__preset-name { font-size: 0.95rem; }
    .ob__preset-meta { font-size: 0.82rem; }
    .ob__nav { display: flex; justify-content: space-between; align-items: center; gap: var(--s-2); }
    :host ::ng-deep .ob__nav .p-button { white-space: nowrap; }
  `],
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
  @HostListener('keydown', ['$event'])
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
