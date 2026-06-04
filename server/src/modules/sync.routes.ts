import type { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import { z } from 'zod';
import { requireAuth } from '../server.js';

interface Deps {
  sql: Sql;
}

const historySchema = z.object({
  id: z.string().uuid(),
  startedAt: z.string(),
  outcome: z.enum(['completed', 'skipped', 'snoozed']),
  exerciseId: z.string().nullable(),
  exerciseName: z.string().nullable(),
  category: z.string().nullable(),
  amountDone: z.number().int().nonnegative(),
  feedback: z.union([z.literal(-1), z.literal(0), z.literal(1)]).nullable(),
});

export async function registerSyncRoutes(app: FastifyInstance, { sql }: Deps): Promise<void> {
  // POST /sync/history — idempotent upsert (client id is the key)
  app.post('/sync/history', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = historySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Ungültiger Eintrag' });
    const e = parsed.data;
    await sql`
      INSERT INTO history
        (id, user_id, started_at, outcome, exercise_id, exercise_name, category, amount_done, feedback)
      VALUES
        (${e.id}, ${req.userId!}, ${e.startedAt}, ${e.outcome}, ${e.exerciseId},
         ${e.exerciseName}, ${e.category}, ${e.amountDone}, ${e.feedback})
      ON CONFLICT (id) DO NOTHING`;
    return reply.send({ id: e.id, syncState: 'synced' });
  });

  // GET /sync/history — pull this user's full log (newest first)
  app.get('/sync/history', { preHandler: requireAuth }, async (req) => {
    const rows = await sql`
      SELECT id, started_at AS "startedAt", outcome,
             exercise_id AS "exerciseId", exercise_name AS "exerciseName",
             category, amount_done AS "amountDone", feedback
      FROM history WHERE user_id = ${req.userId!}
      ORDER BY started_at DESC`;
    return rows.map((r) => ({ ...r, syncState: 'synced' }));
  });

  // --- settings: whole-object last-write-wins by client `updatedAt` (epoch ms) ---

  const settingsSchema = z.object({
    settings: z.record(z.string(), z.unknown()),
    updatedAt: z.number().int().nonnegative(),
  });

  const readSettings = async (userId: string) => {
    const [row] = await sql`
      SELECT settings, (extract(epoch from updated_at) * 1000)::bigint AS "updatedAt"
      FROM user_settings WHERE user_id = ${userId} LIMIT 1`;
    return row ? { settings: row.settings, updatedAt: Number(row.updatedAt) } : null;
  };

  // PUT /sync/settings — upsert iff incoming is newer, then return the
  // authoritative copy so the client can adopt the winner. This single call
  // both pushes local edits and resolves conflicts (last-write-wins).
  app.put('/sync/settings', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Ungültige Einstellungen' });
    const { settings, updatedAt } = parsed.data;
    await sql`
      INSERT INTO user_settings (user_id, settings, updated_at)
      VALUES (${req.userId!}, ${JSON.stringify(settings)}::jsonb, to_timestamp(${updatedAt} / 1000.0))
      ON CONFLICT (user_id) DO UPDATE
        SET settings = EXCLUDED.settings, updated_at = EXCLUDED.updated_at
        WHERE EXCLUDED.updated_at > user_settings.updated_at`;
    return reply.send(await readSettings(req.userId!));
  });

  // GET /sync/settings — pull (null if the user has never synced settings)
  app.get('/sync/settings', { preHandler: requireAuth }, async (req, reply) => {
    return reply.send(await readSettings(req.userId!));
  });
}
