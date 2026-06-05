import { Injectable } from '@angular/core';
import { openDB, type IDBPDatabase } from 'idb';
import type { HistoryEntry, UserSettings, Exercise } from '../../models/models';

const DB_NAME = 'breakfit';
const DB_VERSION = 1;

interface BreakFitDB {
  history: HistoryEntry[];
  settings: UserSettings | null;
  exercises: Exercise[];
}

/**
 * Thin, typed IndexedDB wrapper. Three object stores:
 *  - history  (keyPath id)        — every break outcome
 *  - kv       (keyPath key)       — singletons: settings, custom exercise pool
 *  - syncQueue(keyPath id)        — entries waiting to be pushed to the backend
 *
 * All reads/writes are async and the service is the single source of truth for
 * durable state; the signal-based services hydrate from here on boot.
 */
@Injectable({ providedIn: 'root' })
export class IdbService {
  private dbPromise: Promise<IDBPDatabase> | null = null;
  /** false in non-browser environments (SSR, unit tests under jsdom) */
  private readonly supported = typeof indexedDB !== 'undefined';

  private db(): Promise<IDBPDatabase> | null {
    if (!this.supported) return null;
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('history')) {
            const s = db.createObjectStore('history', { keyPath: 'id' });
            s.createIndex('startedAt', 'startedAt');
          }
          if (!db.objectStoreNames.contains('kv')) {
            db.createObjectStore('kv', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('syncQueue')) {
            db.createObjectStore('syncQueue', { keyPath: 'id' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  // ---- key/value singletons ----
  async getKv<T>(key: string): Promise<T | null> {
    const db = await this.db();
    if (!db) return null;
    const row = await db.get('kv', key);
    return row ? (row.value as T) : null;
  }

  async setKv<T>(key: string, value: T): Promise<void> {
    const db = await this.db();
    if (!db) return;
    await db.put('kv', { key, value });
  }

  // ---- history ----
  async allHistory(): Promise<HistoryEntry[]> {
    const db = await this.db();
    if (!db) return [];
    const all = (await db.getAllFromIndex('history', 'startedAt')) as HistoryEntry[];
    return all.reverse(); // newest first
  }

  async putHistory(entry: HistoryEntry): Promise<void> {
    const db = await this.db();
    if (!db) return;
    await db.put('history', entry);
  }

  async deleteHistory(id: string): Promise<void> {
    const db = await this.db();
    if (!db) return;
    await db.delete('history', id);
  }

  async clearHistory(): Promise<void> {
    const db = await this.db();
    if (!db) return;
    await db.clear('history');
  }

  // ---- sync queue ----
  async enqueueSync(entry: HistoryEntry): Promise<void> {
    const db = await this.db();
    if (!db) return;
    await db.put('syncQueue', entry);
  }

  async drainSyncQueue(): Promise<HistoryEntry[]> {
    const db = await this.db();
    if (!db) return [];
    return (await db.getAll('syncQueue')) as HistoryEntry[];
  }

  async ackSync(id: string): Promise<void> {
    const db = await this.db();
    if (!db) return;
    await db.delete('syncQueue', id);
  }

  async wipeAll(): Promise<void> {
    const db = await this.db();
    if (!db) return;
    await Promise.all([db.clear('history'), db.clear('kv'), db.clear('syncQueue')]);
  }
}

export type { BreakFitDB };
