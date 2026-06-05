# BreakFit — Project Status

Snapshot of the Angular 21 + PrimeNG rebuild and the Fastify/Postgres/Redis
backend after the full P1–P3 backlog pass.

## Smoke-check (all green)

| Check | Result |
|---|---|
| TS brace balance (all `src` + `server/src`) | ✅ balanced |
| i18n symmetry | ✅ 5 locales × **195 keys**, 0 missing/extra |
| i18n usage audit | ✅ 177 used, 0 missing |
| Missing-import scan (every `inject()` has an import) | ✅ clean |
| Timer regression guard (app effect never writes timer state) | ✅ effect only opens modal |
| YAML validity (compose, ci, uptime, dependabot, k8s, prometheus) | ✅ 6/6 parse |
| Docker backend build (`tsc`) | ✅ compiles & runs (`/health` → ok) |

> Note: `tsc`/`ng build` can't run in the authoring sandbox (filesystem blocks
> `npm install`), so type errors are caught by review + the Docker build, not a
> local compile. The brace/i18n/import/YAML checks above run on every change.

## Structure

- **Frontend** (`src/app`): 16 components, 22 injectable services.
  - `core/services`: timer, settings, exercise-pool, history, recommendation,
    notification, meeting, milestone, goal, preset, onboarding, platform,
    sync-coordinator, health, theme, storage/idb.
  - `core/api`: auth, sync, push, error-reporting, interceptors.
  - `features`: timer, break, insights, settings, onboarding, auth.
- **Backend** (`server/src`): Fastify server, metrics, email/mailer, and route
  modules (auth, me, sync, push, telemetry, reminder-scheduler).
- **Docs**: README, ARCHITECTURE, DEPLOYING(+PUSH), PERFORMANCE, ACCESSIBILITY,
  SECURITY, OBSERVABILITY, UPTIME, HEALTH, ROADMAP, STATUS.
- **Infra**: `.github/workflows` (ci, uptime), `dependabot.yml`,
  `deploy/k8s/api.yaml`, `deploy/prometheus/alerts.yml`, `docker-compose.yml`.

## Backend API surface

All app endpoints are served under **`/v1`** (`/health` and `/metrics` stay at root):

`/health` · `/metrics` · `/v1/me` · `/v1/me/export` · `/v1/me/delete` ·
`/v1/auth/*` ·
`/v1/sync/history` (GET/POST) · `/v1/sync/settings` (GET/PUT) ·
`/v1/push/*` · `/v1/telemetry/error`

## Delivered (by priority)

- **P1** — CI pipeline; snooze duration; edit custom exercises; `data-testid` +
  E2E; security headers (web + API); email provider (console/Resend); session
  rotation + revocation; GDPR data export; expanded unit tests.
- **P2** — per-identity auth rate limit; enriched health check; rest-days /
  streak-freeze; dependency scanning (audit gate + Dependabot); structured logs
  + Prometheus metrics; multi-device settings conflict policy (LWW); uptime
  monitoring (compose healthcheck, k8s probes, GH-cron monitor, alert rules);
  accessibility pass.
- **P3** — body heatmap; onboarding; weekly recap; exercise how-to + media seam;
  Apple Health / Google Fit (native bridge seam + TCX export); themes
  (system/light/dark + accent picker); locales ES + IT (now DE/EN/FR/ES/IT).

## Known limitations / things that need real infra

These are by design — a web app can't do them alone:

- **Native push & install-only alerts** need VAPID keys configured and, on iOS,
  the PWA added to the home screen.
- **Apple Health / Google Fit writing** needs a native Capacitor shell that
  injects `window.bfHealth`; the web app ships the seam + TCX export only.
- **External uptime alerting** needs an account (UptimeRobot/BetterStack) pointed
  at `/health`; the in-repo monitors are supplements.
- **Light-mode PrimeNG components** use the preset's default light tokens; deeper
  alignment to app surfaces is optional polish.

## Open / optional backlog

- Commit `package-lock.json` (root + `/server`); then flip CI to `npm ci`.
  *(Blocked in the authoring sandbox — `npm install` can't run here; generate the lockfiles in a real environment.)*
- Digest push (weekly recap as a notification).
- Visual-regression tests; broader unit coverage of the recommendation engine.
- Capacitor/TWA wrapper for app-store distribution.
