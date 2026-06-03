# Live-Test der Push-Kette (Web Push / VAPID)

Echte VAPID-Keys sind bereits generiert und eingetragen:
- **Frontend** `src/environments/environment.production.ts` → `vapidPublicKey` gesetzt, `cloudEnabled: true`.
- **Backend** `server/.env` → `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` gesetzt (privaten Key geheim halten).

Du musst nur noch das Backend erreichbar machen (HTTPS) und im Frontend die `apiBase` eintragen.

---

## Schritt 1 — Backend starten

### Variante A: Docker (lokal, am einfachsten)
```bash
# im Projektordner breakfit-ng/
docker compose up --build
```
Das startet Postgres (Schema wird automatisch eingespielt) + die API auf `http://localhost:8080`.
Health-Check: `curl http://localhost:8080/health` → `{"ok":true}`.
Im Log erscheint: `Web Push enabled (VAPID configured)` und `reminder scheduler started`.

### Variante B: Managed Host (öffentlich, für Test vom Handy)
Push braucht HTTPS. Schnellster Weg, damit dein iPhone/Android die API erreicht:
1. Backend wie oben lokal starten.
2. Einen HTTPS-Tunnel davorsetzen, z. B.:
   ```bash
   cloudflared tunnel --url http://localhost:8080
   # oder: ngrok http 8080
   ```
   Du bekommst eine `https://…`-URL — das ist deine **API-URL**.

(Alternativ: `server/` auf Render/Railway/Fly deployen, dort eine managed Postgres anhängen,
die Env-Variablen aus `server/.env` setzen, `db/schema.sql` einmalig einspielen.)

---

## Schritt 2 — Frontend auf die API zeigen
In `src/environments/environment.production.ts`:
```ts
apiBase: 'https://DEINE-API-URL',   // die URL aus Schritt 1 (ohne Slash am Ende)
```
Dann neu bauen und deployen (wie gewohnt):
```bash
npm run build      # -> dist/breakfit/browser
# dist/breakfit/browser auf Netlify Drop ziehen
```
CORS: für den Test steht `CORS_ORIGIN=*` in `server/.env`. Für „richtig" dort die Netlify-URL eintragen.

---

## Schritt 3 — Push testen (am Gerät)
1. Frontend-URL öffnen. **iOS:** zuerst über Safari „Zum Home-Bildschirm" — Push geht auf iOS nur als installierte PWA. Android/Desktop: normal im Browser oder installiert.
2. In der App **Anmelden** (Einstellungen → Cloud-Sync, oder /auth/login). E-Mail eingeben → „Code anfordern".
   - Es wird **keine echte Mail** versendet (kein Mailer konfiguriert). Den 6-stelligen Code aus dem **API-Log** ablesen:
     - Docker: erscheint im `docker compose`-Log als `DEV login code` (nur wenn `NODE_ENV != production`; für den Test ggf. `NODE_ENV=development` setzen, sonst Code in der DB-Tabelle `login_codes`).
   - Code eingeben → eingeloggt.
3. Einstellungen → **Benachrichtigungen** → Toggle **„Push (auch bei geschlossener App)"** aktivieren → Permission erlauben. (Toggle erscheint nur, wenn alle Bedingungen erfüllt sind: cloud an, VAPID-Key, SW aktiv, auf iOS installiert.)
4. **Test-Push** Button (nur im Dev-Build sichtbar) ODER per curl:
   ```bash
   # Token aus dem Browser holen: DevTools → Application → Local Storage → bf_token
   curl -X POST https://DEINE-API-URL/push/test -H "Authorization: Bearer DEIN_TOKEN"
   ```
   → eine System-Notification „BreakFit – Push funktioniert…" sollte erscheinen, auch wenn die App im Hintergrund/geschlossen ist.

---

## Schritt 4 — Reminder-Scheduler verifizieren (optional)
Der Scheduler nudged abends (lokal 18–20 Uhr) aktive Nutzer, die heute keine Pause gemacht haben.
Zum schnellen Test das Fenster aufmachen und Intervall verkürzen — in `server/.env`:
```
REMINDER_INTERVAL_MIN=1
REMINDER_WINDOW_START=0
REMINDER_WINDOW_END=23
```
Backend neu starten. Bedingungen für einen Nudge: Push abonniert, `reminders.enabled=true`,
heute (lokale TZ) noch keine `completed`-Pause, aber ≥1 in den letzten 7 Tagen, und noch kein
Nudge heute (`last_nudge_on`). Tipp: in der DB eine ältere completed-History anlegen, heute nichts.

---

## Sicherheit / Hinweise
- `server/.env` (mit dem **privaten** VAPID-Key) ist in `.gitignore` — nicht committen/teilen.
- Push-Payloads enthalten bewusst **keine Emojis** (System-Notification-Regel).
- Tote Subscriptions (404/410) werden serverseitig automatisch entfernt.
- Redis ist optional und im Compose-Setup deaktiviert (`REDIS_URL=""`); Login-Codes liegen in Postgres.
