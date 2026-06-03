import type { Sql } from 'postgres';
import { sendToUser } from './push.routes.js';

/**
 * Server-side reminder scheduler.
 *
 * Runs on an interval and sends at most one daily nudge per user, in their local
 * evening, only to *active* users (≥1 completed break in the last 7 days) who
 * have NOT completed a break today. All day/timezone math happens in Postgres via
 * `AT TIME ZONE`, so a user in Tokyo and one in São Paulo each get their nudge in
 * their own evening from the same UTC server.
 *
 * Anti-spam: `last_nudge_on` (the user's local date) gates re-sends; safe across
 * process restarts. Quiet window is configurable via env.
 */

const INTERVAL_MIN = Number(process.env.REMINDER_INTERVAL_MIN ?? 15);
const WINDOW_START = Number(process.env.REMINDER_WINDOW_START ?? 18); // local hour
const WINDOW_END = Number(process.env.REMINDER_WINDOW_END ?? 20); // inclusive

const TEXT: Record<string, { streak: (n: number) => string; generic: string }> = {
  de: {
    streak: (n) => `Dein ${n}-Tage-Streak ist heute noch offen. Kurze Pause?`,
    generic: 'Heute noch keine Pause gemacht. Zeit fuer eine kurze Uebung?',
  },
  en: {
    streak: (n) => `Your ${n}-day streak is still open today. Quick break?`,
    generic: 'No break yet today. Time for a short exercise?',
  },
};

interface Candidate {
  user_id: string;
  locale: string;
  done_today: number;
  done_week: number;
  streak: number;
}

export function startReminderScheduler(sql: Sql, log: { info: (o: unknown, m?: string) => void }): void {
  const tick = async () => {
    try {
      const rows = (await sql`
        SELECT
          r.user_id,
          r.locale,
          (SELECT count(*)::int FROM history h
             WHERE h.user_id = r.user_id AND h.outcome = 'completed'
               AND (h.started_at AT TIME ZONE r.timezone)::date
                 = (now() AT TIME ZONE r.timezone)::date) AS done_today,
          (SELECT count(*)::int FROM history h
             WHERE h.user_id = r.user_id AND h.outcome = 'completed'
               AND h.started_at > now() - interval '7 days') AS done_week,
          (SELECT count(DISTINCT (h.started_at AT TIME ZONE r.timezone)::date)::int FROM history h
             WHERE h.user_id = r.user_id AND h.outcome = 'completed'
               AND h.started_at > now() - interval '7 days') AS streak
        FROM reminders r
        WHERE r.enabled = true
          AND EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id = r.user_id)
          AND (r.last_nudge_on IS NULL
               OR r.last_nudge_on <> (now() AT TIME ZONE r.timezone)::date)
          AND EXTRACT(HOUR FROM (now() AT TIME ZONE r.timezone))
              BETWEEN ${WINDOW_START} AND ${WINDOW_END}
      `) as unknown as Candidate[];

      for (const c of rows) {
        if (c.done_today > 0 || c.done_week === 0) continue; // already done / inactive
        const t = TEXT[c.locale] ?? TEXT['de'];
        const body = c.streak >= 2 ? t.streak(c.streak) : t.generic;
        await sendToUser(sql, c.user_id, {
          notification: {
            title: 'BreakFit',
            body,
            icon: 'icons/icon-192.png',
            badge: 'icons/badge.png',
            data: { url: '/timer' },
          },
        });
        await sql`
          UPDATE reminders
          SET last_nudge_on = (now() AT TIME ZONE timezone)::date
          WHERE user_id = ${c.user_id}`;
      }
      if (rows.length) log.info({ candidates: rows.length }, 'reminder tick');
    } catch (err) {
      log.info({ err }, 'reminder tick failed');
    }
  };

  setInterval(() => void tick(), INTERVAL_MIN * 60_000);
  log.info({ INTERVAL_MIN, WINDOW_START, WINDOW_END }, 'reminder scheduler started');
}
