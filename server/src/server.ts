import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import postgres from 'postgres';
import Redis from 'ioredis';

import { registerAuthRoutes } from './modules/auth.routes.js';
import { registerSyncRoutes } from './modules/sync.routes.js';
import { registerMeRoutes } from './modules/me.routes.js';
import { registerTelemetryRoutes } from './modules/telemetry.routes.js';
import { registerPushRoutes, initWebPush } from './modules/push.routes.js';
import { startReminderScheduler } from './modules/reminder-scheduler.js';

const PORT = Number(process.env.PORT ?? 8080);
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://localhost/breakfit');
// Redis is OPTIONAL — login codes are persisted in Postgres (login_codes); Redis
// is only an extra fast-path cache. Skip it entirely when REDIS_URL is unset so
// deploys need nothing but Postgres.
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: (process.env.CORS_ORIGIN ?? '*').split(','),
  credentials: true,
});
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

// Decorate request with the authenticated user (set by the auth preHandler).
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

/** Bearer-token auth preHandler used by protected routes. */
export async function requireAuth(
  req: import('fastify').FastifyRequest,
  reply: import('fastify').FastifyReply,
): Promise<void> {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return reply.code(401).send({ message: 'Nicht angemeldet' });
  const hash = await sha256(token);
  const rows = await sql`
    SELECT user_id FROM sessions
    WHERE token_hash = ${hash} AND expires_at > now() LIMIT 1`;
  if (rows.length === 0) return reply.code(401).send({ message: 'Session abgelaufen' });
  req.userId = rows[0].user_id as string;
}

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(digest).toString('hex');
}

app.get('/health', async () => ({ ok: true }));

await registerAuthRoutes(app, { sql, redis });
await registerSyncRoutes(app, { sql });
await registerMeRoutes(app, { sql });
await registerTelemetryRoutes(app);
await registerPushRoutes(app, { sql });

if (initWebPush()) {
  app.log.info('Web Push enabled (VAPID configured)');
  startReminderScheduler(sql, app.log);
} else {
  app.log.warn('Web Push disabled — set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
}

app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`BreakFit API on :${PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

export { sql, redis };
