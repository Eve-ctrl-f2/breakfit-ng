import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { SliderModule } from 'primeng/slider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import { environment } from '@env/environment';
import { SettingsService } from '@core/services/settings.service';
import { ExercisePoolService } from '@core/services/exercise-pool.service';
import { NotificationService } from '@core/services/notification.service';
import { TranslationService } from '@core/i18n/translation.service';
import { AuthService } from '@core/api/auth.service';
import { SyncService } from '@core/api/sync.service';
import { HealthService } from '@core/services/health.service';
import { TPipe } from '@core/i18n/t.pipe';
import { PresetCardComponent } from './preset-card.component';
import { CustomExerciseFormComponent } from './custom-exercise-form.component';
import { InstallCardComponent } from './install-card.component';
import { PushControlComponent } from './push-control.component';
import { CATEGORY_LABELS, CATEGORY_COLOR_VAR } from '@core/data/exercises.data';
import type { Difficulty, SelectionMode } from '@core/models/models';
import type { Locale } from '@core/i18n/translations';

@Component({
  selector: 'bf-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, CardModule, SliderModule, SelectButtonModule,
    ToggleSwitchModule, SelectModule, ButtonModule, TagModule, RouterLink, TPipe,
    PresetCardComponent, CustomExerciseFormComponent, InstallCardComponent, PushControlComponent,
  ],
  template: `
    <section class="container">
      <p class="section-title">{{ 'settings.title' | t }}</p>

      <!-- Timer -->
      <p-card styleClass="set-card">
        <p class="set__h">{{ 'settings.timer' | t }}</p>
        <label class="set__row">
          <span>{{ 'settings.focus' | t }} <b class="mono">{{ st().focusMinutes }} {{ 'settings.min' | t }}</b></span>
          <p-slider [ngModel]="st().focusMinutes" (ngModelChange)="patch({ focusMinutes: $event })"
                    [min]="5" [max]="60" [step]="5" />
        </label>
        <label class="set__row">
          <span>{{ 'settings.break' | t }} <b class="mono">{{ st().breakMinutes }} {{ 'settings.min' | t }}</b></span>
          <p-slider [ngModel]="st().breakMinutes" (ngModelChange)="patch({ breakMinutes: $event })"
                    [min]="1" [max]="15" [step]="1" />
        </label>
        <label class="set__row">
          <span>{{ 'settings.longBreakEvery' | t }} <b class="mono">{{ st().longBreakEvery }}</b></span>
          <p-slider [ngModel]="st().longBreakEvery" (ngModelChange)="patch({ longBreakEvery: $event })"
                    [min]="2" [max]="8" [step]="1" />
        </label>
        <div class="set__toggle">
          <span>{{ 'settings.autoStart' | t }}</span>
          <p-toggleswitch [ngModel]="st().autoStartNextFocus"
                          (ngModelChange)="patch({ autoStartNextFocus: $event })" />
        </div>

        <div class="set__restdays">
          <span>{{ 'settings.restDays' | t }}</span>
          <div class="set__wd" role="group" [attr.aria-label]="'settings.restDays' | t">
            @for (d of weekdays; track d.idx) {
              <button type="button" class="set__wd-btn"
                      [class.set__wd-btn--on]="isRestDay(d.idx)"
                      [attr.aria-pressed]="isRestDay(d.idx)"
                      (click)="toggleRestDay(d.idx)">{{ d.label }}</button>
            }
          </div>
          <p class="muted set__hint">{{ 'settings.restDaysHint' | t }}</p>
        </div>
      </p-card>

      <!-- Presets -->
      <p-card styleClass="set-card">
        <p class="set__h">{{ 'presets.title' | t }}</p>
        <bf-preset-card />
      </p-card>

      <!-- Difficulty -->
      <p-card styleClass="set-card">
        <p class="set__h">{{ 'settings.difficulty' | t }}</p>
        <p-selectbutton [options]="difficulties()" optionLabel="label" optionValue="value"
                        [allowEmpty]="false"
                        [ngModel]="st().difficulty"
                        (ngModelChange)="patch({ difficulty: $event })" />
      </p-card>

      <!-- Selection mode -->
      <p-card styleClass="set-card">
        <p class="set__h">{{ 'settings.mode' | t }}</p>
        <p-selectbutton [options]="modes()" optionLabel="label" optionValue="value"
                        [allowEmpty]="false"
                        [ngModel]="st().selectionMode"
                        (ngModelChange)="patch({ selectionMode: $event })" />
        <p class="muted set__hint">{{ modeHintKey() | t }}</p>
      </p-card>

      <!-- Exercise pool -->
      <p-card styleClass="set-card">
        <p class="set__h">
          {{ 'settings.pool' | t }}
          <span class="muted">{{ 'settings.poolActive' | t:{ count: pool.active().length } }}</span>
        </p>
        @for (ex of pool.all(); track ex.id) {
          <div class="ex">
            <span class="ex__cat" [style.background]="catColor(ex.category)"></span>
            <span class="ex__name">{{ ex.name }}</span>
            @if (ex.custom) {
              <button class="ex__del" (click)="form()?.editExercise(ex)"
                      [attr.aria-label]="'common.edit' | t" data-testid="exercise-edit">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="ex__del" (click)="pool.removeCustom(ex.id)"
                      [attr.aria-label]="'common.delete' | t" data-testid="exercise-delete">
                <i class="pi pi-trash"></i>
              </button>
            }
            <p-tag [value]="cat(ex.category)" severity="secondary" styleClass="ex__tag" />
            <p-toggleswitch [ngModel]="ex.enabled" (ngModelChange)="pool.toggle(ex.id, $event)" />
          </div>
        }
        <bf-custom-exercise-form />
      </p-card>

      <!-- Notifications -->
      <p-card styleClass="set-card">
        <p class="set__h">{{ 'settings.notif' | t }}</p>
        <div class="set__toggle">
          <span>{{ 'settings.push' | t }}</span>
          <p-toggleswitch [ngModel]="st().notificationsEnabled"
                          (ngModelChange)="onNotifToggle($event)" />
        </div>
        <div class="set__toggle">
          <span>{{ 'settings.sound' | t }}</span>
          <p-toggleswitch [ngModel]="st().soundEnabled"
                          (ngModelChange)="patch({ soundEnabled: $event })" />
        </div>
        <bf-push-control />
        @if (notify.permission() !== 'granted') {
          <p class="muted set__hint">{{ 'settings.notifHint' | t }}</p>
        }
      </p-card>

      <!-- Appearance -->
      <p-card styleClass="set-card">
        <p class="set__h">{{ 'settings.appearance' | t }}</p>
        <p-selectbutton [options]="themeOptions" optionLabel="label" optionValue="value"
                        [allowEmpty]="false"
                        [ngModel]="st().theme"
                        (ngModelChange)="patch({ theme: $event })" />
        <div class="set__accents" role="group" [attr.aria-label]="'settings.accent' | t">
          @for (a of accents; track a) {
            <button type="button" class="set__accent"
                    [class.set__accent--on]="st().accent === a"
                    [style.background]="accentColor(a)"
                    [attr.aria-pressed]="st().accent === a"
                    [attr.aria-label]="a" (click)="patch({ accent: a })"></button>
          }
        </div>
      </p-card>

      <!-- Language -->
      <p-card styleClass="set-card">
        <p class="set__h">{{ 'settings.language' | t }}</p>
        <p-selectbutton [options]="i18n.supported" optionLabel="label" optionValue="value"
                        [allowEmpty]="false"
                        [ngModel]="i18n.locale()"
                        (ngModelChange)="setLocale($event)" />
      </p-card>

      <!-- Health (Apple Health / Google Fit / Health Connect) -->
      <p-card styleClass="set-card">
        <p class="set__h">{{ 'settings.health' | t }}</p>
        @if (health.available()) {
          <div class="set__toggle">
            <span>{{ 'settings.healthLink' | t }}</span>
            <p-toggleswitch [ngModel]="health.linked()" (ngModelChange)="toggleHealth($event)" />
          </div>
        } @else {
          <p class="muted set__hint">{{ 'settings.healthUnavailable' | t }}</p>
        }
        <div class="set__cloud-actions">
          <p-button [label]="'settings.healthExport' | t" icon="pi pi-download"
                    [outlined]="true" size="small" (onClick)="health.exportTcx()" />
        </div>
        <p class="muted set__hint">{{ 'settings.healthHint' | t }}</p>
      </p-card>

      <!-- Cloud sync — only when flag is on -->
      @if (cloudEnabled) {
        <p-card styleClass="set-card">
          <p class="set__h">{{ 'settings.cloud' | t }}</p>
          @if (!auth.isAuthed()) {
            <p class="muted set__hint">{{ 'settings.cloudHint' | t }}</p>
            <p-button [label]="'settings.signin' | t" icon="pi pi-cloud" routerLink="/auth/login" />
          } @else {
            <p class="muted set__hint">{{ auth.user()?.email }}</p>
            <div class="set__cloud-actions">
              <p-button [label]="'settings.export' | t" icon="pi pi-download"
                        [outlined]="true" size="small" (onClick)="exportData()" />
              <p-button [label]="'settings.logout' | t" icon="pi pi-sign-out"
                        [text]="true" severity="secondary" size="small" (onClick)="auth.logout()" />
              <p-button [label]="'settings.logoutAll' | t" icon="pi pi-power-off"
                        [text]="true" severity="danger" size="small" (onClick)="auth.logoutAllDevices()" />
            </div>
          }
        </p-card>
      }

      <!-- Install / PWA -->
      <p-card styleClass="set-card">
        <p class="set__h">{{ 'install.title' | t }}</p>
        <bf-install-card />
      </p-card>

      <!-- Feedback -->
      <p-card styleClass="set-card">
        <p class="set__h">{{ 'settings.feedback' | t }}</p>
        <p-button [label]="'settings.sendFeedback' | t" icon="pi pi-envelope" [outlined]="true"
                  (onClick)="sendFeedback()" />
      </p-card>

      <!-- About -->
      <footer class="about muted">
        {{ 'settings.about' | t:{ version: version, date: buildDate() } }}
      </footer>
    </section>
  `,
  styles: [`
    :host { color: var(--text-1); }
    :host ::ng-deep .set-card { margin-bottom: var(--s-3); }
    :host ::ng-deep .set-card .p-card-body,
    :host ::ng-deep .set-card .p-card-content { color: var(--text-1); }
    .set__h { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em;
              color: var(--text-2); margin: 0 0 var(--s-3); }
    .set__row { display: flex; flex-direction: column; gap: var(--s-2); margin-bottom: var(--s-3); }
    .set__row span { font-size: 0.9rem; color: var(--text-1); }
    .set__row b { color: var(--accent); }
    .set__toggle { display: flex; justify-content: space-between; align-items: center;
                   padding: 8px 0; font-size: 0.9rem; color: var(--text-1); }
    .set__hint { font-size: 0.8rem; margin: var(--s-2) 0 0; }
    .set__cloud-actions { display: flex; flex-wrap: wrap; gap: var(--s-2); margin-top: var(--s-3); }
    .set__accents { display: flex; gap: var(--s-2); margin-top: var(--s-3); }
    .set__accent { width: 32px; height: 32px; border-radius: 999px; border: 2px solid transparent;
                   cursor: pointer; padding: 0; outline-offset: 3px; }
    .set__accent--on { border-color: var(--text-1); box-shadow: 0 0 0 2px var(--surface-1) inset; }
    .set__restdays { margin-top: var(--s-3); display: flex; flex-direction: column; gap: var(--s-2); }
    .set__wd { display: flex; gap: 6px; flex-wrap: wrap; }
    .set__wd-btn { flex: 1; min-width: 38px; padding: 8px 0; border-radius: 10px;
                   border: 1px solid var(--border-2); background: var(--surface-2);
                   color: var(--text-2); font-size: 0.82rem; cursor: pointer; transition: all .15s; }
    .set__wd-btn--on { background: var(--accent-15); border-color: var(--accent); color: var(--accent); font-weight: 600; }
    .ex { display: flex; align-items: center; gap: var(--s-2); padding: 8px 0;
          border-bottom: 1px solid var(--border-1); }
    .ex:last-child { border-bottom: none; }
    .ex__cat { width: 6px; height: 28px; border-radius: 3px; flex: 0 0 auto; }
    .ex__name { flex: 1 1 auto; font-size: 0.92rem; color: var(--text-1); }
    .ex__del { background: none; border: none; cursor: pointer; color: var(--text-3);
               padding: 4px; border-radius: 6px; display: flex; flex: 0 0 auto; }
    .ex__del:hover { color: var(--danger); background: rgba(240,104,104,0.12); }
    .about { text-align: center; padding: var(--s-4) 0; font-size: 0.8rem; }

    /* SelectButton: keep BOTH selected and unselected labels readable on dark */
    :host ::ng-deep .p-togglebutton { background: var(--surface-1); border-color: var(--border-2); }
    :host ::ng-deep .p-togglebutton .p-togglebutton-label { color: var(--text-2); }
    :host ::ng-deep .p-togglebutton:hover .p-togglebutton-label { color: var(--text-1); }
    :host ::ng-deep .p-togglebutton.p-togglebutton-checked { background: var(--accent-15); }
    :host ::ng-deep .p-togglebutton.p-togglebutton-checked .p-togglebutton-label { color: var(--accent); }

    /* category tag: light text on a subtle chip */
    :host ::ng-deep .ex__tag {
      font-size: 0.68rem;
      background: var(--surface-3);
      color: var(--text-1);
    }
  `],
})
export class SettingsPageComponent {
  readonly settings = inject(SettingsService);
  readonly pool = inject(ExercisePoolService);
  readonly notify = inject(NotificationService);
  readonly i18n = inject(TranslationService);
  readonly auth = inject(AuthService);
  private sync = inject(SyncService);
  readonly health = inject(HealthService);

  async exportData(): Promise<void> {
    try { await this.sync.exportData(); } catch { /* surfaced via global handler */ }
  }

  toggleHealth(on: boolean): void {
    if (on) void this.health.link(); else void this.health.unlink();
  }

  readonly st = this.settings.settings;
  readonly cloudEnabled = environment.cloudEnabled;
  readonly version = environment.appVersion;

  /** reference to the custom-exercise form, so a pool row can trigger edit */
  readonly form = viewChild(CustomExerciseFormComponent);

  readonly weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((label, idx) => ({ label, idx }));

  readonly accents = ['lime', 'cyan', 'amber', 'coral', 'violet'] as const;
  private readonly accentRgb: Record<string, string> = {
    lime: '200 240 96', cyan: '95 208 224', amber: '240 184 64', coral: '240 96 144', violet: '168 144 240',
  };
  get themeOptions() {
    return [
      { label: this.i18n.t('settings.theme.system'), value: 'system' },
      { label: this.i18n.t('settings.theme.light'), value: 'light' },
      { label: this.i18n.t('settings.theme.dark'), value: 'dark' },
    ];
  }
  accentColor(a: string): string {
    return `rgb(${this.accentRgb[a] ?? this.accentRgb['lime']})`;
  }

  isRestDay(idx: number): boolean {
    return (this.st().restDays ?? []).includes(idx);
  }

  toggleRestDay(idx: number): void {
    const cur = this.st().restDays ?? [];
    const next = cur.includes(idx) ? cur.filter((d) => d !== idx) : [...cur, idx].sort((a, b) => a - b);
    this.patch({ restDays: next });
  }

  // Option labels are computed so they re-translate on locale change.
  readonly difficulties = computed<{ label: string; value: Difficulty }[]>(() => [
    { label: this.i18n.t('settings.diff.leicht'), value: 'leicht' },
    { label: this.i18n.t('settings.diff.mittel'), value: 'mittel' },
    { label: this.i18n.t('settings.diff.fortgeschritten'), value: 'fortgeschritten' },
  ]);

  readonly modes = computed<{ label: string; value: SelectionMode }[]>(() => [
    { label: this.i18n.t('settings.mode.adaptive'), value: 'adaptive' },
    { label: this.i18n.t('settings.mode.random'), value: 'random' },
    { label: this.i18n.t('settings.mode.rotation'), value: 'rotation' },
  ]);

  modeHintKey(): string {
    return `settings.mode.hint.${this.st().selectionMode}`;
  }

  buildDate(): string {
    return new Date(environment.buildDate).toLocaleDateString(this.i18n.bcp47());
  }

  patch = this.settings.patch.bind(this.settings);
  cat = (c: keyof typeof CATEGORY_LABELS) => CATEGORY_LABELS[c];
  catColor = (c: keyof typeof CATEGORY_COLOR_VAR) => CATEGORY_COLOR_VAR[c];

  setLocale(locale: Locale): void {
    this.i18n.setLocale(locale);
    this.patch({ locale });
  }

  async onNotifToggle(enabled: boolean): Promise<void> {
    if (enabled && this.notify.permission() !== 'granted') {
      await this.notify.requestPermission();
    }
    this.patch({ notificationsEnabled: enabled });
  }

  sendFeedback(): void {
    const subject = encodeURIComponent(`BreakFit Feedback (v${this.version})`);
    const body = encodeURIComponent(
      `\n\n---\nVersion: ${this.version}\nBrowser: ${navigator.userAgent}`,
    );
    window.location.href = `mailto:${environment.feedbackEmail}?subject=${subject}&body=${body}`;
  }
}
