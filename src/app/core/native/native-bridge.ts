/**
 * Native (Capacitor) integration — deliberately dependency-free.
 *
 * We detect the Capacitor runtime via the `window.Capacitor` global that the
 * native shell injects, and talk to plugins through `window.Capacitor.Plugins`.
 * That means the web/PWA build pulls in NO Capacitor packages and keeps building
 * and running exactly as before; this code is inert in a browser.
 *
 * On a native device it wires up `window.bfHealth` (the health seam consumed by
 * HealthService) to a custom `Health` Capacitor plugin, so the rest of the app
 * is unchanged. See CAPACITOR.md for the native plugin stubs.
 */

interface HealthWorkout {
  type: string;
  name: string;
  start: string;
  durationSec: number;
  kcal: number;
}

interface HealthPlugin {
  isAvailable?: () => Promise<{ available: boolean }>;
  logWorkout?: (w: HealthWorkout) => Promise<void>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, unknown>;
}

function cap(): CapacitorGlobal | undefined {
  return (globalThis as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** true only inside the Capacitor native shell (false in any browser/PWA). */
export function isNativePlatform(): boolean {
  return cap()?.isNativePlatform?.() === true;
}

/** 'ios' | 'android' | 'web' */
export function nativePlatform(): 'ios' | 'android' | 'web' {
  const p = cap()?.getPlatform?.();
  return p === 'ios' || p === 'android' ? p : 'web';
}

function installHealthBridge(plugins: Record<string, unknown>): void {
  const Health = plugins['Health'] as HealthPlugin | undefined;
  if (!Health?.logWorkout) return;
  window.bfHealth = {
    isAvailable: async () => {
      try {
        const r = await Health.isAvailable?.();
        return r?.available === true;
      } catch {
        return false;
      }
    },
    logWorkout: async (w) => {
      try {
        await Health.logWorkout?.(w);
      } catch {
        /* native side logs its own errors; never break the user flow */
      }
    },
  };
}

async function applyNativeChrome(plugins: Record<string, unknown>): Promise<void> {
  const SplashScreen = plugins['SplashScreen'] as { hide?: () => Promise<void> } | undefined;
  const StatusBar = plugins['StatusBar'] as
    | { setStyle?: (o: { style: string }) => Promise<void> }
    | undefined;
  try {
    await SplashScreen?.hide?.();
  } catch {
    /* optional plugin */
  }
  try {
    await StatusBar?.setStyle?.({ style: 'DARK' }); // app is dark-first
  } catch {
    /* optional plugin */
  }
}

/**
 * Install native integrations. Call once, before Angular bootstrap.
 * No-op on web — safe to call unconditionally.
 */
export function installNativeBridge(): void {
  const c = cap();
  if (c?.isNativePlatform?.() !== true) return;
  const plugins = c.Plugins ?? {};
  installHealthBridge(plugins);
  void applyNativeChrome(plugins);
}
