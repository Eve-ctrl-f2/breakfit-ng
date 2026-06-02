import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { IdbService } from '../services/storage/idb.service';
import { SettingsService } from '../services/settings.service';

export interface FocusPreset {
  id: string;
  /** User-visible name — intentionally NOT translated; domain content */
  name: string;
  focusMinutes: number;
  breakMinutes: number;
  longBreakEvery: number;
  longBreakMinutes: number;
  custom?: boolean;
}

const KV_KEY = 'presets';

/**
 * PresetService — manages focus-timer presets (built-in + user-created).
 *
 * Architecture decision: presets are "apply-only" — clicking Apply patches
 * SettingsService. There is NO "active preset" state tracked after apply.
 * Rationale: if the user then touches a slider we'd have to decide whether to
 * mark the preset dirty or not; that adds accidental complexity with zero
 * real-world benefit. Keep it stateless: preset = a shortcut to patch settings.
 *
 * Edge case handled: user can't delete built-in presets (custom flag guards this).
 * Max 10 custom presets enforced to avoid IDB growth.
 */
@Injectable({ providedIn: 'root' })
export class PresetService {
  private idb = inject(IdbService);
  private settings = inject(SettingsService);

  static readonly BUILT_INS: FocusPreset[] = [
    { id: 'pomodoro',  name: 'Pomodoro Classic', focusMinutes: 25,  breakMinutes: 5,  longBreakEvery: 4, longBreakMinutes: 15 },
    { id: 'deep-work', name: 'Deep Work',        focusMinutes: 50,  breakMinutes: 10, longBreakEvery: 3, longBreakMinutes: 20 },
    { id: 'flow',      name: 'Flow',             focusMinutes: 90,  breakMinutes: 15, longBreakEvery: 2, longBreakMinutes: 30 },
    { id: 'sprint',    name: 'Sprint',           focusMinutes: 15,  breakMinutes: 3,  longBreakEvery: 6, longBreakMinutes: 10 },
  ];

  private readonly _custom = signal<FocusPreset[]>([]);
  private hydrated = false;

  readonly all = computed<FocusPreset[]>(() => [
    ...PresetService.BUILT_INS,
    ...this._custom(),
  ]);

  constructor() {
    void this.hydrate();
    effect(() => {
      const val = this._custom();
      if (this.hydrated) void this.idb.setKv(KV_KEY, val);
    });
  }

  private async hydrate(): Promise<void> {
    const stored = await this.idb.getKv<FocusPreset[]>(KV_KEY);
    if (stored) this._custom.set(stored);
    this.hydrated = true;
  }

  apply(preset: FocusPreset): void {
    this.settings.patch({
      focusMinutes: preset.focusMinutes,
      breakMinutes: preset.breakMinutes,
      longBreakEvery: preset.longBreakEvery,
      longBreakMinutes: preset.longBreakMinutes,
    });
  }

  save(name: string): void {
    if (this._custom().length >= 10) return; // guard max
    const s = this.settings.settings();
    const preset: FocusPreset = {
      id: `custom-${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim().slice(0, 40),
      focusMinutes: s.focusMinutes,
      breakMinutes: s.breakMinutes,
      longBreakEvery: s.longBreakEvery,
      longBreakMinutes: s.longBreakMinutes,
      custom: true,
    };
    this._custom.update((p) => [...p, preset]);
  }

  delete(id: string): void {
    this._custom.update((p) => p.filter((x) => x.id !== id));
  }
}
