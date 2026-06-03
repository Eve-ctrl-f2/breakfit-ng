import type { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import type Redis from 'ioredis';
import { z } from 'zod';
import { sha256 } from '../server.js';

interface Deps {
  sql: Sql;
  redis: Redis | null;
}

const requestSchema = z.object({ email: z.string().email() });
const verifySchema = z.object({ email: z.string().email(), code: z.string().length(6) });

const CODE_TTL_SECONDS = 600; // 10 min
const SESSION_TTL_DAYS = 90;

export async function registerAuthRoutes(app: FastifyInstance, { sql, redis }: Deps): Promise<void> {
  // POST /auth/request — generate & "send" a one-time code
  app.post('/auth/request', async (req, reply) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Ungültige E-Mail' });
    const { email } = parsed.data;

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256(code);
    await sql`
      INSERT INTO login_codes (email, code_hash, expires_at)
      VALUES (${email}, ${codeHash}, now() + interval '10 minutes')`;
    if (redis) await redis.set(`code:${email}`, codeHash, 'EX', CODE_TTL_SECONDS);

    // In production: enqueue an email. In dev: log it so testers can read it.
    if (process.env.NODE_ENV !== 'production') {
      app.log.info({ email, code }, 'DEV login code');
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
}
