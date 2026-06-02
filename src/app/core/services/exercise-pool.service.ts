import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { IdbService } from './storage/idb.service';
import { BASE_EXERCISES } from '../data/exercises.data';
import type { Exercise } from '../models/models';

const KV_KEY = 'exercise-overrides';

interface Overrides {
  /** enabled flag per base-exercise id (user can toggle pool membership) */
  enabled: Record<string, boolean>;
  /** user-created exercises */
  custom: Exercise[];
}

/**
 * ExercisePoolService — merges the immutable BASE_EXERCISES catalog with the
 * user's enable/disable toggles and custom exercises. The merged list is a
 * computed signal so downstream consumers (recommendation engine, settings UI)
 * react automatically.
 */
@Injectable({ providedIn: 'root' })
export class ExercisePoolService {
  private idb = inject(IdbService);

  private readonly _overrides = signal<Overrides>({ enabled: {}, custom: [] });
  private hydrated = false;

  /** full catalog: base (with applied toggles) + custom */
  readonly all = computed<Exercise[]>(() => {
    const o = this._overrides();
    const base = BASE_EXERCISES.map((ex) => ({
      ...ex,
      enabled: o.enabled[ex.id] ?? ex.enabled,
    }));
    return [...base, ...o.custom];
  });

  /** only the exercises the user has enabled — what the engine draws from */
  readonly active = computed(() => this.all().filter((e) => e.enabled));

  constructor() {
    void this.hydrate();
    effect(() => {
      const value = this._overrides();
      if (this.hydrated) void this.idb.setKv(KV_KEY, value);
    });
  }

  private async hydrate(): Promise<void> {
    const stored = await this.idb.getKv<Overrides>(KV_KEY);
    if (stored) this._overrides.set(stored);
    this.hydrated = true;
  }

  toggle(id: string, enabled: boolean): void {
    this._overrides.update((o) => ({ ...o, enabled: { ...o.enabled, [id]: enabled } }));
  }

  addCustom(ex: Omit<Exercise, 'id' | 'custom' | 'enabled'>): void {
    const id = `custom-${crypto.randomUUID().slice(0, 8)}`;
    this._overrides.update((o) => ({
      ...o,
      custom: [...o.custom, { ...ex, id, custom: true, enabled: true }],
    }));
  }

  removeCustom(id: string): void {
    this._overrides.update((o) => ({ ...o, custom: o.custom.filter((e) => e.id !== id) }));
  }

  byId(id: string): Exercise | undefined {
    return this.all().find((e) => e.id === id);
  }
}
