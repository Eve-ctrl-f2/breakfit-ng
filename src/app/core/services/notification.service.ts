import { Injectable, inject, signal } from '@angular/core';
import { SettingsService } from './settings.service';
import { TranslationService } from '../i18n/translation.service';

/**
 * NotificationService — wraps the Web Notifications API with graceful
 * degradation. On mobile browsers, background notifications only fire when the
 * app is installed as a PWA; when they can't fire we fall back to a tab-title
 * cue (the 🔔 lives in the title bar — a different surface from system
 * notifications, which carry no emoji per the design rules).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private settings = inject(SettingsService);
  private i18n = inject(TranslationService);

  readonly permission = signal<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );

  /** pulse the tab title; consumed by the app shell's title effect */
  readonly titleAlert = signal(false);

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') return 'denied';
    const result = await Notification.requestPermission();
    this.permission.set(result);
    return result;
  }

  fireBreakDue(): void {
    this.titleAlert.set(true);
    this.send(this.i18n.t('notif.breakDue.title'), this.i18n.t('notif.breakDue.body'));
    this.beep();
  }

  fireBreakOver(): void {
    this.titleAlert.set(true);
    this.send(this.i18n.t('notif.breakOver.title'), this.i18n.t('notif.breakOver.body'));
  }

  clearTitleAlert(): void {
    this.titleAlert.set(false);
  }

  private send(title: string, body: string): void {
    if (!this.settings.settings().notificationsEnabled) return;
    if (typeof Notification === 'undefined' || this.permission() !== 'granted') return;
    try {
      // No emoji in system notifications — text + icon asset only.
      new Notification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/badge.png' });
    } catch {
      /* Safari throws if constructed outside a SW on some versions; ignore. */
    }
  }

  private beep(): void {
    if (!this.settings.settings().soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 660;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      /* autoplay policy may block; non-critical */
    }
  }
}
