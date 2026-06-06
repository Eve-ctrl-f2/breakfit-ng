import type { Sql } from 'postgres';
import { sendToUser } from './push.routes.js';
import { buildDigestPayload } from './digest.js';

/**
 * Weekly recap ("digest") push scheduler.
 *
 * Once per ISO week — Monday morning in the user's local timezone — sends a
 * summary of the week that just finished ("Last week: 14 breaks, +3 vs the week
 * before") to opted-in users who have a push subscription. All week/timezone
 * math happens in Postgres via `AT TIME ZONE` + `date_trunc('week', …)` (which
 * is Monday-based), so each user gets it in their own Monday morning.
 *
 * Anti-spam: `last_digest_on` (the user's local date) gates re-sends and is safe
 * across restarts. Opt-in via `reminders.digest_enabled`. The recap counting and
 * notification copy live in digest.ts (shared with /push/digest-test).
 */

const INTERVAL_MIN = Number(process.env.DIGEST_INTERVAL_MIN ?? 30);
const WINDOW_START = Number(process.env.DIGEST_WINDOW_START ?? 8); // local hour
const WINDOW_END = Number(process.env.DIGEST_WINDOW_END ?? 10); // inclusive

interface Candidate {
  user_id: string;
  locale: string;
  last_week: number;
  prev_week: number;
}

export function startDigestScheduler(sql: Sql, log: { info: (o: unknown, m?: string) => void }): void {
  const tick = async () => {
    try {
      const rows = (await sql`
        SELECT
          r.user_id,
          r.locale,
          (SELECT count(*)::int FROM history h
             WHERE h.user_id = r.user_id AND h.outcome = 'completed'
               AND (h.started_at AT TIME ZONE r.timezone)::date
                   >= (date_trunc('week', now() AT TIME ZONE r.timezone) - interval '7 days')::date
               AND (h.started_at AT TIME ZONE r.timezone)::date
                   <  date_trunc('week', now() AT TIME ZONE r.timezone)::date) AS last_week,
          (SELECT count(*)::int FROM history h
             WHERE h.user_id = r.user_id AND h.outcome = 'completed'
               AND (h.started_at AT TIME ZONE r.timezone)::date
                   >= (date_trunc('week', now() AT TIME ZONE r.timezone) - interval '14 days')::date
               AND (h.started_at AT TIME ZONE r.timezone)::date
                   <  (date_trunc('week', now() AT TIME ZONE r.timezone) - interval '7 days')::date) AS prev_week
        FROM reminders r
        WHERE r.digest_enabled = true
          AND EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id = r.user_id)
          AND EXTRACT(DOW FROM (now() AT TIME ZONE r.timezone)) = 1
          AND EXTRACT(HOUR FROM (now() AT TIME ZONE r.timezone)) BETWEEN ${WINDOW_START} AND ${WINDOW_END}
          AND (r.last_digest_on IS NULL
               OR r.last_digest_on <> (now() AT TIME ZONE r.timezone)::date)
      `) as unknown as Candidate[];

      for (const c of rows) {
        if (c.last_week === 0 && c.prev_week === 0) continue; // inactive — skip
        await sendToUser(sql, c.user_id, buildDigestPayload(c.locale, c.last_week, c.prev_week));
        await sql`
          UPDATE reminders
          SET last_digest_on = (now() AT TIME ZONE timezone)::date
          WHERE user_id = ${c.user_id}`;
      }
      if (rows.length) log.info({ candidates: rows.length }, 'digest tick');
    } catch (err) {
      log.info({ err }, 'digest tick failed');
    }
  };

  setInterval(() => void tick(), INTERVAL_MIN * 60_000);
  log.info({ INTERVAL_MIN, WINDOW_START, WINDOW_END }, 'digest scheduler started');
}
