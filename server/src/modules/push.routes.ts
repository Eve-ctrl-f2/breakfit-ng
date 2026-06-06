import type { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import webpush from 'web-push';
import { z } from 'zod';
import { requireAuth } from '../server.js';
import { weeklyCounts, buildDigestPayload } from './digest.js';

interface Deps {
  sql: Sql;
}

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
  timezone: z.string().max(64).optional(),
  locale: z.enum(['de', 'en']).optional(),
});

const unsubscribeSchema = z.object({ endpoint: z.string().url() });
const reminderSchema = z
  .object({ enabled: z.boolean().optional(), digest: z.boolean().optional() })
  .refine((d) => d.enabled !== undefined || d.digest !== undefined, {
    message: 'Nichts zu aktualisieren',
  });

/** ngsw expects this exact payload shape to render a notification. No emoji. */
export interface PushPayload {
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: { url?: string; onActionClick?: Record<string, { operation: string; url: string }> };
  };
}

let vapidReady = false;

/** Initialise VAPID from env. Returns false if keys are missing (push disabled). */
export function initWebPush(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:feedback@breakfit.app';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  vapidReady = true;
  return true;
}

/**
 * Send a payload to every subscription of a user. Prunes subscriptions that the
 * push service reports as gone (404/410). Safe to call from a scheduler/cron for
 * streak-at-risk nudges, daily reminders, etc.
 */
export async function sendToUser(sql: Sql, userId: string, payload: PushPayload): Promise<number> {
  if (!vapidReady) return 0;
  const subs = await sql`
    SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}`;
  let sent = 0;
  for (const s of subs) {
    const subscription = {
      endpoint: s.endpoint as string,
      keys: { p256dh: s.p256dh as string, auth: s.auth as string },
    };
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      sent += 1;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        // subscription expired/unsubscribed — prune it
        await sql`DELETE FROM push_subscriptions WHERE endpoint = ${s.endpoint}`;
      }
    }
  }
  return sent;
}

export async function registerPushRoutes(app: FastifyInstance, { sql }: Deps): Promise<void> {
  // POST /push/subscribe — store this browser's subscription for the user
  app.post('/push/subscribe', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Ungültige Subscription' });
    const { endpoint, keys } = parsed.data;
    await sql`
      INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth)
      VALUES (${endpoint}, ${req.userId!}, ${keys.p256dh}, ${keys.auth})
      ON CONFLICT (endpoint) DO UPDATE
        SET user_id = ${req.userId!}, p256dh = ${keys.p256dh}, auth = ${keys.auth}`;

    // create/refresh the reminder prefs row (drives the daily scheduler)
    const tz = parsed.data.timezone ?? 'UTC';
    const locale = parsed.data.locale ?? 'de';
    await sql`
      INSERT INTO reminders (user_id, timezone, locale, enabled)
      VALUES (${req.userId!}, ${tz}, ${locale}, true)
      ON CONFLICT (user_id) DO UPDATE SET timezone = ${tz}, locale = ${locale}`;

    return reply.code(201).send({ ok: true });
  });

  // PATCH /reminders — toggle the daily reminder and/or weekly digest
  app.patch('/reminders', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = reminderSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Ungültig' });
    const { enabled, digest } = parsed.data;
    if (enabled !== undefined) {
      await sql`UPDATE reminders SET enabled = ${enabled} WHERE user_id = ${req.userId!}`;
    }
    if (digest !== undefined) {
      await sql`UPDATE reminders SET digest_enabled = ${digest} WHERE user_id = ${req.userId!}`;
    }
    return reply.send({ ok: true });
  });

  // POST /push/unsubscribe — remove a subscription
  app.post('/push/unsubscribe', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = unsubscribeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Ungültig' });
    await sql`
      DELETE FROM push_subscriptions
      WHERE endpoint = ${parsed.data.endpoint} AND user_id = ${req.userId!}`;
    return reply.send({ ok: true });
  });

  // POST /push/test — send a verification push to the user's devices
  app.post('/push/test', { preHandler: requireAuth }, async (req, reply) => {
    const sent = await sendToUser(sql, req.userId!, {
      notification: {
        title: 'BreakFit',
        body: 'Push funktioniert. Zeit fuer eine Pause.',
        icon: 'icons/icon-192.png',
        badge: 'icons/badge.png',
        data: { url: '/timer' },
      },
    });
    return reply.send({ sent });
  });

  // POST /push/digest-test — send this user's weekly recap to their devices now
  // (same payload the Monday scheduler would send; ignores the once-a-week gate)
  app.post('/push/digest-test', { preHandler: requireAuth }, async (req, reply) => {
    const [prefs] = await sql`
      SELECT timezone, locale FROM reminders WHERE user_id = ${req.userId!}`;
    const timezone = (prefs?.timezone as string) ?? 'UTC';
    const locale = (prefs?.locale as string) ?? 'de';
    const { lastWeek, prevWeek } = await weeklyCounts(sql, req.userId!, timezone);
    const sent = await sendToUser(sql, req.userId!, buildDigestPayload(locale, lastWeek, prevWeek));
    return reply.send({ sent, lastWeek, prevWeek });
  });
}
