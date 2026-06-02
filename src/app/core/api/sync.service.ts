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

  async push(): Promise<{ pushed: number }> {
    if (!environment.cloudEnabled || !this.auth.isAuthed()) return { pushed: 0 };
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
}
