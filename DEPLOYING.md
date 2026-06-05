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
