import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Lightweight, dependency-free metrics in Prometheus text-exposition format.
 *
 * Tracks per (method, route) request counts by status and a latency histogram,
 * so Prometheus/Grafana can derive error rate and p50/p95/p99 via
 * `histogram_quantile(...)`. Route labels use the matched *route pattern*
 * (e.g. `/sync/history`), never the raw URL, so label cardinality stays bounded.
 */

const BUCKETS_MS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

interface RouteStat {
  count: number;
  sumMs: number;
  /** cumulative bucket counts aligned with BUCKETS_MS */
  buckets: number[];
  byStatus: Map<number, number>;
}

const stats = new Map<string, RouteStat>();
let started = Date.now();

function record(method: string, route: string, status: number, durationMs: number): void {
  const key = `${method} ${route}`;
  let s = stats.get(key);
  if (!s) {
    s = { count: 0, sumMs: 0, buckets: new Array(BUCKETS_MS.length).fill(0), byStatus: new Map() };
    stats.set(key, s);
  }
  s.count += 1;
  s.sumMs += durationMs;
  for (let i = 0; i < BUCKETS_MS.length; i++) {
    if (durationMs <= BUCKETS_MS[i]) s.buckets[i] += 1; // cumulative by construction
  }
  s.byStatus.set(status, (s.byStatus.get(status) ?? 0) + 1);
}

const esc = (v: string): string => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

function render(): string {
  const out: string[] = [];

  out.push('# HELP breakfit_http_requests_total Total HTTP requests by route and status.');
  out.push('# TYPE breakfit_http_requests_total counter');
  for (const [key, s] of stats) {
    const [method, route] = key.split(' ');
    for (const [status, n] of s.byStatus) {
      out.push(
        `breakfit_http_requests_total{method="${esc(method)}",route="${esc(route)}",status="${status}"} ${n}`,
      );
    }
  }

  out.push('# HELP breakfit_http_request_duration_ms Request latency histogram (ms).');
  out.push('# TYPE breakfit_http_request_duration_ms histogram');
  for (const [key, s] of stats) {
    const [method, route] = key.split(' ');
    const labels = `method="${esc(method)}",route="${esc(route)}"`;
    for (let i = 0; i < BUCKETS_MS.length; i++) {
      out.push(`breakfit_http_request_duration_ms_bucket{${labels},le="${BUCKETS_MS[i]}"} ${s.buckets[i]}`);
    }
    out.push(`breakfit_http_request_duration_ms_bucket{${labels},le="+Inf"} ${s.count}`);
    out.push(`breakfit_http_request_duration_ms_sum{${labels}} ${s.sumMs.toFixed(3)}`);
    out.push(`breakfit_http_request_duration_ms_count{${labels}} ${s.count}`);
  }

  out.push('# HELP breakfit_process_uptime_seconds Process uptime in seconds.');
  out.push('# TYPE breakfit_process_uptime_seconds gauge');
  out.push(`breakfit_process_uptime_seconds ${((Date.now() - started) / 1000).toFixed(0)}`);

  return out.join('\n') + '\n';
}

/** Register the latency hook and the /metrics endpoint. */
export function registerMetrics(app: FastifyInstance): void {
  started = Date.now();

  app.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    const route = req.routeOptions?.url ?? 'unmatched';
    if (route === '/metrics') return; // don't measure the scrape itself
    record(req.method, route, reply.statusCode, reply.elapsedTime);
  });

  // Optional bearer guard for the scrape endpoint (set METRICS_TOKEN to enable).
  app.get('/metrics', async (req, reply) => {
    const token = process.env.METRICS_TOKEN;
    if (token) {
      const header = req.headers.authorization;
      if (header !== `Bearer ${token}`) return reply.code(401).send('unauthorized');
    }
    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return reply.send(render());
  });
}
