import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { IdbService } from '../services/storage/idb.service';
import { AuthService } from './auth.service';
import type { HistoryEntry } from '../models/models';

/**
 * SyncService — best-effort, offline-first sync of the local history queue to
 * the backend. No-op unless cloud is enabled and the user is authenticated.
 * Failures are swallowed: entries stay in the queue and retry next call.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private http = inject(HttpClient);
  private idb = inject(IdbService);
  private auth = inject(AuthService);

  private autoSyncStarted = false;

  /**
   * Cross-platform auto-sync. Native Background Sync (registration.sync) only
   * exists on Chromium, so we rely on universally-supported triggers that work
   * on iOS/Safari and Firefox too:
   *   - app start (called from the app initializer)
   *   - the `online` event (connectivity restored)
   *   - `visibilitychange` -> visible (user returned to the tab/PWA)
   * Where the Background Sync API IS available we additionally register a sync
   * tag as an enhancement (flushes even if the app is later closed).
   */
  enableAutoSync(): void {
    if (this.autoSyncStarted || !environment.cloudEnabled) return;
    this.autoSyncStarted = true;

    const flush = () => { void this.push(); };

    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') flush();
    });

    // Chromium enhancement: ask the SW to flush even after the app is closed.
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready
        .then((reg) => (reg as unknown as { sync?: { register: (t: string) => Promise<void> } }).sync?.register('breakfit-history'))
        .catch(() => { /* unsupported / denied — universal triggers still cover us */ });
    }

    flush(); // initial attempt on boot
  }

  async push(): Promise<{ pushed: number }> {
    if (!environment.cloudEnabled || !this.auth.isAuthed()) return { pushed: 0 };
    if (!navigator.onLine) return { pushed: 0 };
    const queue = await this.idb.drainSyncQueue();
    let pushed = 0;
    for (const entry of queue) {
      try {
        await firstValueFrom(this.http.post<HistoryEntry>('/sync/history', entry));
        await this.idb.ackSync(entry.id);
        pushed += 1;
      } catch {
        break; // stop on first failure; retry whole queue next time
      }
    }
    return { pushed };
  }

  async pull(): Promise<HistoryEntry[]> {
    if (!environment.cloudEnabled || !this.auth.isAuthed()) return [];
    return firstValueFrom(this.http.get<HistoryEntry[]>('/sync/history'));
  }

  async deleteAccount(confirmation: string): Promise<void> {
    if (!environment.cloudEnabled) return;
    // NB: backend enforces z.literal("KONTO LÖSCHEN") — must match verbatim.
    await firstValueFrom(this.http.post('/me/delete', { confirmation }));
  }

  /** GDPR export: fetch all server-side data and trigger a JSON file download. */
  async exportData(): Promise<void> {
    if (!environment.cloudEnabled) return;
    const blob = await firstValueFrom(
      this.http.get('/me/export', { responseType: 'blob' }),
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'breakfit-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }
}
