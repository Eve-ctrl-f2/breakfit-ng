import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { environment } from '@env/environment';
import { SyncService } from '../api/sync.service';
import { AuthService } from '../api/auth.service';
import { SettingsService } from './settings.service';
import { IdbService } from './storage/idb.service';

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';

/**
 * SyncCoordinatorService — offline-first orchestration of the history sync queue.
 *
 * Why not the Background Sync API? It is Chromium-only (absent on iOS Safari,
 * which is BreakFit's primary platform) and Angular's ngsw can't host a custom
 * `sync` handler without replacing the service worker. So the cross-platform
 * workhorse is this in-app retry, triggered on:
 *   - `online` events (connectivity restored)
 *   - tab becoming visible again
 *   - a periodic interval
 *   - explicit requestSync() after recording a break
 *
 * Everything is a no-op unless cloud is enabled AND the user is authenticated,
 * so this stays dormant in the current local-only build and "just works" once
 * the backend is wired (flip cloudEnabled).
 */
@Injectable({ providedIn: 'root' })
export class SyncCoordinatorService {
  private sync = inject(SyncService);
  private auth = inject(AuthService);
  private settings = inject(SettingsService);
  private idb = inject(IdbService);

  readonly state = signal<SyncState>('idle');
  readonly pending = signal(0);
  readonly lastSyncedAt = signal<number | null>(null);
  readonly hasPending = computed(() => this.pending() > 0);

  private timer: ReturnType<typeof setInterval> | null = null;
  private settingsTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;

  constructor() {
    // Push settings shortly after a local edit (debounced), so a change on one
    // device reaches the others quickly instead of waiting for the next trigger.
    let first = true;
    effect(() => {
      this.settings.updatedAt(); // track local edits
      if (first) { first = false; return; }
      if (!environment.cloudEnabled) return;
      if (this.settingsTimer) clearTimeout(this.settingsTimer);
      this.settingsTimer = setTimeout(() => void this.sync.syncSettings(), 1500);
    });
  }

  /** Called once from the app shell. Sets up triggers; safe to call repeatedly. */
  init(): void {
    if (this.started || !environment.cloudEnabled) return;
    this.started = true;

    window.addEventListener('online', () => void this.requestSync());
    window.addEventListener('offline', () => this.state.set('offline'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.requestSync();
    });
    this.timer = setInterval(() => void this.requestSync(), 60_000);

    void this.refreshPending();
    void this.requestSync();
  }

  /** Attempt to flush the queue. Guarded against re-entrancy and offline state. */
  async requestSync(): Promise<void> {
    if (!environment.cloudEnabled || !this.auth.isAuthed()) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.state.set('offline');
      return;
    }
    if (this.state() === 'syncing') return;

    this.state.set('syncing');
    try {
      await this.sync.push();
      await this.sync.syncSettings();
      this.lastSyncedAt.set(Date.now());
      await this.refreshPending();
      this.state.set('idle');
    } catch {
      this.state.set('error');
    }
  }

  private async refreshPending(): Promise<void> {
    try {
      const queue = await this.idb.drainSyncQueue(); // read-only fetch of queued items
      this.pending.set(queue.length);
    } catch {
      /* ignore — count is advisory */
    }
  }
}
