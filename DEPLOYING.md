# Deploying BreakFit

## A. Frontend (default: local-only, no backend)

```bash
npm install
npm run build            # -> dist/breakfit/browser
```

Deploy the contents of `dist/breakfit/browser` to any static host (Netlify
Drop, Cloudflare Pages, Vercel, S3+CDN). Ensure SPA fallback to `index.html`
(needed for client-side routing). On Netlify Drop this works out of the box.

In this default build `cloudEnabled` is `false`: no auth, no network on boot,
fully offline. Nothing else to configure.

## B. Activating cloud sync (backend)

### 1. Run the backend stack

```bash
docker compose up -d --build
curl localhost:8080/health                   # { "ok": true }
```

This brings up Postgres, Redis, and the Fastify API on `:8080`. Database
migrations (`server/migrations/*.sql`) are applied **automatically** by the API
container on start, via a small dependency-free runner (`dist/migrate.js`) that
tracks applied versions in a `schema_migrations` table. New schema changes are
just new numbered files (e.g. `0002_add_x.sql`) — they apply on the next deploy.

```bash
# apply migrations manually (e.g. against a managed DB) from server/:
DATABASE_URL=postgres://… npm run migrate
```

For a real deployment, run the same `server/` image on your host (Fly.io,
Railway, a VM, etc.), point `DATABASE_URL` / `REDIS_URL` at managed instances,
and set `CORS_ORIGIN` to your frontend origin. The image migrates on boot; in
multi-replica setups (k8s) run `node dist/migrate.js` as a Job/initContainer
instead of per-replica. Redis is optional — login codes also persist in Postgres
(`login_codes`), so the API runs without `REDIS_URL`.

> The app API is served under **`/v1`** (e.g. `POST /v1/auth/request`); the
> frontend prepends this automatically. `/health` and `/metrics` stay unprefixed.

> Passwordless login emails the 6-digit code in production. In dev
> (`NODE_ENV != production`) the code is logged to the API console so you can
> test without wiring an email provider.

### 2. Flip the frontend flag

In `src/environments/environment.production.ts`:

```ts
cloudEnabled: true,
apiBase: 'https://api.your-domain.com',   // your deployed API origin
```

Then rebuild and redeploy the frontend:

```bash
npm run build
```

That's the entire switch. With the flag on:
- `/auth/login` + `/auth/verify` routes register,
- the Cloud-Sync card appears in Settings,
- `SyncCoordinatorService` starts flushing the offline history queue (on
  reconnect, on tab focus, every 60 s, and after each break),
- `AuthService` restores the session on boot.

With the flag off, none of that code runs — no wasted network, no auth UI.

## C. Notes

- **iOS notifications** only fire when the app is installed to the home screen
  (Safari → Share → "Add to Home Screen"). This is a platform limitation, not a
  bug; the UI surfaces an install hint on iOS.
- **HTTPS is required** for service workers, notifications, and install. Static
  hosts above provide it automatically.

## D. Production deploy — one host, HTTPS, real email

Serves the PWA + API on **one origin** behind Caddy (automatic HTTPS), so testers get a
stable, installable link. Any VPS/cloud VM with Docker + a domain works.
Artifacts: `docker-compose.prod.yml` + `deploy/Caddyfile`.

### 1. DNS + host
- A VM (1 vCPU / 1 GB to start) with Docker + Docker Compose.
- Point an A record (e.g. `app.example.com`) at the VM IP. Open ports 80 + 443.

### 2. Production VAPID keys (don't reuse the local test pair)
```
npx web-push generate-vapid-keys
```
Public key → `src/environments/environment.production.ts` (`vapidPublicKey`), then rebuild.
Both keys → the server `.env` (below).

### 3. Mail provider (real login codes)
Login is passwordless — the server emails a 6-digit code. Wire Resend:
- Resend account → verify your sending domain → create an API key.
- Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=…`, `EMAIL_FROM="BreakFit <login@yourdomain>"`.
Without these the server only logs the code (dev-only; not usable for testers).

### 4. `.env` (next to `docker-compose.prod.yml`)
```
DOMAIN=app.example.com
POSTGRES_PASSWORD=<strong-random>
VAPID_PUBLIC_KEY=<prod public>
VAPID_PRIVATE_KEY=<prod private>
VAPID_SUBJECT=mailto:you@yourdomain
EMAIL_PROVIDER=resend
RESEND_API_KEY=<resend key>
EMAIL_FROM=BreakFit <login@yourdomain>
METRICS_TOKEN=<random; protects /metrics>
```

### 5. Build + run
```
npm run build
docker compose -f docker-compose.prod.yml up -d --build
```
Caddy fetches a TLS cert on first request. Open `https://app.example.com` → install via
"Add to Home Screen" (iOS 16.4+, Android). Login code arrives by email; push + weekly
digest work.

### 6. Verify
- `docker compose -f docker-compose.prod.yml logs api` → `migrate: … applied`,
  `Web Push enabled (VAPID configured)`, `digest scheduler started`.
- `https://app.example.com/health` returns ok; `/metrics` needs the `METRICS_TOKEN` bearer.

### Notes
- Same origin → no CORS needed; `apiBase` stays `''` for web. The native build uses
  `nativeApiBase` — set it to `https://app.example.com` when you ship native.
- Update: `git pull && npm run build && docker compose -f docker-compose.prod.yml up -d --build`.
- Backups: the `bf_pgdata` volume holds all user data — snapshot it regularly.
- Managed alternative: split frontend (static host) + API (Fly.io/Render + managed
  Postgres/Redis); then set `apiBase` to the API URL and `CORS_ORIGIN` to the web origin.
