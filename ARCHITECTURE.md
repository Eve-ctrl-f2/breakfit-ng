# BreakFit — Architecture

Angular 21 + PrimeNG 21 rebuild of the BreakFit break-reminder PWA. This
document is the engineering reference: architecture, folder layout, data model,
API surface, and UI structure.

---

## 1. Architecture

### Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | **Angular 21.2** (stable LTS) | Standalone components, signals, zoneless change detection are now the default & production-stable. |
| UI kit | **PrimeNG 21.1** (styled mode) | 80+ components; theming via design tokens so the whole app inherits one preset. |
| State | **Angular signals** | Fine-grained reactivity without Zone.js or NgRx boilerplate. State lives in `@Injectable({providedIn:'root'})` services exposing readonly signals. |
| Persistence (client) | **IndexedDB** via `idb` | Offline-first. History, settings, and a sync queue survive reloads. |
| PWA | `@angular/service-worker` + manifest | Installable, offline shell, app-like notifications. |
| Backend | **Fastify 5 + Postgres + Redis** | Passwordless auth, history sync. Optional — gated by a feature flag. |
| Tests | **Vitest** (Angular 21 default runner) | Pure domain logic (`buildSummary`, engine) is unit-tested. |

### Reactivity model
There is no global store library. Each domain concern is a root-provided
service that owns a private `signal` and exposes a readonly view plus mutator
methods. Derived data is a `computed`. Persistence is a side `effect` that
writes to IndexedDB whenever the source signal changes. Consumers (components)
read signals directly in templates with zoneless change detection.

```
SettingsService.settings ──computed──> focusSeconds ──> TimerService
ExercisePoolService.active ─────────────────────────────> RecommendationService
HistoryService.entries ──computed──> summary ───────────> InsightsPage
                       └──────────────────────────────> RecommendationService (feedback loop)
```

### The adaptive engine
`RecommendationService.next()` scores every active exercise on four weighted
signals — recency (avoid repeats), difficulty match (nudged by the user's
recent "too easy / too hard" feedback), category mix (boost neglected muscle
groups), and a focus-category multiplier — plus a small random jitter so it
never feels deterministic. `random` and `rotation` modes are also available.
The scoring function is pure and isolated, so it is trivially testable.

### Timer correctness
`TimerService` ticks on a 250 ms interval **outside** Angular's zone, but every
read derives `remaining` from the wall clock (`Date.now() - startedAt`) rather
than counting interval fires. This keeps the countdown accurate when the tab is
throttled/backgrounded; `resync()` runs on `visibilitychange` to snap back.

### Feature flag (`cloudEnabled`)
A single environment flag governs the entire cloud surface. When `false`:
the `/auth/*` routes are never registered, `AuthService` makes **no** network
call on boot, the Cloud-Sync settings card is hidden, and `HistoryService`
skips the sync queue. Flip it to `true`, set `apiBase`, rebuild — no code
changes. This mirrors the React build's `VITE_CLOUD_ENABLED`.

---

## 2. Folder structure

```
breakfit-ng/
├── angular.json, package.json, tsconfig*.json, ngsw-config.json
├── public/                         # static assets, manifest, icons, favicon
├── db/
│   └── schema.sql                  # Postgres schema
├── server/                         # Fastify API (optional backend)
│   └── src/
│       ├── server.ts               # app bootstrap, auth preHandler
│       └── modules/
│           ├── auth.routes.ts      # /auth/request, /auth/verify
│           ├── sync.routes.ts      # /sync/history (push/pull)
│           └── me.routes.ts        # /me, /me/delete
└── src/
    ├── main.ts                     # bootstrapApplication(App, appConfig)
    ├── styles.css                  # design tokens + responsive shell
    ├── environments/               # environment + production + types
    └── app/
        ├── app.ts                  # shell: nav, break-modal host, title cue
        ├── app.config.ts           # providers (router, http, PrimeNG theme, SW)
        ├── app.routes.ts           # lazy routes, auth routes flag-gated
        ├── theme/
        │   └── breakfit-preset.ts  # PrimeNG preset — "Functional Brutalism"
        ├── core/
        │   ├── models/             # Exercise, TimerState, Settings, History…
        │   ├── data/               # BASE_EXERCISES, category labels/colors
        │   ├── services/           # timer, settings, history, recommendation,
        │   │   │                   #   exercise-pool, notification
        │   │   └── storage/        # idb.service.ts (IndexedDB wrapper)
        │   └── api/                # auth.service, sync.service, interceptors
        └── features/               # one folder per route-level feature
            ├── timer/              # countdown dial + controls
            ├── break/              # break-modal (recommendation + logging)
            ├── insights/           # stats, category meter, weekday bars
            ├── settings/           # all preference cards
            └── auth/               # login + verify (only built when cloud on)
```

Path aliases (`tsconfig.json`): `@core/*`, `@features/*`, `@shared/*`, `@env/*`.

---

## 3. Database schema

Postgres (`db/schema.sql`). Six tables:

- **users** — `id`, `email` (citext, unique), timestamps.
- **login_codes** — hashed one-time codes for passwordless login, with TTL and
  attempt counter. Codes are never stored in plaintext.
- **sessions** — opaque bearer tokens, stored as SHA-256 hashes, 90-day TTL.
- **user_settings** — 1:1 with user, `settings JSONB` mirroring the client
  `UserSettings` shape.
- **history** — break outcomes. The **client-generated UUID is the primary
  key**, which makes sync idempotent (`ON CONFLICT DO NOTHING`). Indexed on
  `(user_id, started_at DESC)`.
- **custom_exercises** — user-created pool additions, composite PK
  `(user_id, id)`.

All child tables cascade-delete from `users`, so account deletion is a single
`DELETE FROM users`.

---

## 4. API endpoints

Base URL = `apiBase`. All protected routes require `Authorization: Bearer <token>`.

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/health` | – | – | `{ ok: true }` |
| POST | `/auth/request` | – | `{ email }` | `{ ok: true }` (emails a 6-digit code; logged in dev) |
| POST | `/auth/verify` | – | `{ email, code }` | `{ token, user }` |
| GET | `/me` | ✓ | – | `{ id, email }` |
| POST | `/me/delete` | ✓ | `{ confirmation: "KONTO LÖSCHEN" }` | `{ ok: true }` |
| POST | `/sync/history` | ✓ | `HistoryEntry` | `{ id, syncState: "synced" }` (idempotent) |
| GET | `/sync/history` | ✓ | – | `HistoryEntry[]` (newest first) |

Validation is Zod-based at the route boundary; 401 on missing/expired session,
400 on schema failure. `KONTO LÖSCHEN` is a verbatim security literal — **not**
localized on client or server.

---

## 5. UI structure

Three primary routes behind a responsive shell.

```
App shell (app.ts)
├── Top pill nav        (desktop / pointer:fine)
├── Bottom nav bar      (max-width:767px AND pointer:coarse — touch only)
├── <router-outlet>
│   ├── /timer      TimerPage     → Knob countdown dial, start/pause/stop,
│   │                               cycle pips, focus/break sublabel
│   ├── /insights   InsightsPage  → 3 stat cards (done / streak / rate),
│   │                               category MeterGroup, weekday bars, history list
│   └── /settings   SettingsPage  → Timer sliders, Difficulty SelectButton,
│                                   Selection-mode SelectButton, Exercise-pool
│                                   toggles, Notifications, Feedback, About
│   (+ /auth/login, /auth/verify  → only when cloudEnabled)
└── BreakModal (global, opened when a focus interval elapses)
        Step 1 "exercise": recommendation card (icon/category/name/reason),
                           reps stepper (−  [input]  +) with caption BELOW,
                           "Andere Übung" reshuffle.
                           Footer actions in intent tiers:
                             row 1  Meeting | Snooze   (postpone, equal weight)
                             row 2  Überspringen        (discard — ghost danger)
                             primary Erledigt           (full-width)
        Step 2 "feedback": Zu leicht | Passt | Zu hart  → records outcome.
```

### Design language — "Functional Brutalism"
Carried over from the React build and expressed through the PrimeNG preset:
near-black surfaces (`#08080c` base), a single lime accent (`#c8f060`), monospace
display type, generous radius, per-category accent colors. Because it's a token
preset, every PrimeNG component (Button, Dialog, Slider, Card…) inherits the look
with zero per-component overrides.

### Mobile specifics
- All inputs are ≥16px to stop iOS Safari auto-zoom on focus.
- Bottom nav respects `env(safe-area-inset-bottom)`.
- Bottom nav is gated on `pointer: coarse` so a half-screen laptop window never
  flips into mobile mode.
- System notifications carry **no emoji** (text + icon asset only); the 🔔 cue
  lives only in the browser tab title — a separate surface.

---

## 6. Build & run

```bash
# Frontend
npm install
npm start                 # dev server at http://localhost:4200
npm run build             # production build -> dist/breakfit
npm test                  # Vitest

# Backend (optional — only if cloudEnabled)
cd server
cp .env.example .env       # set DATABASE_URL / REDIS_URL
npm install
npm run migrate            # apply db/schema.sql
npm run dev                # API at http://localhost:8080
```

To enable cloud sync: set `cloudEnabled: true` and `apiBase` in
`src/environments/environment.production.ts`, deploy `server/`, rebuild.
