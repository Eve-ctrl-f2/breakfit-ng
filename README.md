# BreakFit

Pomodoro-style break reminder PWA with an adaptive engine that recommends
exercises during breaks. **Angular 21 + PrimeNG 21** rebuild.

- Signals-based state, zoneless change detection, standalone components
- Offline-first (IndexedDB), installable PWA
- Adaptive exercise recommendation engine (recency / difficulty / muscle-group balance, with a feedback loop)
- Optional Fastify + Postgres + Redis backend for cloud sync, gated by a single feature flag
- Permanent dark "Functional Brutalism" theme via a custom PrimeNG preset

## Quick start

```bash
npm install
npm start            # http://localhost:4200
npm run build        # -> dist/breakfit
npm test
```

Local-only by default (`cloudEnabled: false`). See **ARCHITECTURE.md** for the
full architecture, folder structure, database schema, API endpoints, and UI
structure.

## Enabling cloud sync

1. `cd server && cp .env.example .env` and set `DATABASE_URL` / `REDIS_URL`.
2. `npm install && npm run migrate && npm run dev`.
3. In `src/environments/environment.production.ts` set `cloudEnabled: true` and
   `apiBase`, then `npm run build`.

## Deploying the frontend

Static SPA — `npm run build`, then drop `dist/breakfit/browser` on any static
host (Netlify Drop, Cloudflare Pages, Vercel). Ensure SPA fallback to
`index.html`.
