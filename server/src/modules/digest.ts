import type { Sql } from 'postgres';
import type { PushPayload } from './push.routes.js';

/**
 * Shared weekly-recap logic used by both the digest scheduler (batch, all users)
 * and the /push/digest-test endpoint (one user, on demand). Keeping the counting
 * window and the notification copy in one place avoids drift between them.
 *
 * `PushPayload` is imported type-only, so there is no runtime cycle with
 * push.routes (which imports the value exports below).
 */

const TEXT: Record<
  string,
  { title: string; line: (n: number) => string; up: (d: number) => string; down: (d: number) => string; same: string }
> = {
  de: {
    title: 'BreakFit – Wochenrückblick',
    line: (n) => `Letzte Woche: ${n} ${n === 1 ? 'Pause' : 'Pausen'}`,
    up: (d) => ` (+${d} ggü. Vorwoche)`,
    down: (d) => ` (${d} ggü. Vorwoche)`,
    same: ' (wie Vorwoche)',
  },
  en: {
    title: 'BreakFit – Weekly recap',
    line: (n) => `Last week: ${n} ${n === 1 ? 'break' : 'breaks'}`,
    up: (d) => ` (+${d} vs. the week before)`,
    down: (d) => ` (${d} vs. the week before)`,
    same: ' (same as the week before)',
  },
};

export interface WeekCounts {
  lastWeek: number;
  prevWeek: number;
}

/**
 * Completed breaks in the just-finished local week vs the week before it, using
 * Monday-based `date_trunc('week', …)` in the user's timezone.
 */
export async function weeklyCounts(sql: Sql, userId: string, timezone: string): Promise<WeekCounts> {
  const rows = (await sql`
    SELECT
      (SELECT count(*)::int FROM history h
         WHERE h.user_id = ${userId} AND h.outcome = 'completed'
           AND (h.started_at AT TIME ZONE ${timezone})::date
               >= (date_trunc('week', now() AT TIME ZONE ${timezone}) - interval '7 days')::date
           AND (h.started_at AT TIME ZONE ${timezone})::date
               <  date_trunc('week', now() AT TIME ZONE ${timezone})::date) AS last_week,
      (SELECT count(*)::int FROM history h
         WHERE h.user_id = ${userId} AND h.outcome = 'completed'
           AND (h.started_at AT TIME ZONE ${timezone})::date
               >= (date_trunc('week', now() AT TIME ZONE ${timezone}) - interval '14 days')::date
           AND (h.started_at AT TIME ZONE ${timezone})::date
               <  (date_trunc('week', now() AT TIME ZONE ${timezone}) - interval '7 days')::date) AS prev_week
  `) as unknown as { last_week: number; prev_week: number }[];
  return { lastWeek: rows[0]?.last_week ?? 0, prevWeek: rows[0]?.prev_week ?? 0 };
}

/** Build the recap notification payload (localized; de/en). */
export function buildDigestPayload(locale: string, lastWeek: number, prevWeek: number): PushPayload {
  const t = TEXT[locale] ?? TEXT['de'];
  const delta = lastWeek - prevWeek;
  const suffix = delta > 0 ? t.up(delta) : delta < 0 ? t.down(delta) : t.same;
  return {
    notification: {
      title: t.title,
      body: t.line(lastWeek) + suffix,
      icon: 'icons/icon-192.png',
      badge: 'icons/badge.png',
      data: { url: '/insights' },
    },
  };
}
