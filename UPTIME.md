# Uptime monitoring

The API exposes `GET /health` → `200 { ok:true, db, redis }` when healthy, and
`503 { ok:false, ... }` when the database (or a configured Redis) is
unreachable. Point any monitor at it. Layers below, cheapest first — use as many
as you like; they're complementary.

## 1. Container / orchestrator (already wired)

- **Docker Compose**: the `api` service has a `healthcheck` (node `fetch` of
  `/health`, no curl needed). `docker ps` shows `healthy`/`unhealthy`; restart
  policy or a supervisor can act on it.
- **Kubernetes**: `deploy/k8s/api.yaml` defines `readinessProbe` (gate traffic),
  `livenessProbe` (restart a wedged pod) and a `startupProbe`, all on `/health`.

## 2. External SaaS monitor (recommended for real alerting)

UptimeRobot, BetterStack, Pingdom, Checkly, etc. — create an HTTP(S) monitor:

- URL: `https://api.your-domain.com/health`
- Interval: 1–5 min
- Up condition: status `200` **and** body contains `"ok":true`
- Alert channels: email / Slack / SMS / PagerDuty

This is the only layer that pages you when the whole host/region is down, so
don't skip it. The others can't notify if the box hosting them is the thing that
died.

## 3. Free code-based check (no external account)

`.github/workflows/uptime.yml` runs every ~5 min, curls `/health`, fails the run
on non-200 or `ok:false`, and opens a single `uptime`-labelled issue. Enable by
setting a repo **variable** `HEALTH_URL`:

```
Settings → Secrets and variables → Actions → Variables → New variable
  HEALTH_URL = https://api.your-domain.com/health
```

GitHub cron is best-effort (can lag, ~5 min floor) — fine as a backstop, not a
substitute for layer 2.

## 4. Prometheus alerting (if you already scrape /metrics)

`deploy/prometheus/alerts.yml` ships three rules: target down (`up == 0`), 5xx
error rate > 5%, and p95 latency > 750ms. Wire it up:

```yaml
# prometheus.yml
rule_files:
  - alerts.yml
scrape_configs:
  - job_name: breakfit-api          # the `up` series the down-alert needs
    metrics_path: /metrics
    static_configs:
      - targets: ['api:8080']
```

Route the alerts through Alertmanager to your channel of choice. See
OBSERVABILITY.md for the metric definitions and more PromQL.

## Recommended minimum

Layer 1 (already done) + one external monitor (layer 2) on `/health`. Add
layers 3–4 if/when you want redundancy and latency/error alerting.
