import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const errorSchema = z.object({
  message: z.string().max(2000),
  at: z.number().optional(),
  ua: z.string().max(500).optional(),
  version: z.string().max(50).optional(),
  url: z.string().max(500).optional(),
  stack: z.string().max(4000).optional(),
});

/**
 * Telemetry — a deliberately unauthenticated, rate-limited sink for client-side
 * error reports (the frontend ErrorReportingService posts here when cloud is
 * enabled). It only logs; forward to Sentry/Datadog here if desired.
 */
export async function registerTelemetryRoutes(app: FastifyInstance): Promise<void> {
  app.post('/telemetry/error', async (req, reply) => {
    const parsed = errorSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(204).send(); // never error on telemetry
    req.log.warn({ clientError: parsed.data }, 'client error report');
    return reply.code(204).send();
  });
}
