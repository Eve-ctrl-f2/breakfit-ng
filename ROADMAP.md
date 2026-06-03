# BreakFit — Roadmap & Production Requirements

Status of the rebuild and what's still needed to call it production-grade.
Grouped by area, each item tagged with rough priority (P1 = needed for a real
launch, P2 = strongly wanted, P3 = nice-to-have).

## Done

Core timer + adaptive engine · break modal · insights (stats, category meter,
weekday bars, body heatmap, milestones) · settings (timer, difficulty, modes,
pool, custom exercises, presets, weekly goal) · meeting mode · i18n (DE/EN/FR,
166 keys, symmetric) · onboarding · PWA (manifest, SW, install/platform
detection) · offline-first sync coordinator · global error handler · feature
flag for cloud · Fastify+Postgres+Redis backend (schema, auth, sync, deletion)
· Playwright E2E foundation · Docker/compose for the backend.

---

## 1. Product features

| Prio | Feature | Notes |
|---|---|---|
| P1 | **Edit / reorder custom exercises** | Today they can only be added/deleted. Editing + drag-reorder of the pool. |
| P1 | **Snooze duration choice** | Snooze currently re-focuses with the default interval; let the user pick 2/5/10 min. |
| P2 | **Real server push** | Web Push (VAPID) so reminders fire with the tab closed on Android/desktop; iOS only as installed PWA. Backend endpoint + SW push handler. |
| P2 | **Streak freeze / rest days** | Don't break the streak on configured rest days (weekends), Duolingo-style freeze. |
| P2 | **Exercise instructions / media** | Short "how to" text or looping animation per exercise; today it's just a name. |
| P2 | **Daily/weekly summary** | "You did 14 breaks this week, +3 vs last." Recap card + optional digest push. |
| P3 | **More locales** | Catalog is symmetric; add ES/IT by dropping in a locale block. |
| P3 | **Apple Health / Google Fit export** | Log movement minutes to the platform health store. |
| P3 | **Themes** | The preset system supports alternates; offer a light theme + accent picker. |

## 2. Technical / infrastructure

| Prio | Item | Notes |
|---|---|---|
| P1 | **CI pipeline** | GitHub Actions: install → lint → unit (Vitest) → build → Playwright. Block merge on red. |
| P1 | **Server email provider** | Auth currently logs the code in dev. Wire a real transactional email (Resend/SES/Postmark) for production login. |
| P1 | **DB migrations tool** | `schema.sql` is fine for v1; move to versioned migrations (drizzle/node-pg-migrate) before schema changes ship. |
| P2 | **Rate limiting per-identity** | Global rate-limit exists; add per-email throttling on `/auth/request` to stop code-spam/enumeration. |
| P2 | **Multi-device sync conflict policy** | Sync is client-id idempotent (last-write-wins). Define merge for settings edited on two devices. |
| P2 | **Background Sync API (Chromium)** | Augment the in-app retry with a real SW `sync` event where supported (custom SW alongside ngsw). |
| P3 | **API versioning** | Prefix routes `/v1/*` before external clients exist. |

## 3. Security & privacy

| Prio | Item | Notes |
|---|---|---|
| P1 | **Security headers / CSP** | Set CSP, HSTS, X-Content-Type-Options on the static host and API. |
| P1 | **Session rotation + revocation** | Tokens are hashed with TTL; add refresh/rotation and a "log out all devices". |
| P1 | **Privacy policy + data export** | GDPR: account deletion exists (`KONTO LÖSCHEN`); add a data-export endpoint and a published policy. |
| P2 | **Dependency scanning** | `npm audit` + Dependabot/Renovate in CI. |
| P2 | **Secrets management** | Move DB/Redis creds + future VAPID/email keys to a secret store, not compose literals. |

## 4. Quality & testing

| Prio | Item | Notes |
|---|---|---|
| P1 | **Expand unit coverage** | Engine (`recommendation`), timer transitions, streak/goal math (timezone edge cases). Currently only `buildSummary` is covered. |
| P1 | **E2E for break + meeting + onboarding flows** | Timer + settings specs exist; add the modal lifecycle, meeting suppression, and first-run wizard. |
| P2 | **`data-testid` selectors** | Stable E2E hooks independent of i18n/PrimeNG DOM (the language-switch test broke on text ambiguity once). |
| P2 | **Accessibility audit** | Keyboard traps in dialogs, focus return, contrast (the button system was a recurring pain), screen-reader labels. |
| P3 | **Visual regression** | Playwright screenshots for the timer dial + break modal. |

## 5. Observability & ops

| Prio | Item | Notes |
|---|---|---|
| P1 | **Wire the error handler to a sink** | `GlobalErrorHandler` is Sentry-ready; add the DSN/transport for production. |
| P2 | **Backend logging + metrics** | Fastify logger is on; ship structured logs + request metrics (p95 latency, error rate). |
| P2 | **Uptime / health checks** | `/health` exists; add an external monitor + DB/Redis readiness in the check. |
| P3 | **Analytics (privacy-respecting)** | Plausible/PostHog for funnel (onboarding completion, break completion rate). Opt-in. |

## 6. Compliance / store readiness

| Prio | Item | Notes |
|---|---|---|
| P2 | **Lighthouse PWA pass** | Verify installability + perf ≥ 90 against the prod build (see PERFORMANCE.md). |
| P3 | **App store wrappers** | If shipping to stores, wrap via Capacitor/TWA; reuse the same web build. |
| P3 | **Cookie/consent** | None today (no third-party cookies). Needed only if analytics is added. |

---

## Suggested next sprint (P1 cluster)

1. CI pipeline (gates everything else).
2. Real email provider + session rotation (unblocks cloud launch).
3. Edit/reorder custom exercises + snooze duration (closes obvious product gaps).
4. Expand unit + E2E coverage; add `data-testid`.
5. CSP/security headers + privacy policy + data export.
