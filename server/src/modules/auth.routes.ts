import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Sql } from 'postgres';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { sha256, requireAuth } from '../server.js';
import type { Mailer } from '../email/mailer.js';

interface Deps {
  sql: Sql;
  redis: Redis | null;
  mailer: Mailer;
}

const requestSchema = z.object({ email: z.string().email() });
const verifySchema = z.object({ email: z.string().email(), code: z.string().length(6) });

const CODE_TTL_SECONDS = 600; // 10 min
const SESSION_TTL_DAYS = 90;

export async function registerAuthRoutes(app: FastifyInstance, { sql, redis, mailer }: Deps): Promise<void> {
  // POST /auth/request — generate & send a one-time code
  app.post('/auth/request', async (req, reply) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Ungültige E-Mail' });
    const { email } = parsed.data;

    // Per-identity throttle: cap code requests per email to slow brute-force and
    // address-enumeration. DB-backed so it holds across instances; no extra dep.
    const recent = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM login_codes
      WHERE email = ${email} AND created_at > now() - interval '15 minutes'`;
    if (recent[0].n >= 5) {
      return reply.code(429).send({ message: 'Zu viele Anfragen. Bitte später erneut.' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256(code);
    await sql`
      INSERT INTO login_codes (email, code_hash, expires_at)
      VALUES (${email}, ${codeHash}, now() + interval '10 minutes')`;
    if (redis) await redis.set(`code:${email}`, codeHash, 'EX', CODE_TTL_SECONDS);

    // Deliver via the configured transport (console in dev, Resend in prod).
    // Never block/leak on send failure — the user can request a new code.
    try {
      await mailer.sendLoginCode(email, code);
    } catch (err) {
      app.log.error({ err, email }, 'login code send failed');
    }
    return reply.send({ ok: true });
  });

  // POST /auth/verify — exchange code for a session token
  app.post('/auth/verify', async (req, reply) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Ungültige Eingabe' });
    const { email, code } = parsed.data;

    const codeHash = await sha256(code);
    const rows = await sql`
      SELECT id FROM login_codes
      WHERE email = ${email} AND code_hash = ${codeHash}
        AND consumed_at IS NULL AND expires_at > now()
      ORDER BY created_at DESC LIMIT 1`;
    if (rows.length === 0) return reply.code(400).send({ message: 'Code ungültig oder abgelaufen' });

    await sql`UPDATE login_codes SET consumed_at = now() WHERE id = ${rows[0].id}`;

    // upsert user
    const [user] = await sql`
      INSERT INTO users (email, last_login_at) VALUES (${email}, now())
      ON CONFLICT (email) DO UPDATE SET last_login_at = now()
      RETURNING id, email`;

    // mint session token (opaque), store only its hash
    const token = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await sha256(token);
    await sql`
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${tokenHash}, now() + ${`${SESSION_TTL_DAYS} days`}::interval)`;

    return reply.send({ token, user: { id: user.id, email: user.email } });
  });

  // --- session rotation & revocation ---

  // bearer token hash for the current request (null if absent)
  const tokenHashFromReq = async (req: FastifyRequest): Promise<string | null> => {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
    return sha256(header.slice(7));
  };

  // POST /auth/refresh — rotate the current session: issue a new token, delete
  // the old one, extend the TTL. Old token stops working immediately.
  app.post('/auth/refresh', { preHandler: requireAuth }, async (req, reply) => {
    const oldHash = await tokenHashFromReq(req);
    if (!oldHash) return reply.code(401).send({ message: 'Kein Token' });

    const token = crypto.randomUUID() + crypto.randomUUID();
    const newHash = await sha256(token);
    await sql`
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (${req.userId!}, ${newHash}, now() + ${`${SESSION_TTL_DAYS} days`}::interval)`;
    await sql`DELETE FROM sessions WHERE token_hash = ${oldHash}`;
    return reply.send({ token });
  });

  // POST /auth/logout — revoke just this device's session
  app.post('/auth/logout', { preHandler: requireAuth }, async (req, reply) => {
    const hash = await tokenHashFromReq(req);
    if (hash) await sql`DELETE FROM sessions WHERE token_hash = ${hash}`;
    return reply.send({ ok: true });
  });

  // POST /auth/logout-all — revoke every session for the user
  app.post('/auth/logout-all', { preHandler: requireAuth }, async (req, reply) => {
    await sql`DELETE FROM sessions WHERE user_id = ${req.userId!}`;
    return reply.send({ ok: true });
  });
}
