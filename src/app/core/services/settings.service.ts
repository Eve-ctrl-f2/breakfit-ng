import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { IdbService } from './storage/idb.service';
import { DEFAULT_SETTINGS, type UserSettings } from '../models/models';

const KV_KEY = 'settings';
const TS_KEY = 'settings_updated_at';

/**
 * SettingsService — single source of truth for user preferences.
 * Exposes a readonly `settings` signal plus a `patch()` mutator. Writes are
 * persisted to IndexedDB through an effect, so callers never touch storage.
 *
 * Each local edit bumps `updatedAt` (epoch ms); this is the version used for
 * whole-object last-write-wins reconciliation across devices.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private idb = inject(IdbService);

  private readonly _settings = signal<UserSettings>(DEFAULT_SETTINGS);
  readonly settings = this._settings.asReadonly();

  private readonly _updatedAt = signal<number>(0);
  /** version of the current settings (epoch ms of the last local edit) */
  readonly updatedAt = this._updatedAt.asReadonly();

  /** convenience selectors */
  readonly focusSeconds = computed(() => this._settings().focusMinutes * 60);
  readonly breakSeconds = computed(() => this._settings().breakMinutes * 60);
  readonly longBreakSeconds = computed(() => this._settings().longBreakMinutes * 60);

  private hydrated = false;

  constructor() {
    void this.hydrate();
    // persist on every change once hydrated (skip the initial default write)
    effect(() => {
      const value = this._settings();
      const ts = this._updatedAt();
      if (this.hydrated) {
        void this.idb.setKv(KV_KEY, value);
        void this.idb.setKv(TS_KEY, ts);
      }
    });
  }

  private async hydrate(): Promise<void> {
    const stored = await this.idb.getKv<UserSettings>(KV_KEY);
    if (stored) this._settings.set({ ...DEFAULT_SETTINGS, ...stored });
    const ts = await this.idb.getKv<number>(TS_KEY);
    if (typeof ts === 'number') this._updatedAt.set(ts);
    this.hydrated = true;
  }

  patch(partial: Partial<UserSettings>): void {
    this._settings.update((s) => ({ ...s, ...partial }));
    this._updatedAt.set(Date.now());
  }

  reset(): void {
    this._settings.set(DEFAULT_SETTINGS);
    this._updatedAt.set(Date.now());
  }

  /** Adopt a remote copy without counting it as a new local edit. */
  applyRemote(settings: UserSettings, updatedAt: number): void {
    this._settings.set({ ...DEFAULT_SETTINGS, ...settings });
    this._updatedAt.set(updatedAt);
  }

  /** Current settings plus their version, for sync. */
  snapshot(): { settings: UserSettings; updatedAt: number } {
    return { settings: this._settings(), updatedAt: this._updatedAt() };
  }
}
