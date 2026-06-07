import { Injectable, computed, effect, inject } from '@angular/core';
import { TimerService } from './timer.service';
import { SettingsService } from './settings.service';
import { TranslationService } from '../i18n/translation.service';
import { isNativePlatform } from '../native/native-bridge';
import {
  cancelLocalNotification,
  ensureLocalNotifPermission,
  scheduleLocalNotification,
} from '../native/local-notifications';

/**
 * Native reminder loop. On a Capacitor device, schedules a single local
 * notification for the end of the currently running phase (focus -> "break
 * due", break -> "break over") so the user is reminded even when the app is
 * backgrounded or closed. Reschedules when the timer (re)starts/resumes and
 * cancels on pause/reset/idle. No-op on web — there the foreground
 * NotificationService handles cues.
 *
 * It keys off (phase, startedAt, total), NOT the per-second `remaining`, so it
 * doesn't reschedule on every tick.
 */
@Injectable({ providedIn: 'root' })
export class NativeReminderService {
  private readonly timer = inject(TimerService);
  private readonly settings = inject(SettingsService);
  private readonly i18n = inject(TranslationService);

  private static readonly NOTIF_ID = 4201;
  private permissionRequested = false;

  /** Stable scheduling descriptor; changes only on real phase/start changes. */
  private readonly scheduleKey = computed(() => {
    const s = this.timer.state();
    if (!this.settings.settings().notificationsEnabled) return 'off';
    return s.running && s.startedAt != null && s.phase !== 'idle'
      ? `${s.phase}|${s.startedAt}|${s.total}`
      : 'off';
  });

  constructor() {
    if (!isNativePlatform()) return; // web path handled by NotificationService
    effect(() => {
      const key = this.scheduleKey();
      void this.apply(key);
    });
  }

  private async apply(key: string): Promise<void> {
    await cancelLocalNotification(NativeReminderService.NOTIF_ID);
    if (key === 'off') return;

    const [phase, startedAt, total] = key.split('|');
    const at = new Date(Number(startedAt) + Number(total) * 1000);
    if (at.getTime() <= Date.now() + 1000) return; // already due / too soon

    if (!this.permissionRequested) {
      this.permissionRequested = true;
      await ensureLocalNotifPermission();
    }

    const due = phase === 'focus';
    const title = this.i18n.t(due ? 'notif.breakDue.title' : 'notif.breakOver.title');
    const body = this.i18n.t(due ? 'notif.breakDue.body' : 'notif.breakOver.body');
    await scheduleLocalNotification(NativeReminderService.NOTIF_ID, at, title, body);
  }
}
