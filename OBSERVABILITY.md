# Observability

## Logging

The API logs structured JSON via Fastify's built-in pino logger.

- **Level** via `LOG_LEVEL` (default `info`; use `debug` locally, `warn` in noisy
  prod if needed).
- **Redaction**: `authorization` / `cookie` request headers and `set-cookie`
  response headers are stripped, so tokens and credentials never hit the logs.
- Each request/response is logged with Fastify's auto request id (`reqId`) for
  correlation. `trustProxy` is on, so client IPs are correct behind a proxy/LB.

Ship these to your log aggregator (Loki, Datadog, CloudWatch, …) by collecting
container stdout — no app changes needed since the logs are already JSON.

```bash
# pretty-print locally
docker compose logs -f api | npx pino-pretty
```

## Metrics

A dependency-free `/metrics` endpoint exposes Prometheus text format
(`registerMetrics` in `server/src/metrics.ts`).

Series:

- `breakfit_http_requests_total{method,route,status}` — counter. Error rate is
  derived from the `status` label.
- `breakfit_http_request_duration_ms{method,route}` — histogram (`_bucket`,
  `_sum`, `_count`). Latency percentiles are computed at query time.
- `breakfit_process_uptime_seconds` — gauge.

Route labels use the matched **route pattern** (e.g. `/sync/history`), never the
raw URL, so cardinality stays bounded.

### Scrape

```yaml
# prometheus.yml
scrape_configs:
  - job_name: breakfit-api
    metrics_path: /metrics
    static_configs:
      - targets: ['api:8080']
    # if METRICS_TOKEN is set:
    # authorization: { credentials: '<METRICS_TOKEN>' }
```

Set `METRICS_TOKEN` to require `Authorization: Bearer <token>` on the scrape;
leave it unset for an open internal endpoint.

### Useful PromQL

```promql
# p95 latency per route (last 5m)
histogram_quantile(0.95,
  sum(rate(breakfit_http_request_duration_ms_bucket[5m])) by (le, route))

# 5xx error rate
sum(rate(breakfit_http_requests_total{status=~"5.."}[5m]))
  / sum(rate(breakfit_http_requests_total[5m]))

# requests per second by route
sum(rate(breakfit_http_requests_total[1m])) by (route)
```

## Health

`GET /health` returns `{ ok, db, redis }` and a `503` when degraded (DB
unreachable, or Redis configured but down). Point an external uptime monitor
(UptimeRobot, Pingdom, a k8s readiness probe) at it.
