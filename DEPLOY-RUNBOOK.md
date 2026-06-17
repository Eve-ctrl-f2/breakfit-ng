# BreakFit — Deploy-Runbook (Schritt für Schritt)

Ziel: BreakFit unter einer festen `https://…`-Adresse online, die du Testern schickst
und die sie auf iPhone/Android per „Zum Home-Bildschirm" installieren. Login per
E-Mail-Code, Push + Wochen-Digest aktiv.

Alles läuft auf **einem** kleinen Server (VM) hinter Caddy (automatisches HTTPS).

---

## 0. Was du brauchst (Accounts, Kosten, Aufwand)

| Was | Dienst-Empfehlung | Kosten | Account nötig? |
|-----|-------------------|--------|----------------|
| Server (VM) | **Hetzner Cloud** (Standort Nürnberg/Falkenstein, DE) | ~€4–5/Monat (CX22) | ja |
| Domain | **Namecheap** oder **Cloudflare Registrar** | ~€10/Jahr | ja |
| E-Mail-Versand | **Resend** | kostenlos (3.000 Mails/Monat) | ja |
| VAPID-Keys (Push) | lokal erzeugt mit `npx web-push` | kostenlos | nein |
| Zufalls-Secrets (DB-Passwort etc.) | selbst per `openssl` erzeugt | – | nein |

Alternativen: Server → DigitalOcean/Vultr; Domain → INWX. Ich nehme unten Hetzner +
Namecheap + Resend als konkreten Pfad. Wenn du andere nimmst, sind die Schritte fast
identisch (nur die Web-Oberflächen sehen anders aus).

**Platzhalter-Konvention:** Alles in `<spitzen Klammern>` und `app.example.com` /
`example.com` musst du durch **deine** Werte ersetzen. Literale Werte wie der DB-User
`breakfit` oder die internen Hostnamen `db`/`redis`/`api` bleiben, wie sie sind.

---

## 1. Domain kaufen (Namecheap)

1. Account auf https://www.namecheap.com erstellen.
2. Wunschdomain suchen (z.B. `breakfit-app.com`), in den Warenkorb, kaufen.
3. Fertig — DNS-Einträge machst du in Schritt 4, sobald du die Server-IP hast.

> Du brauchst keine „spezielle" Domain. Irgendeine, die dir gehört. Für die App nutzt du
> dann eine Subdomain wie `app.deinedomain.com`.

---

## 2. Server (VM) anlegen (Hetzner Cloud)

1. Account auf https://console.hetzner.cloud erstellen.
2. **New Project** → reingehen → **Add Server**.
3. Auswählen:
   - Location: **Nürnberg** (oder Falkenstein).
   - Image: **Ubuntu 24.04**.
   - Type: **CX22** (2 vCPU / 4 GB) — reicht für die Testphase locker.
   - SSH-Key: am besten deinen SSH-Key hinterlegen (siehe unten). Sonst bekommst du
     ein Root-Passwort per Mail.
4. **Create & Buy now**. Nach ~30 s hast du eine **IPv4-Adresse** — notier sie als
   `<SERVER_IP>`.

### SSH-Key (empfohlen, einmalig) — auf deinem Windows-PC in PowerShell:
```powershell
ssh-keygen -t ed25519 -C "breakfit"      # Enter, Enter, Enter (kein Passwort nötig)
Get-Content $HOME\.ssh\id_ed25519.pub     # diesen Inhalt bei Hetzner als SSH-Key einfügen
```

### Auf den Server einloggen (PowerShell):
```powershell
ssh root@<SERVER_IP>
```
(Beim ersten Mal „yes" tippen. Ab hier laufen Befehle **auf dem Server**, bis ich
„auf dem Server"/„lokal" wieder unterscheide.)

---

## 3. Firewall (auf dem Server)
```bash
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

---

## 4. DNS: Domain → Server-IP (bei Namecheap)

1. Namecheap → **Domain List** → bei deiner Domain auf **Manage** → **Advanced DNS**.
2. **Add New Record**:
   - Type: **A Record**
   - Host: `app`   (ergibt `app.deinedomain.com`)
   - Value: `<SERVER_IP>`
   - TTL: Automatic
3. Speichern. (DNS-Verbreitung dauert meist Minuten, selten bis zu einer Stunde.)

Test (lokal in PowerShell, nach ein paar Minuten):
```powershell
nslookup app.deinedomain.com      # muss <SERVER_IP> zeigen
```

> Falls du Cloudflare als DNS nutzt: den A-Record auf **DNS only** (graue Wolke)
> stellen, sonst kann Caddy kein TLS-Zertifikat holen.

---

## 5. Docker + Node installieren (auf dem Server)
```bash
# Docker
curl -fsSL https://get.docker.com | sh

# Node 22 via nvm (für den Frontend-Build)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install 22.22.3 && nvm use 22.22.3
node -v        # v22.22.3
```

---

## 6. Code auf den Server bringen

**Variante A (empfohlen): über GitHub.**
Lokal (PowerShell), falls noch kein Remote:
```powershell
# im Projektordner breakfit-ng
git add -A && git commit -m "deploy"     # falls noch nicht committed
# Repo auf github.com anlegen (privat), dann:
git remote add origin https://github.com/<DEIN_USER>/breakfit-ng.git
git push -u origin main
```
Auf dem Server:
```bash
apt-get update && apt-get install -y git
git clone https://github.com/<DEIN_USER>/breakfit-ng.git
cd breakfit-ng
```

**Variante B: direkt hochladen (ohne GitHub).** Lokal in PowerShell:
```powershell
# im übergeordneten Ordner; lädt das Projekt (ohne node_modules) hoch
scp -r .\breakfit-ng root@<SERVER_IP>:/root/breakfit-ng
```
Dann auf dem Server `cd breakfit-ng`.

---

## 7. VAPID-Keys erzeugen (auf dem Server, im Projektordner)
```bash
npx web-push generate-vapid-keys
```
Das gibt dir **Public Key** und **Private Key**. Beide gleich notieren.

Public Key in den Frontend-Build eintragen:
```bash
nano src/environments/environment.production.ts
```
Die Zeile `vapidPublicKey: '...'` ändern → dort **deinen Public Key** einsetzen.
Speichern: `Strg+O`, `Enter`, `Strg+X`.

> Das lokale Testpaar aus der `.env` von früher NICHT für Produktion verwenden —
> nimm das frisch erzeugte.

---

## 8. Resend einrichten (E-Mail-Codes)

1. Account auf https://resend.com erstellen.
2. **API Keys** → **Create API Key** → Wert kopieren = `<RESEND_KEY>` (beginnt mit `re_`).
3. **Domains** → **Add Domain** → deine Domain (z.B. `deinedomain.com`) eintragen.
   Resend zeigt dir DNS-Einträge (TXT/CNAME für SPF + DKIM). Diese bei Namecheap
   unter **Advanced DNS** genauso anlegen → in Resend auf **Verify** klicken
   (dauert ein paar Minuten).
4. Absender wird dann z.B. `login@deinedomain.com`.

> Schnell-Variante zum Ausprobieren ohne Domain-Verifizierung: Resend erlaubt das
> Senden von `onboarding@resend.dev` **nur an deine eigene Anmelde-Mail**. Für echte
> Tester brauchst du die verifizierte Domain (Punkt 3).

---

## 9. Secrets erzeugen + `.env` anlegen (auf dem Server, im Projektordner)

Zwei Zufallswerte erzeugen und notieren:
```bash
openssl rand -base64 24      # = <DB_PASSWORD>
openssl rand -hex 16         # = <METRICS_TOKEN>
```

`.env` anlegen:
```bash
nano .env
```
Inhalt (Platzhalter ersetzen):
```
DOMAIN=app.deinedomain.com
POSTGRES_PASSWORD=<DB_PASSWORD>
VAPID_PUBLIC_KEY=<dein VAPID Public>
VAPID_PRIVATE_KEY=<dein VAPID Private>
VAPID_SUBJECT=mailto:du@deinedomain.com
EMAIL_PROVIDER=resend
RESEND_API_KEY=<RESEND_KEY>
EMAIL_FROM=BreakFit <login@deinedomain.com>
METRICS_TOKEN=<METRICS_TOKEN>
```
Speichern (`Strg+O`, `Enter`, `Strg+X`).

---

## 10. Bauen + starten (auf dem Server, im Projektordner)
```bash
npm ci
npm run build
docker compose -f docker-compose.prod.yml up -d --build
```
Caddy holt beim ersten Aufruf automatisch ein TLS-Zertifikat für deine Domain.

---

## 11. Prüfen
```bash
docker compose -f docker-compose.prod.yml logs api | tail -20
```
Erwartet:
- `migrate: … applied`
- `Web Push enabled (VAPID configured)`
- `digest scheduler started`

Im Browser:
- `https://app.deinedomain.com` öffnet die App.
- `https://app.deinedomain.com/health` gibt einen OK-Status.

Falls die Seite „nicht sicher"/kein Zertifikat zeigt: 1–2 Minuten warten (Caddy holt das
Zertifikat) und prüfen, dass der DNS-A-Record wirklich auf `<SERVER_IP>` zeigt.

---

## 12. App testen + Tester einladen
- **iPhone (iOS 16.4+)**: `https://app.deinedomain.com` in Safari → Teilen →
  „Zum Home-Bildschirm" → aus dem Homescreen starten → einloggen (Code kommt per Mail) →
  Einstellungen → Push aktivieren.
- **Android**: gleiche URL in Chrome → Menü → „App installieren".
- Tester bekommen einfach den Link geschickt. Jeder meldet sich mit seiner E-Mail an
  (passwortlos, Code per Mail).

---

## 13. Updates & Pflege
Neue Version ausrollen (auf dem Server):
```bash
cd breakfit-ng
git pull                          # bzw. neu per scp hochladen
npm ci && npm run build
docker compose -f docker-compose.prod.yml up -d --build
```
Backup der Nutzerdaten (Postgres-Volume) — regelmäßig:
```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U breakfit breakfit > backup_$(date +%F).sql
```

---

## Was war Platzhalter, was nicht?

**Ersetzen (deine Werte):** `app.deinedomain.com`, `deinedomain.com`, `<SERVER_IP>`,
`<DEIN_USER>`, `<RESEND_KEY>`, `<DB_PASSWORD>`, `<METRICS_TOKEN>`, die VAPID-Keys,
`du@deinedomain.com`.

**So lassen:** DB-User `breakfit`, interne Hostnamen `db`/`redis`/`api`, Ports,
die Dateinamen `docker-compose.prod.yml` / `deploy/Caddyfile`, der Pfad
`dist/breakfit/browser`.

**Wo kommt was her:**
- VAPID-Keys → Schritt 7 (`npx web-push generate-vapid-keys`, kein Account).
- `RESEND_API_KEY` → Schritt 8 (Resend-Dashboard).
- `DB_PASSWORD` / `METRICS_TOKEN` → Schritt 9 (`openssl`, selbst erzeugt).
- `SERVER_IP` → Schritt 2 (Hetzner).
- Domain → Schritt 1 (Namecheap).
