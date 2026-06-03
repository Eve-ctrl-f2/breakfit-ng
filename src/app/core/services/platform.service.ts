import { Injectable, computed, signal } from '@angular/core';

/** Minimal shape of the (Chromium-only) beforeinstallprompt event. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PlatformService — single source of truth for runtime capabilities.
 *
 * The app targets every common engine (Chrome/Edge/Firefox desktop + Android,
 * Safari/iOS). Capabilities differ wildly, so every platform-specific feature
 * is feature-detected here and exposed as a signal. UI reads these to show the
 * right affordance (e.g. iOS gets an "Add to Home Screen" hint instead of an
 * install button, because iOS has no beforeinstallprompt).
 *
 * Constructed once at app-init so the beforeinstallprompt listener is attached
 * before the browser would fire it.
 */
@Injectable({ providedIn: 'root' })
export class PlatformService {
  /** captured beforeinstallprompt event (Chromium); null elsewhere */
  private readonly _installEvent = signal<BeforeInstallPromptEvent | null>(null);
  readonly installed = signal(false);

  readonly isIOS = detectIOS();
  readonly isStandalone = signal(detectStandalone());

  readonly supportsServiceWorker = 'serviceWorker' in navigator;
  readonly supportsNotifications = typeof Notification !== 'undefined';
  readonly supportsBackgroundSync =
    this.supportsServiceWorker && typeof window !== 'undefined' && 'SyncManager' in window;

  /** Android/Chromium can show a native install prompt right now. */
  readonly canInstall = computed(() => this._installEvent() !== null && !this.installed());

  /** iOS Safari, not yet installed → we must show the manual A2HS hint. */
  readonly showIosInstallHint = computed(
    () => this.isIOS && !this.isStandalone() && !this.installed(),
  );

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); // stop the mini-infobar; we trigger it ourselves
      this._installEvent.set(e as BeforeInstallPromptEvent);
    });

    window.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this._installEvent.set(null);
    });

    // react to the app being launched/added to the home screen
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (ev) => {
      this.isStandalone.set(ev.matches);
    });
  }

  /** Trigger the native install prompt (Chromium). Returns true if accepted. */
  async promptInstall(): Promise<boolean> {
    const ev = this._installEvent();
    if (!ev) return false;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    this._installEvent.set(null);
    return outcome === 'accepted';
  }
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Mac; disambiguate via touch points.
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from home screen
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
