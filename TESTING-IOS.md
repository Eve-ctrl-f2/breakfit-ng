# Testing on iPhone without a Mac (PWA over HTTPS)

iOS needs an **HTTPS** origin for service workers + web push, and an HTTPS page
can't call an HTTP API (mixed content). So we serve the PWA **and** the API behind
one nginx origin (the `web` service) and expose it through a single HTTPS tunnel.
No CORS, and the public URL never gets baked into the build (`apiBase` is relative).

This validates the real product on iOS — including the digest/reminder **web push**
(iOS 16.4+, app installed to the home screen). Native HealthKit/native push are not
part of this path (that's the Capacitor build, later).

## Prerequisites
- VAPID keys set (your `.env`, already configured) — the api must log
  `Web Push enabled` on start.
- A tunnel tool: **cloudflared** (`cloudflared`) or **ngrok**.

## Steps

```bash
# 1. build the PWA (nginx serves this mounted output)
npm run build

# 2. start the full stack: db + redis + api + web (nginx on :4200)
docker compose up -d --build

# 3. sanity-check on desktop — same origin now, no http-server needed
#    open http://localhost:4200  -> login should work (code in: docker compose logs -f api)

# 4. expose port 4200 over HTTPS (pick ONE):
cloudflared tunnel --url http://localhost:4200
#   -> prints https://<random>.trycloudflare.com
# or:
ngrok http 4200
#   -> prints https://<random>.ngrok-free.app
```

```text
5. On the iPhone (Safari): open the https URL from step 4
   -> Share -> "Zum Home-Bildschirm" -> launch from the home screen (standalone)
6. Log in (code from `docker compose logs -f api`)
7. Settings -> enable "Push (auch bei geschlossener App)" -> "Rückblick-Push testen"
```

## Notes
- **One origin** means no CORS and `apiBase: ''` — you can restart the tunnel and get
  a new URL anytime without rebuilding the frontend.
- iOS **web push** requires iOS 16.4+ **and** the app added to the home screen; it
  won't work in a normal Safari tab.
- The free cloudflared/ngrok URLs are temporary — fine for a test session.
- After changing web code: `npm run build` (nginx serves the new files from the mount
  immediately). On the device, relaunch the installed app; the service worker picks up
  the update on the next load.
- Desktop testing now also goes through `http://localhost:4200` (the `web` service) —
  you no longer need `npx http-server`.
