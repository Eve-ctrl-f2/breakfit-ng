import { Injectable, inject, signal } from '@angular/core';
import { IdbService } from './storage/idb.service';
import { HistoryService } from './history.service';
import type { Exercise, HistoryEntry } from '../models/models';

/**
 * Bridge contract a native wrapper (Capacitor/Tauri) injects on `window`.
 * A web PWA cannot write to Apple Health (HealthKit) or Android Health Connect
 * directly — there is no web API — so the only real "link" path is a native
 * shell that exposes this interface. When absent, the service degrades to the
 * TCX file export, which works in any browser. See HEALTH.md.
 */
export interface BfHealthBridge {
  /** true if the native side has health permission and can write */
  isAvailable?: () => boolean | Promise<boolean>;
  logWorkout: (w: {
    type: string;        // e.g. "strength_training" | "other"
    name: string;
    start: string;       // ISO
    durationSec: number;
    kcal: number;
  }) => void | Promise<void>;
}

declare global {
  interface Window {
    bfHealth?: BfHealthBridge;
  }
}

const KV_LINKED = 'health_linked';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private idb = inject(IdbService);
  private history = inject(HistoryService);

  /** a native bridge is present on this device */
  readonly available = signal<boolean>(typeof window !== 'undefined' && !!window.bfHealth);
  /** user opted in to push breaks to the platform health store */
  readonly linked = signal<boolean>(false);

  constructor() {
    void this.idb.getKv<boolean>(KV_LINKED).then((v) => this.linked.set(v === true));
  }

  async link(): Promise<void> {
    if (!this.available()) return;
    this.linked.set(true);
    await this.idb.setKv(KV_LINKED, true);
  }

  async unlink(): Promise<void> {
    this.linked.set(false);
    await this.idb.setKv(KV_LINKED, false);
  }

  /** Push one completed break to the platform health store, if linked. */
  async logBreak(exercise: Exercise | null, amountDone: number, startedAt: string): Promise<void> {
    if (!this.available() || !this.linked() || !window.bfHealth || !exercise) return;
    const durationSec = estimateDurationSec(exercise, amountDone);
    try {
      await window.bfHealth.logWorkout({
        type: exercise.category === 'cardio' ? 'other' : 'strength_training',
        name: `BreakFit · ${exercise.name}`,
        start: startedAt,
        durationSec,
        kcal: estimateKcal(exercise.intensity, durationSec),
      });
    } catch {
      /* native side handles its own errors; never break the user flow */
    }
  }

  /** Export all completed breaks as a TCX file (importable by Strava, Garmin,
   *  Apple Health / Google Fit via those apps). Triggers a download. */
  exportTcx(): void {
    const entries = this.history.entries().filter((e) => e.outcome === 'completed');
    const xml = buildTcx(entries);
    const blob = new Blob([xml], { type: 'application/vnd.garmin.tcx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'breakfit-workouts.tcx';
    a.click();
    URL.revokeObjectURL(url);
  }
}

/** reps -> ~3s each; seconds -> as-is. */
export function estimateDurationSec(ex: Exercise, amount: number): number {
  return ex.unit === 'seconds' ? Math.max(1, amount) : Math.max(1, amount) * 3;
}

/** Rough estimate: kcal/min scales with intensity (1–5). Clearly an estimate. */
export function estimateKcal(intensity: number, durationSec: number): number {
  const kcalPerMin = 2 + intensity * 1.2;
  return Math.round((durationSec / 60) * kcalPerMin);
}

function buildTcx(entries: HistoryEntry[]): string {
  const activities = entries
    .map((e) => {
      const start = new Date(e.startedAt).toISOString();
      const durationSec = e.amountDone > 0 ? Math.max(1, e.amountDone) : 30;
      const kcal = estimateKcal(2, durationSec);
      const sport = 'Other';
      return `  <Activity Sport="${sport}">
    <Id>${start}</Id>
    <Lap StartTime="${start}">
      <TotalTimeSeconds>${durationSec}</TotalTimeSeconds>
      <DistanceMeters>0</DistanceMeters>
      <Calories>${kcal}</Calories>
      <Intensity>Active</Intensity>
      <TriggerMethod>Manual</TriggerMethod>
    </Lap>
    <Notes>${escapeXml(e.exerciseName ?? 'BreakFit')}</Notes>
  </Activity>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
${activities}
  </Activities>
</TrainingCenterDatabase>
`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] as string,
  );
}
