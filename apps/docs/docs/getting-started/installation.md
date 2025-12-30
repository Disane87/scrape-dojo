---
sidebar_position: 1
---

# Installation - Los geht's! 🚀

Scrape Dojo läuft super einfach auf deinem System - egal ob du Docker oder eine lokale Installation bevorzugst! Wir machen's dir so leicht wie möglich! 😊

## 🐳 Docker Installation (Empfohlen für die meisten!)

**Warum Docker?** Weil es einfach funktioniert! Keine Node.js-Version-Probleme, keine Dependencies-Konflikte, keine Überraschungen. Ein Befehl und du bist startklar! 🎯

### Was du brauchst

- ✅ Docker & Docker Compose installiert
- ✅ **That's it!** Keine weiteren Dependencies! 🎉

:::tip Noch kein Docker?
Hol's dir von [docker.com](https://www.docker.com/get-started) - dauert 5 Minuten und ist super nützlich für viele Projekte!
:::

### Let's do this! ⚡

#### Schritt 1: Projekt holen

```bash
# Klone das Repo
git clone https://github.com/disane87/scrape-dojo.git
cd scrape-dojo
```

Oder lade es als [ZIP herunter](https://github.com/disane87/scrape-dojo/archive/refs/heads/main.zip) und entpacke es!

#### Schritt 2: Environment Setup (wichtig! 🔐)

Erstelle eine `.env` Datei aus der Vorlage:

```bash
cp .env.example .env
```

**Jetzt kommt der wichtige Teil:** Du brauchst einen **Encryption Key** für Secrets!

Generiere einen sicheren Key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Das spuckt sowas aus:
```
a3f5b9c2e7d1a8f4b6c9e2d5a7f3b1c8e4d7a2f6b9c3e5d8a1f4b7c2e6d9a3f5
```

Öffne deine `.env` und trage ihn ein:

```env
# .env
SCRAPE_DOJO_ENCRYPTION_KEY=a3f5b9c2e7d1a8f4b6c9e2d5a7f3b1c8e4d7a2f6b9c3e5d8a1f4b7c2e6d9a3f5
```

:::danger 🔥 MEGA WICHTIG!
Der `SCRAPE_DOJO_ENCRYPTION_KEY` verschlüsselt **alle Secrets** in deiner Datenbank (Passwörter, API-Keys, etc.)!

- ✅ **Sichere ihn gut!** (Password-Manager, .env-Backup)
- ❌ **Ändere ihn nie!** Sonst sind alle bestehenden Secrets unbrauchbar!
- ❌ **Committe ihn nie!** (.env steht in .gitignore - gut so!)

Verlierst du den Key = Verlierst du alle Secrets! 🔒
:::

#### Schritt 3: Start the engines! 🏎️

```bash
docker-compose up -d
```

**Was passiert jetzt?**
- 📦 Docker lädt die Images (beim ersten Mal etwas länger)
- 🔨 Baut die Container (API + UI)
- 🗄️ Erstellt die Datenbank
- 🚀 Startet alles im Hintergrund (`-d` = detached)

Schau zu, was passiert:

```bash
docker-compose logs -f
```

Press `Ctrl+C` zum Beenden der Log-Ansicht (Container laufen weiter!).

#### Schritt 4: Check it out! 🎨

Öffne deinen Browser:

- 🎨 **UI**: http://localhost:8080 - Die Haupt-Anwendung
- 🚀 **API**: http://localhost:3030 - Backend-API (falls du direkt zugreifen willst)
- 📚 **API Docs**: http://localhost:3030/api - Swagger/OpenAPI Dokumentation

**Siehst du die UI?** 🎉 **Perfekt!** Du bist fertig!

:::tip Ports schon belegt?
Laufen bei dir bereits Dienste auf Port 8080 oder 3030? Kein Problem!

Ändere in `docker-compose.yml`:
```yaml
ports:
  - "8081:80"  # Statt 8080 → UI auf Port 8081
  - "3031:3000"  # Statt 3030 → API auf Port 3031
```
:::

### Wo landen meine Daten? 📁

Docker Compose erstellt automatisch diese Ordner und mountet sie:

| Verzeichnis | Was ist da drin? |
|-------------|------------------|
| `./data` | 🗄️ **SQLite-Datenbank** - alle Runs, Logs, Secrets |
| `./downloads` | 📥 **Downloads** - PDFs, Bilder, alles was du scrapest |
| `./logs` | 📝 **Anwendungs-Logs** - für Debugging |
| `./browser-data` | 🌐 **Browser-Profil** - Cookies, Cache, Session |
| `./config` | ⚙️ **Scrape-Definitionen** - deine JSON-Workflows |

:::info Tipp
💾 **Backups:** Sichere einfach diese Ordner! Alles Wichtige ist da drin.
:::

### Useful Docker Commands 🛠️

```bash
# Status checken
docker-compose ps

# Logs anschauen
docker-compose logs -f

# Stoppen
docker-compose stop

# Starten
docker-compose start

# Komplett runterfahren & aufräumen
docker-compose down

# Neu bauen (z.B. nach Git Pull)
docker-compose up -d --build

# Alles inkl. Volumes löschen (ACHTUNG: Datenverlust!)
docker-compose down -v
```

---

## 💻 Lokale Installation (für Entwickler & Tüftler)

Du willst **unter die Haube schauen**, den Code ändern oder beitragen? Perfekt! Die lokale Installation gibt dir **volle Kontrolle**! 🎯

### Was du brauchst

- ✅ **Node.js** 18 oder höher ([nodejs.org](https://nodejs.org))
- ✅ **pnpm** 8+ ([pnpm.io](https://pnpm.io))

:::info Warum pnpm?
pnpm ist **schneller** und **effizienter** als npm! Installier es mit:
```bash
npm install -g pnpm
```
:::

### Los geht's! ⚡

#### Schritt 1: Dependencies installieren

```bash
# Im Projekt-Root
pnpm install
```

**Das dauert beim ersten Mal ein bisschen!** ☕

Warum? Puppeteer lädt **Chromium-Browser-Binaries** herunter (~300MB). Perfekt für automatisierte Tests und Web-Scraping - aber braucht halt etwas! 🌐

#### Schritt 2: Environment konfigurieren

```bash
cp .env.example .env
```

Generiere einen Encryption Key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Trage ihn in `.env` ein:

```env
SCRAPE_DOJO_ENCRYPTION_KEY=<dein-generierter-key>

# Dev-Ports (Standard)
UI_PORT=3000
API_PORT=3333
```

:::tip Dev vs. Production
Lokale Entwicklung nutzt **andere Ports** als Docker:
- UI: `3000` (statt `8080`)
- API: `3333` (statt `3030`)

So können beide parallel laufen! 🔄
:::

#### Schritt 3: Dev-Server starten

```bash
pnpm start
```

**Was passiert?**
- 🎨 **UI** startet auf http://localhost:3000
- 🚀 **API** startet auf http://localhost:3333
- ♨️ **Hot Reload** ist aktiviert - Änderungen werden live geladen!

Du kannst auch einzeln starten:

```bash
# Nur API
pnpm start:api

# Nur UI
pnpm start:ui

# Nur Docs (diese hier!)
pnpm start:docs
```

:::tip VS Code Users
💡 Nutze die **vordefinierten Tasks**!

`Ctrl/Cmd + Shift + P` → `Tasks: Run Task` → `Start All Dev Servers`

Oder nutze das Task-Panel! Alles schon konfiguriert! 🎯
:::

### Development-Workflow 🔧

**Projekt-Struktur:**
```
scrape-dojo/
├── apps/
│   ├── api/          # 🚀 NestJS Backend
│   ├── ui/           # 🎨 Angular Frontend
│   └── docs/         # 📚 Diese Dokumentation
├── libs/
│   └── shared/       # 📦 Gemeinsam genutzte Types & Utils
├── config/
│   └── sites/        # ⚙️ Deine Scrape-Definitionen
└── .env              # 🔐 Environment-Variablen
```

**Typische Dev-Tasks:**

```bash
# Alle Tests laufen lassen
pnpm test

# Linting
pnpm lint

# Build (Production)
pnpm build

# E2E Tests
pnpm test:e2e
```

Mehr Details im [Developer Guide](../developer/project-structure)!

---

## 🚀 Production Deployment

Du willst Scrape Dojo **produktiv** einsetzen? Hier sind die wichtigsten Hinweise!

### Docker Production Mode

```bash
# Production-optimierte Images nutzen
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Wichtige Production-Settings 🔐

```env
# .env (Production)
NODE_ENV=production

# Security
SCRAPE_DOJO_ENCRYPTION_KEY=<super-sicherer-key>
SCRAPE_DOJO_AUTH_ENABLED=true
SCRAPE_DOJO_AUTH_JWT_SECRET=<sehr-langes-zufälliges-secret>

# Datenbank (PostgreSQL empfohlen!)
DB_TYPE=postgres
DB_HOST=your-db-host.example.com
DB_PORT=5432
DB_USERNAME=scrape_dojo
DB_PASSWORD=<super-sicheres-passwort>
DB_DATABASE=scrape_dojo

# SSL/TLS
SCRAPE_DOJO_TRUST_PROXY=1

# CORS (nur deine Domain!)
SCRAPE_DOJO_CORS_ORIGIN=https://scrape-dojo.your-domain.com
```

:::warning Production Checklist
Bevor du live gehst:

- ✅ **Auth aktiviert?** (`SCRAPE_DOJO_AUTH_ENABLED=true`)
- ✅ **PostgreSQL statt SQLite?** (besser für Production!)
- ✅ **CORS richtig konfiguriert?** (nicht `*` in Production!)
- ✅ **HTTPS?** (Reverse Proxy wie nginx/Traefik)
- ✅ **Backups eingerichtet?** (Datenbank + `./data` Ordner)
- ✅ **Secrets gesichert?** (Encryption Key backuppen!)
- ✅ **Monitoring?** (Logs, Uptime-Checks)
:::

Alle Environment-Variablen findest du unter [Environment Variables](../advanced/environment-variables)!

---

## 🎓 Nächste Schritte

**Installation fertig?** 🎉 Awesome! Jetzt geht's los!

1. 🎯 **[Quickstart - Erste Scrape in 5 Minuten!](./quickstart)** - Sofort loslegen!
2. 📚 **[Deine erste Scrape verstehen](./first-scrape)** - Lerne die Konzepte
3. 🏗️ **[Architektur](./architecture)** - Wie alles zusammenspielt
4. 🔐 **[Authentication Setup](../advanced/authentication)** - Sichere deine Installation

**Brauchst du Hilfe?** Schau in [Troubleshooting](../troubleshooting) oder [öffne ein Issue](https://github.com/disane87/scrape-dojo/issues)! 💪

---

**Happy Scraping!** 🥋✨
