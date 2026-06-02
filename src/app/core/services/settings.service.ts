import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { IdbService } from './storage/idb.service';
import { DEFAULT_SETTINGS, type UserSettings } from '../models/models';

const KV_KEY = 'settings';

/**
 * SettingsService — single source of truth for user preferences.
 * Exposes a readonly `settings` signal plus a `patch()` mutator. Writes are
 * persisted to IndexedDB through an effect, so callers never touch storage.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private idb = inject(IdbService);

  private readonly _settings = signal<UserSettings>(DEFAULT_SETTINGS);
  readonly settings = this._settings.asReadonly();

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
      if (this.hydrated) void this.idb.setKv(KV_KEY, value);
    });
  }

  private async hydrate(): Promise<void> {
    const stored = await this.idb.getKv<UserSettings>(KV_KEY);
    if (stored) this._settings.set({ ...DEFAULT_SETTINGS, ...stored });
    this.hydrated = true;
  }

  patch(partial: Partial<UserSettings>): void {
    this._settings.update((s) => ({ ...s, ...partial }));
  }

  reset(): void {
    this._settings.set(DEFAULT_SETTINGS);
  }
}
