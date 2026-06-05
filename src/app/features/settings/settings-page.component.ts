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
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
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
