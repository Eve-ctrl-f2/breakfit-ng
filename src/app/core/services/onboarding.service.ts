import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { IdbService } from './storage/idb.service';
import { HistoryService } from './history.service';

const KV_KEY = 'onboarded';

/**
 * OnboardingService — decides whether the first-run onboarding should show.
 *
 * Shows only when: the persisted `onboarded` flag is false AND the user has no
 * history yet. The history check means anyone who used BreakFit before this
 * feature existed is treated as already onboarded — they never get an
 * unexpected wizard on an update.
 *
 * The flag is persisted to IDB so it survives reloads; `ready` gates the UI so
 * the overlay never flashes before hydration finishes.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private idb = inject(IdbService);
  private history = inject(HistoryService);

  private readonly _completed = signal(false);
  private readonly _ready = signal(false);

  readonly ready = this._ready.asReadonly();

  /** show the wizard only once hydration is done and it isn't completed */
  readonly shouldShow = computed(
    () => this._ready() && !this._completed() && this.history.entries().length === 0,
  );

  constructor() {
    void this.hydrate();
  }

  private async hydrate(): Promise<void> {
    const flag = await this.idb.getKv<boolean>(KV_KEY);
    this._completed.set(flag === true);
    this._ready.set(true);
  }

  async complete(): Promise<void> {
    this._completed.set(true);
    await this.idb.setKv(KV_KEY, true);
  }
}
