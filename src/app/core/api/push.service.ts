import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { PlatformService } from '../services/platform.service';
import { TranslationService } from '../i18n/translation.service';

/**
 * PushService — Web Push (VAPID) via Angular's SwPush.
 *
 * The ngsw service worker handles the `push` and `notificationclick` events
 * natively as long as the server sends the ngsw payload shape
 * (`{ notification: { title, body, data } }`), so no custom SW code is needed.
 *
 * Availability is feature-gated: cloud on, a VAPID public key configured, the
 * SW actually active, Notifications supported, and — crucially for iOS — the
 * app running as an installed PWA (iOS only allows push in standalone mode).
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private swPush = inject(SwPush);
  private http = inject(HttpClient);
  private platform = inject(PlatformService);
  private i18n = inject(TranslationService);

  readonly subscribed = signal(false);
  readonly reminderEnabled = signal(true);
  /** weekly recap push — opt-in, off by default */
  readonly digestEnabled = signal(false);
  readonly busy = signal(false);

  /** true only where Web Push can actually work right now */
  get available(): boolean {
    return (
      environment.cloudEnabled &&
      !!environment.vapidPublicKey &&
      this.swPush.isEnabled &&
      this.platform.supportsNotifications &&
      (!this.platform.isIOS || this.platform.isStandalone())
    );
  }

  constructor() {
    if (!this.swPush.isEnabled) return;
    // reflect an existing subscription into our signal
    this.swPush.subscription.subscribe((sub) => this.subscribed.set(!!sub));
    // re-subscribe transparently if the browser rotates the subscription
    this.swPush.subscription.subscribe(async (sub) => {
      if (!sub && this.subscribed()) await this.enable();
    });
  }

  /** Request permission + subscription, then register it with the backend. */
  async enable(): Promise<boolean> {
    if (!this.available) return false;
    this.busy.set(true);
    try {
      const sub = await this.swPush.requestSubscription({
        serverPublicKey: environment.vapidPublicKey,
      });
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      await firstValueFrom(
        this.http.post('/push/subscribe', { ...sub.toJSON(), timezone: tz, locale: this.i18n.locale() }),
      );
      this.subscribed.set(true);
      this.reminderEnabled.set(true);
      return true;
    } catch {
      return false; // permission denied or subscribe failed
    } finally {
      this.busy.set(false);
    }
  }

  async disable(): Promise<void> {
    this.busy.set(true);
    try {
      const sub = await firstValueFrom(this.swPush.subscription);
      if (sub) {
        await firstValueFrom(
          this.http.post('/push/unsubscribe', { endpoint: sub.endpoint }),
        ).catch(() => undefined);
        await this.swPush.unsubscribe().catch(() => undefined);
      }
      this.subscribed.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  /** Toggle the daily reminder server-side without dropping the push subscription. */
  async setReminder(enabled: boolean): Promise<void> {
    this.reminderEnabled.set(enabled);
    await firstValueFrom(this.http.patch('/reminders', { enabled })).catch(() => undefined);
  }

  /** Toggle the weekly recap ("digest") push server-side. */
  async setDigest(enabled: boolean): Promise<void> {
    this.digestEnabled.set(enabled);
    await firstValueFrom(this.http.patch('/reminders', { digest: enabled })).catch(() => undefined);
  }

  /** Ask the backend to send a verification push to this user's devices. */
  async sendTest(): Promise<void> {
    await firstValueFrom(this.http.post('/push/test', {}));
  }

  /** Ask the backend to send this user's weekly recap right now (dev/verify). */
  async sendDigestTest(): Promise<void> {
    await firstValueFrom(this.http.post('/push/digest-test', {}));
  }
}
