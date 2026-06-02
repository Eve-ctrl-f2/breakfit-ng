import type { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import { z } from 'zod';
import { requireAuth } from '../server.js';

interface Deps {
  sql: Sql;
}

// SECURITY TOKEN, not UI copy. The client sends this verbatim string; it is
// intentionally NOT localized on either side. Kept identical to the React
// build's literal so existing clients keep working.
const deleteSchema = z.object({ confirmation: z.literal('KONTO LÖSCHEN') });

export async function registerMeRoutes(app: FastifyInstance, { sql }: Deps): Promise<void> {
  // GET /me — current user
  app.get('/me', { preHandler: requireAuth }, async (req, reply) => {
    const rows = await sql`SELECT id, email FROM users WHERE id = ${req.userId!} LIMIT 1`;
    if (rows.length === 0) return reply.code(404).send({ message: 'Nicht gefunden' });
    return rows[0];
  });

  // POST /me/delete — irreversible; cascades to history/settings/sessions
  app.post('/me/delete', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = deleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Bestätigung stimmt nicht' });
    }
    await sql`DELETE FROM users WHERE id = ${req.userId!}`;
    return reply.send({ ok: true });
  });
}
