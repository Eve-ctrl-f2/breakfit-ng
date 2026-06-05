import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface ReportedError {
  message: string;
  at: number;
}

/**
 * ErrorReportingService — central sink for uncaught errors.
 *
 * Kept SDK-free on purpose: there is exactly ONE integration seam (see
 * `report()`), so wiring Sentry/Bugsnag/etc. later is a one-liner with no
 * lock-in today. Behaviour:
 *   - keeps the last 20 errors in memory (a ring buffer) for in-app diagnostics
 *   - dedupes identical consecutive messages to survive error storms
 *   - best-effort POST to /telemetry/error when cloud is enabled (never throws)
 */
@Injectable({ providedIn: 'root' })
export class ErrorReportingService {
  private http = inject(HttpClient);

  readonly recent = signal<ReportedError[]>([]);
  private lastMessage = '';

  report(error: unknown): void {
    const message = normalize(error);
    if (message === this.lastMessage) return; // collapse repeats
    this.lastMessage = message;

    const entry: ReportedError = { message, at: Date.now() };
    this.recent.update((list) => [entry, ...list].slice(0, 20));

    // ── Integration seam ──────────────────────────────────────────────
    // To enable Sentry: import * as Sentry and call Sentry.captureException(error)
    // here. Nothing else in the app needs to change.
    // ──────────────────────────────────────────────────────────────────

    if (environment.cloudEnabled) {
      try {
        this.http
          .post('/telemetry/error', {
            message,
            at: entry.at,
            ua: navigator.userAgent,
            version: environment.appVersion,
          })
          .subscribe({ error: () => { /* swallow */ } }); // swallow: reporting must never cascade
      } catch {
        /* never let the reporter throw */
      }
    }
  }
}

function normalize(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error).slice(0, 500);
  } catch {
    return 'Unknown error';
  }
}
