/**
 * Native local notifications — dependency-free access to the Capacitor
 * @capacitor/local-notifications plugin via the injected `window.Capacitor`
 * global. No Capacitor import, so the web/PWA build is unaffected; every
 * function is a no-op in a browser.
 *
 * Used by NativeReminderService to fire break reminders even when the app is
 * backgrounded/closed (the web Notifications API can't do that on a phone).
 */

interface ScheduledNotification {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date; allowWhileIdle?: boolean };
}

interface LocalNotificationsPlugin {
  checkPermissions?: () => Promise<{ display: string }>;
  requestPermissions?: () => Promise<{ display: string }>;
  schedule?: (opts: { notifications: ScheduledNotification[] }) => Promise<unknown>;
  cancel?: (opts: { notifications: { id: number }[] }) => Promise<unknown>;
}

function plugin(): LocalNotificationsPlugin | undefined {
  const c = (globalThis as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> };
  }).Capacitor;
  if (c?.isNativePlatform?.() !== true) return undefined;
  return c.Plugins?.['LocalNotifications'] as LocalNotificationsPlugin | undefined;
}

/** Ensure notification permission (Android 13+/iOS prompt). false on web or denial. */
export async function ensureLocalNotifPermission(): Promise<boolean> {
  const p = plugin();
  if (!p) return false;
  try {
    const cur = await p.checkPermissions?.();
    if (cur?.display === 'granted') return true;
    const res = await p.requestPermissions?.();
    return res?.display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleLocalNotification(
  id: number,
  at: Date,
  title: string,
  body: string,
): Promise<void> {
  const p = plugin();
  if (!p?.schedule) return;
  try {
    await p.schedule({
      notifications: [{ id, title, body, schedule: { at, allowWhileIdle: true } }],
    });
  } catch {
    /* never break the timer flow */
  }
}

export async function cancelLocalNotification(id: number): Promise<void> {
  const p = plugin();
  if (!p?.cancel) return;
  try {
    await p.cancel({ notifications: [{ id }] });
  } catch {
    /* ignore */
  }
}
