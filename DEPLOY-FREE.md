# BreakFit — Free Deployment Guide (initial test)

A start-to-finish, **no-prior-knowledge-assumed** guide to put BreakFit online for
free so you (and a few testers) can use it from a phone. Every account you need and
every click is listed.

## The free stack

| Piece | Service | Free? |
|------|---------|-------|
| Database (Postgres) | **Neon** | yes, always on |
| API server | **Render** (Docker web service) | yes (sleeps when idle — we keep it awake) |
| PWA hosting + API proxy | **Netlify** | yes, always on |
| Login-code emails | **Resend** | yes (100/day) |
| Keep API awake + run weekly digest | **cron-job.org** | yes |

Redis is **not** needed (the API runs fine without it).

The browser only ever talks to **one** origin (Netlify): Netlify serves the app and
**proxies** `/v1/*` to the API on Render. That means no CORS and `apiBase` stays `''`.

You'll create 5 free accounts: GitHub, Neon, Resend, Render, Netlify (+ cron-job.org).

---

## Step 0 — Put the project on GitHub (Render deploys from Git)

1. Create a free account at https://github.com (if you don't have one).
2. On GitHub: top-right **+** → **New repository**. Name it `breakfit`, set **Private**,
   do **not** add a README. Click **Create repository**. Leave the page open — it shows
   the commands you need.
3. In a terminal, in your project folder (`breakfit-ng`):
   ```bash
   git init                 # only if it's not already a git repo
   git add .
   git commit -m "Deploy: initial"
   git branch -M main
   git remote add origin https://github.com/<your-user>/breakfit.git
   git push -u origin main
   ```
   Your secrets are safe: `.env` is git-ignored, so the VAPID private key is **not**
   pushed. The committed `environment.production.ts` only holds the *public* key.

> Every later `git push` to `main` will auto-redeploy the API on Render.

## Step 1 — Database on Neon

1. Sign up at https://neon.tech (sign in with GitHub or Google — free).
2. **Create project**. Pick a region close to you (e.g. **Europe (Frankfurt)**). Name it
   `breakfit`.
3. After it's created, open **Dashboard → Connection string**. Turn **Connection pooling
   OFF** (use the *direct* connection — migrations run DDL in a transaction). Copy the
   string. It looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxxx.eu-central-1.aws.neon.tech/breakfit?sslmode=require
   ```
4. Keep this — it's your `DATABASE_URL`. Make sure it ends with `?sslmode=require`.

## Step 2 — Email on Resend

1. Sign up at https://resend.com (free).
2. Left menu → **API Keys** → **Create API Key** → name it `breakfit`, permission
   **Sending access**. Copy the key (starts with `re_…`) — you only see it once.
3. Sender address:
   - **For your own first test:** you can send with `from = onboarding@resend.dev` to the
     email address you signed up with — no domain needed.
   - **To invite other testers later:** add a domain under **Domains → Add Domain** and
     add the shown DNS records at your domain registrar; then use
     `from = login@yourdomain`.
4. Note your `RESEND_API_KEY` and the `EMAIL_FROM` value (e.g. `BreakFit <onboarding@resend.dev>`).

## Step 3 — API on Render

1. Sign up at https://render.com → **Sign in with GitHub** (lets Render see your repo).
2. Top **+ New** → **Web Service** → **Build and deploy from a Git repository** → select
   your `breakfit` repo → **Connect**.
3. Settings:
   - **Name:** `breakfit-api`
   - **Region:** Frankfurt (EU)
   - **Root Directory:** `server`  ← important (the Dockerfile lives there)
   - **Runtime:** it auto-detects **Docker** from the Dockerfile.
   - **Instance Type:** **Free**
   - **Health Check Path:** `/health`
4. Expand **Advanced → Environment Variables** and add (one per row):
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | *(the Neon string from Step 1)* |
   | `EMAIL_PROVIDER` | `resend` |
   | `RESEND_API_KEY` | *(from Step 2)* |
   | `EMAIL_FROM` | `BreakFit <onboarding@resend.dev>` |
   | `VAPID_PUBLIC_KEY` | *(from your local `.env`)* |
   | `VAPID_PRIVATE_KEY` | *(from your local `.env`)* |
   | `VAPID_SUBJECT` | `mailto:feedback@breakfit.app` |
   | `LOG_LEVEL` | `info` |

   (Leave `PORT` unset — Render provides it and the app respects it. Add `CORS_ORIGIN`
   later in Step 4 once you know the Netlify URL; with the proxy it's not strictly
   required, but it's good hygiene.)
5. **Create Web Service**. Watch the log; on success you'll see
   `migrate: … applied`, `Web Push enabled (VAPID configured)`, and `BreakFit API on :…`.
6. Copy the service URL, e.g. `https://breakfit-api.onrender.com`. Test it: open
   `https://breakfit-api.onrender.com/health` in a browser → you should get
   `{"ok":true,"db":true,"redis":null}`.

> If the log says **"Web Push disabled"**, a VAPID var is missing/misspelled.
> If it can't connect to the DB, re-check `DATABASE_URL` (and that `sslmode=require`
> is present; if you see a `channel_binding` error, remove `&channel_binding=require`
> from the URL).

## Step 4 — Frontend on Netlify (with the API proxy)

1. Edit **`public/_redirects`** in the project and replace `YOUR-API.onrender.com` (in
   the two proxy lines) with your real Render host, e.g. `breakfit-api.onrender.com`.
2. Confirm `src/environments/environment.production.ts` has `apiBase: ''` and your
   `vapidPublicKey` (both already set).
3. Build:
   ```bash
   npm run build
   ```
   Output is in `dist/breakfit/browser` (the `_redirects` file is included).
4. Sign up at https://netlify.com (free). Then open https://app.netlify.com/drop and
   **drag the `dist/breakfit/browser` folder** onto the page. Netlify deploys it and
   gives you a URL like `https://random-name-123.netlify.app`.
5. (Optional, nicer URL) **Site configuration → Change site name** → e.g. `breakfit-eve`
   → your URL becomes `https://breakfit-eve.netlify.app`.
6. Back on Render → your service → **Environment** → set `CORS_ORIGIN` to your Netlify
   URL (e.g. `https://breakfit-eve.netlify.app`) → **Save** (it redeploys).

## Step 5 — Keep the API awake (and run the weekly digest)

Render's free API sleeps after ~15 min idle (first request then takes ~30–60 s, which
can time out through the proxy). A free pinger keeps it warm **and** lets the
reminder/digest schedulers run:

1. Sign up at https://cron-job.org (free).
2. **Create cronjob**:
   - **Title:** `breakfit-keepalive`
   - **URL:** `https://breakfit-api.onrender.com/health`
   - **Schedule:** every **10 minutes**
3. Save & enable. (This stays within Render's free 750 hours/month.)

## Step 6 — Try it

1. Open your Netlify URL on the desktop. Click login, enter your email.
2. The code arrives by email (Resend). *(If you left `EMAIL_PROVIDER=console`, read the
   code from Render → your service → **Logs** instead.)*
3. Enter the code → you're in. Enable **Push (auch bei geschlossener App)** →
   **Rückblick-Push testen** to confirm push end-to-end.
4. **On your iPhone (iOS 16.4+):** open the Netlify URL in Safari → **Share → Zum
   Home-Bildschirm** → launch from the home screen → log in → enable push.
   (Android: same idea via Chrome's "Add to Home screen".)

## Updating later

- **Frontend:** `npm run build`, then drag `dist/breakfit/browser` onto Netlify Drop
  again (or connect the Git repo in Netlify for automatic deploys).
- **API:** `git push` → Render redeploys automatically and applies new migrations.

## Limits & costs (all free tiers)

- **Render free:** sleeps when idle (the pinger handles it), 750 h/month.
- **Neon free:** generous, always on.
- **Netlify free:** 100 GB bandwidth/month — plenty for a PWA.
- **Resend free:** 100 emails/day, 3,000/month; sending to addresses other than your
  own requires a verified domain.
- **cron-job.org:** free.

No credit card is required for Neon, Netlify, Resend, or cron-job.org. Render's free
web service doesn't require a card either. This is enough for an initial test group;
when you outgrow it, the natural next step is a small always-on host (or paid Render
instance) and a verified email domain.
