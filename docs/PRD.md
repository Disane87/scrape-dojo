# Product Requirements Document (PRD)

## Scrape Dojo - JSON-Powered Web Scraping & Browser Automation Toolkit

| | |
|---|---|
| **Produkt** | Scrape Dojo |
| **Version** | 1.0 |
| **Autor** | Marco Franke |
| **Repository** | [github.com/Disane87/scrape-dojo](https://github.com/Disane87/scrape-dojo) |
| **Lizenz** | MIT |
| **Status** | In aktiver Entwicklung |

---

## 1. Vision & Zielsetzung

### 1.1 Produktvision

Scrape Dojo demokratisiert Web Scraping und Browser-Automatisierung, indem es Nutzern ermoeglicht, komplexe Workflows **deklarativ in JSON** zu definieren - ohne eine einzige Zeile Scraping-Code schreiben zu muessen. Es folgt dem Prinzip **"Infrastructure-as-Code fuer Web Scraping"**.

### 1.2 Problem Statement

Web Scraping erfordert heute typischerweise:

- **Programmierkenntnisse** in Puppeteer, Playwright oder Selenium
- **Individuellen Code** fuer jede Zielwebsite
- **Aufwaendiges Debugging** bei Aenderungen der Zielseiten
- **Fehlende Sicherheit** bei der Verwaltung von Zugangsdaten
- **Keine zentrale Verwaltung** und kein Monitoring laufender Scrapes

### 1.3 Loesung

Scrape Dojo adressiert diese Probleme durch:

- **Deklarative JSON/JSONC-Konfiguration** mit Schema-Validierung und IDE-IntelliSense
- **28+ vorgefertigte Actions** (navigate, click, extract, loop, transform, etc.)
- **Dynamisches Templating** mit Handlebars und Datentransformation mit JSONata
- **Enterprise-grade Security** mit AES-256-verschluesselten Secrets, JWT/OIDC/MFA
- **Modernes Web-Dashboard** fuer Management, Monitoring und Ausfuehrung

### 1.4 Zielgruppen

| Zielgruppe | Beschreibung | Primaerer Nutzen |
|---|---|---|
| **Power User / Nicht-Entwickler** | Technikaffine Nutzer ohne Programmierkenntnisse | JSON-basierte Workflows ohne Code |
| **Entwickler** | Backend/Frontend-Entwickler | Schnelles Prototyping, wiederverwendbare Configs |
| **DevOps / SREs** | Infrastruktur-Teams | Docker-Deployment, Scheduling, API-Integration |
| **Unternehmen** | Teams mit Compliance-Anforderungen | Auth, Verschluesselung, Multi-User, Audit-Logs |

---

## 2. Systemarchitektur

### 2.1 High-Level-Architektur

```
+-----------------------------------------------------+
|                    Docker Compose                     |
|  +----------------+         +---------------------+  |
|  |   Angular UI   |  REST   |    NestJS API        | |
|  |   (Port 8080)  |<------->|    (Port 3030)       | |
|  |                |   SSE   |                      | |
|  |  - Dashboard   |<--------|  - Scrape Engine     | |
|  |  - Editor      |         |  - Puppeteer         | |
|  |  - Log Viewer  |         |  - Auth Module       | |
|  |  - History     |         |  - Secrets Mgmt      | |
|  +----------------+         |  - Scheduler         | |
|                             |  - Event Bus         | |
|                             +----------+-----------+ |
|                                        |             |
|                             +----------+-----------+ |
|                             |     Datenbank         | |
|                             | SQLite / MySQL / PG   | |
|                             +-----------------------+ |
+-----------------------------------------------------+
```

### 2.2 Tech Stack

| Schicht | Technologie | Version |
|---|---|---|
| **Backend** | NestJS | 11.x |
| **Browser Engine** | Puppeteer + Puppeteer-Extra | 23.x |
| **ORM** | TypeORM | 0.3.x |
| **Frontend** | Angular | 21.x |
| **Styling** | Tailwind CSS | 4.x |
| **Code Editor** | Monaco Editor | - |
| **Datenbank** | SQLite (Default), MySQL, PostgreSQL | - |
| **Build System** | Nx Monorepo | 22.x |
| **Package Manager** | pnpm | 8+ |
| **Containerisierung** | Docker & Docker Compose | - |
| **CI/CD** | GitHub Actions + Semantic Release | - |
| **Dokumentation** | Docusaurus | 3.x |

### 2.3 Monorepo-Struktur

```
scrape-dojo/
├── apps/
│   ├── api/          # NestJS Backend (Scrape Engine, Auth, API)
│   ├── ui/           # Angular Frontend (Dashboard, Editor, Monitoring)
│   └── docs/         # Docusaurus Dokumentationsseite
├── libs/
│   └── shared/       # Geteilte TypeScript-Interfaces und DTOs
├── config/
│   ├── scrapes.schema.json   # JSON Schema fuer Scrape-Validierung
│   └── sites/                # Scrape-Konfigurationsdateien (.jsonc)
├── test/             # E2E-Tests
└── scripts/          # Build- und Generierungsskripte
```

---

## 3. Funktionale Anforderungen

### 3.1 Scrape Engine (Kern)

#### FR-3.1.1: Deklarative Workflow-Definition

- Workflows werden als JSON/JSONC-Dateien unter `config/sites/` definiert
- Jede Datei enthaelt eine Liste von Scrapes mit Steps und Actions
- Validierung ueber JSON Schema mit IDE-IntelliSense-Unterstuetzung
- Hierarchie: **Scrape > Steps > Actions**

#### FR-3.1.2: Action-System

28+ vorgefertigte Actions in folgenden Kategorien:

| Kategorie | Actions | Beschreibung |
|---|---|---|
| **Navigation** | `navigate`, `click`, `type`, `keyboardPress` | Browser-Interaktionen |
| **Datenextraktion** | `extract`, `extractAll`, `get`, `getAll`, `screenshot` | DOM-Daten lesen |
| **Kontrollfluss** | `loop`, `skipIf`, `break`, `delay`, `wait`, `waitForSelector`, `waitForOtp` | Ablaufsteuerung |
| **Datentransformation** | `transform`, `storeData` | JSONata-Verarbeitung, persistenter Key-Value-Store |
| **Utilities** | `logger`, `download`, `display`, `fileExists`, `notify` | Hilfsaktionen |

#### FR-3.1.3: Datenfluss-System

- **`previousData`**: Ergebnis jeder Action wird unter `previousData.<actionName>` gespeichert
- **`currentData`**: In Schleifen verfuegbar als `currentData.<loopName>.value` und `.index`
- **Handlebars-Templating**: `{{variables.x}}`, `{{secrets.x}}`, `{{previousData.x}}`
- **JSONata-Transformationen**: Komplexe Datenverarbeitung (Filter, Map, Aggregate)

#### FR-3.1.4: Schleifen und Bedingungen

- **Verschachtelte Schleifen** mit `loop`-Action und `items`-Parameter
- **Bedingte Ausfuehrung** mit `skipIf`-Action
- **Loop-Break** mit konfigurierbarem `breakLevels`-Parameter
- **Fehlerbehandlung** und Retry-Logik

#### FR-3.1.5: Persistenter Datenspeicher

- `storeData`-Action fuer Key-Value-Speicherung ueber Runs hinweg
- Nutzbar fuer Zustandsverfolgung (z.B. letzte verarbeitete Bestellung)
- Unterscheidung: Job-Level (persistent) vs. Run-Level (temporaer)

### 3.2 Web-Dashboard (UI)

#### FR-3.2.1: Scrape-Management

- Uebersicht aller konfigurierten Scrapes mit Status
- Detailansicht mit JSON-Editor (Monaco) und Schema-Validierung
- Reload-Funktion zum Neuladen von Konfigurationen
- Variablen-Manager pro Workflow

#### FR-3.2.2: Ausfuehrung und Monitoring

- **Run-Dialog**: Manuelle Ausfuehrung mit Runtime-Variablen
- **Echtzeit-Monitoring**: WebSocket/SSE-basierte Events
- **Log-Viewer**: Live-Logs mit Level-Filterung (log, error, warn, debug)
- **OTP-Modal**: Interaktive TOTP-Eingabe waehrend der Ausfuehrung (fuer MFA-geschuetzte Seiten)

#### FR-3.2.3: Historie und Artefakte

- **Workflow-History**: Tabellarische Darstellung vergangener Runs (Status, Dauer, Trigger)
- **Artifact-Viewer**: Intelligente Anzeige von Ergebnissen:
  - JSON-Daten mit Syntax-Highlighting
  - Tabellarische Darstellung
  - Bild-/PDF-Vorschau
  - Download-Links

#### FR-3.2.4: Scheduling

- **Cron-basierte Planung** mit visuellen Cron-Builder
- **Timezone-Unterstuetzung**
- **Manuelle und automatische Trigger**
- **Naechste Ausfuehrung** wird angezeigt

### 3.3 Authentifizierung und Autorisierung

#### FR-3.3.1: JWT-basierte Authentifizierung

- Access/Refresh-Token-System
- Initiales Admin-Setup beim ersten Start
- Session-Management mit Logout

#### FR-3.3.2: OIDC/SSO-Integration

- Unterstuetzung fuer Keycloak, Auth0, Google, Azure AD
- Konfigurierbar ueber Environment-Variablen
- Automatische Benutzeranlage bei Erstanmeldung

#### FR-3.3.3: Multi-Faktor-Authentifizierung (MFA)

- TOTP-basierte Zwei-Faktor-Authentifizierung
- **Trusted Devices**: Bekannte Geraete koennen MFA-Prompts reduzieren
- Aktivierung/Deaktivierung pro Benutzer

#### FR-3.3.4: API-Key-Authentifizierung

- Fuer Headless-/CI/CD-Szenarien
- Header-basiert: `X-API-Key: <key>`
- Konfigurierbare Ablaufzeiten

### 3.4 Secrets Management

#### FR-3.4.1: Verschluesselte Speicherung

- **AES-256-Verschluesselung** (iv:authTag:data-Format)
- Secrets werden niemals im Klartext gespeichert
- Zugriff in Scrapes ueber `{{secrets.name}}`

#### FR-3.4.2: Variablen-Hierarchie

Aufloesung nach Prioritaet (hoechste zuerst):

1. Runtime-Parameter (bei Ausfuehrung uebergeben)
2. Workflow-Variablen (`metadata.variables`)
3. Globale Variablen (`SCRAPE_DOJO_VAR_*`)
4. Secrets (`SCRAPE_DOJO_SECRET_*`)

### 3.5 API

#### FR-3.5.1: REST-API-Endpunkte

| Bereich | Endpunkte | Beschreibung |
|---|---|---|
| **Scrapes** | `GET/POST /scrapes`, `POST /run/:id` | CRUD und Ausfuehrung |
| **Runs** | `GET /runs/:scrapeId`, `DELETE /runs/:id` | Historie und Verwaltung |
| **Schedules** | `GET/PUT /schedules/:id` | Zeitplanung |
| **Secrets** | `GET/POST/PUT/DELETE /secrets` | Geheimnisverwaltung |
| **Variables** | `GET/POST/PUT/DELETE /variables` | Variablenverwaltung |
| **Auth** | `POST /auth/login`, `/auth/setup`, `/auth/mfa/*` | Authentifizierung |
| **Events** | `SSE /events/:scrapeId` | Echtzeit-Events |
| **Health** | `GET /health`, `/health/live`, `/health/ready` | Kubernetes-Probes |
| **Files** | `GET /files/list`, `GET /files/:name` | Dateiverwaltung |

#### FR-3.5.2: API-Dokumentation

- OpenAPI/Swagger unter `/api`
- Interaktive API-Tests
- Request/Response-Schemas

---

## 4. Nicht-funktionale Anforderungen

### 4.1 Performance

| Anforderung | Zielwert |
|---|---|
| API-Antwortzeit (einfache Endpunkte) | < 200ms |
| UI Initial Load | < 3s |
| Gleichzeitige Scrape-Ausfuehrungen | Mindestens 5 parallel |
| WebSocket/SSE-Latenz | < 500ms |

### 4.2 Sicherheit

| Anforderung | Implementierung |
|---|---|
| **Verschluesselung at Rest** | AES-256 fuer Secrets |
| **Authentifizierung** | JWT + OIDC + MFA (optional) |
| **Rate Limiting** | 30 Requests/60s auf Auth-Endpunkte |
| **Security Headers** | Helmet-Middleware |
| **CORS** | Konfigurierbare Origins |
| **Input Validation** | class-validator + JSON Schema |

### 4.3 Zuverlaessigkeit

| Anforderung | Beschreibung |
|---|---|
| **Datenbankmigrationen** | TypeORM synchronize (Dev) / Migrations (Prod) |
| **Health Checks** | Liveness + Readiness Probes fuer Kubernetes |
| **Error Handling** | Strukturierte Fehlerbehandlung mit Logging |
| **Run-Status-Tracking** | Jeder Run hat Status: running, completed, error, aborted |

### 4.4 Skalierbarkeit

| Anforderung | Beschreibung |
|---|---|
| **Datenbank** | SQLite (Einzelinstanz) bis PostgreSQL/MySQL (Produktion) |
| **Containerisierung** | Docker-basiert, Horizontal skalierbar via Container-Orchestrierung |
| **Monorepo** | Nx-basierte Build-Optimierung mit Caching |

### 4.5 Wartbarkeit und Developer Experience

| Anforderung | Beschreibung |
|---|---|
| **TypeScript** | Durchgaengige Typsicherheit |
| **Shared Library** | Geteilte Interfaces zwischen Frontend und Backend |
| **Linting/Formatting** | ESLint + Prettier |
| **Testing** | Jest (API), Vitest (UI + E2E) |
| **CI/CD** | GitHub Actions mit automatischem Semantic Release |
| **Dokumentation** | Docusaurus-basiert mit i18n (DE/EN) |

### 4.6 Internationalisierung (i18n)

- Frontend unterstuetzt **Deutsch** und **Englisch**
- Transloco als i18n-Framework
- Uebersetzungsdateien unter `apps/ui/src/assets/i18n/`

---

## 5. Datenmodell

### 5.1 Kern-Entitaeten

```
┌──────────────┐     1:N     ┌──────────────┐     1:N     ┌──────────────┐
│    Scrape     │────────────>│     Run      │────────────>│   RunStep    │
│  (Config)     │             │              │             │              │
│ - id          │             │ - id         │             │ - stepIndex  │
│ - metadata    │             │ - status     │     1:N     │ - status     │
│ - steps[]     │             │ - trigger    │────────────>│              │
└──────────────┘             │ - startTime  │             └──────┬───────┘
                              │ - endTime    │                    │ 1:N
                              └──────┬───────┘                    v
                                     │ 1:N               ┌──────────────┐
                                     v                    │  RunAction   │
                              ┌──────────────┐           │              │
                              │   RunLog      │           │ - actionName │
                              │              │            │ - status     │
                              │ - level      │            │ - result     │
                              │ - message    │            └──────────────┘
                              │ - timestamp  │
                              └──────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ SecretEntity  │    │ VariableEntity│    │  ScrapeData  │
│              │    │              │    │              │
│ - name       │    │ - name       │    │ - scrapeId   │
│ - encrypted  │    │ - value      │    │ - key        │
│   Value      │    │ - type       │    │ - value      │
└──────────────┘    └──────────────┘    └──────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  UserEntity   │    │TrustedDevice │    │  ApiKey      │
│              │    │              │    │              │
│ - email      │    │ - userId     │    │ - userId     │
│ - password   │    │ - deviceId   │    │ - keyHash    │
│   Hash       │    │ - lastUsed   │    │ - expiresAt  │
│ - mfaSecret  │    └──────────────┘    └──────────────┘
└──────────────┘

┌──────────────┐
│ScrapeSchedule│
│              │
│ - scrapeId   │
│ - cron       │
│   Expression │
│ - timezone   │
│ - nextRun    │
└──────────────┘
```

### 5.2 Unterstuetzte Datenbanken

| Datenbank | Einsatz | Hinweis |
|---|---|---|
| **SQLite** (sql.js) | Entwicklung, Einzelinstanz | Standard, kein Server noetig |
| **PostgreSQL** | Produktion | Empfohlen fuer Mehrbenutzerbetrieb |
| **MySQL** | Produktion | Alternative zu PostgreSQL |

---

## 6. Deployment und Infrastruktur

### 6.1 Docker Compose (Standard-Deployment)

```yaml
Services:
  - api:    NestJS Backend (Port 3030)
  - ui:     Angular Frontend (Port 8080)

Volumes:
  - ./data          # Datenbank
  - ./downloads     # Heruntergeladene Dateien
  - ./logs          # Anwendungslogs
  - ./browser-data  # Puppeteer-Browser-Cache
  - ./config        # Scrape-Konfigurationen
```

### 6.2 Umgebungsvariablen

| Kategorie | Variablen | Beispiel |
|---|---|---|
| **Pflicht** | `SCRAPE_DOJO_ENCRYPTION_KEY` | 64 Hex-Zeichen |
| **Server** | `SCRAPE_DOJO_PORT`, `NODE_ENV` | 3000, production |
| **Datenbank** | `DB_TYPE`, `DB_HOST`, `DB_PORT`, etc. | postgres, localhost, 5432 |
| **Auth** | `SCRAPE_DOJO_AUTH_ENABLED`, `JWT_SECRET` | true, random-secret |
| **OIDC** | `SCRAPE_DOJO_AUTH_OIDC_*` | Keycloak/Auth0-Config |
| **Variablen** | `SCRAPE_DOJO_VAR_*` | Globale Werte |
| **Secrets** | `SCRAPE_DOJO_SECRET_*` | Verschluesselte Werte |

### 6.3 CI/CD Pipeline

| Workflow | Trigger | Aktion |
|---|---|---|
| `docker.yml` | Push/PR | Docker-Image bauen und testen |
| `release.yml` | Merge auf main | Semantic Release + npm Publish |
| `docs-deploy.yml` | Aenderungen in docs/ | Dokumentationsseite deployen |

---

## 7. Scrape-Konfigurationsformat

### 7.1 Schema-Ueberblick

```jsonc
{
  "$schema": "../scrapes.schema.json",
  "scrapes": [
    {
      "id": "unique-scrape-id",
      "metadata": {
        "description": "Beschreibung",
        "version": "1.0.0",
        "variables": [
          {
            "name": "year",
            "type": "number",
            "default": 2025
          }
        ]
      },
      "steps": [
        {
          "name": "Step Name",
          "actions": [
            {
              "name": "ActionName",
              "action": "navigate|click|extract|loop|...",
              "params": { /* action-spezifische Parameter */ }
            }
          ]
        }
      ]
    }
  ]
}
```

### 7.2 Templating-System

| Syntax | Beschreibung | Beispiel |
|---|---|---|
| `{{previousData.x}}` | Ergebnis vorheriger Action | `{{previousData.pageTitle}}` |
| `{{currentData.x.value}}` | Aktuelles Loop-Element | `{{currentData.orders.value.id}}` |
| `{{currentData.x.index}}` | Aktueller Loop-Index | `{{currentData.orders.index}}` |
| `{{variables.x}}` | Workflow-Variable | `{{variables.year}}` |
| `{{secrets.x}}` | Verschluesseltes Secret | `{{secrets.password}}` |
| `{{add a b}}` | Handlebars-Helper | `{{add 1 2}}` => 3 |

### 7.3 Reales Beispiel: Amazon Order Scraper

Der inkludierte `amazon.jsonc` demonstriert fortgeschrittene Faehigkeiten:

- Login-Automatisierung mit optionalem OTP
- Verschachtelte Schleifen (Jahre > Seiten > Bestellungen > Rechnungen)
- Dynamische Filterung mit JSONata
- Persistente Zustandsverfolgung (`storeData`)
- Bedingte Ausfuehrung (`skipIf`)
- Dateidownloads mit organisierten Pfaden
- Komplexes Templating (Datumsberechnung, Zaehler, Bedingungen)

---

## 8. Qualitaetssicherung

### 8.1 Test-Strategie

| Ebene | Framework | Abdeckung |
|---|---|---|
| **Unit Tests (API)** | Jest | Services, Actions, Guards |
| **Unit Tests (UI)** | Vitest | Components, Services, Pipes |
| **E2E Tests** | Vitest + Supertest | API-Endpunkte, CRUD-Operationen |
| **Schema-Validierung** | JSON Schema | Scrape-Konfigurationen |

### 8.2 Test-Befehle

```bash
pnpm test           # Alle Unit-Tests
pnpm test:api       # Nur API-Tests
pnpm test:ui        # Nur UI-Tests
pnpm test:e2e       # End-to-End-Tests
pnpm test:coverage  # Mit Coverage-Report
```

### 8.3 Code-Qualitaet

- **ESLint**: Statische Codeanalyse
- **Prettier**: Einheitliche Formatierung
- **TypeScript**: Durchgaengige Typsicherheit
- **Conventional Commits**: Standardisierte Commit-Messages
- **Semantic Release**: Automatische Versionierung

---

## 9. Risiken und Mitigationen

| Risiko | Auswirkung | Mitigation |
|---|---|---|
| Websites aendern DOM-Struktur | Scrapes brechen | JSON-Configs ermoeglichen schnelle Anpassung ohne Code-Aenderungen |
| Rate-Limiting durch Zielwebsites | Blockierte Requests | `delay`- und `wait`-Actions, konfigurierbare Timeouts |
| Browser-Speicherverbrauch | Hoher RAM bei parallelen Scrapes | Puppeteer-Pool-Management, Docker-Ressourcenlimits |
| Verlust des Encryption Keys | Secrets nicht wiederherstellbar | Dokumentierte Backup-Strategie, Warnung in Setup-Prozess |
| Rechtliche Risiken | ToS-Verstoss | Deutlicher Hinweis in Dokumentation, verantwortungsvolle Nutzung |

---

## 10. Zukuenftige Erweiterungen (Roadmap-Ideen)

Die folgenden Punkte sind potenzielle Erweiterungen, die auf Basis von Community-Feedback priorisiert werden koennen:

| Bereich | Feature | Beschreibung |
|---|---|---|
| **Actions** | Plugin-System | Eigene Actions als npm-Packages registrieren |
| **Actions** | `scroll`-Action | Automatisches Scrollen fuer Infinite-Scroll-Seiten |
| **UI** | Visual Workflow Builder | Drag-and-Drop-Editor fuer Scrape-Workflows |
| **UI** | Dark Mode | Durchgaengiges Dark-Theme |
| **Engine** | Proxy-Unterstuetzung | Rotierende Proxys fuer Anti-Detection |
| **Engine** | Playwright-Backend | Alternative zu Puppeteer fuer Cross-Browser-Support |
| **Integration** | Webhook-Notifications | POST an externe URLs bei Scrape-Abschluss |
| **Integration** | Export-Formate | CSV, Excel, Google Sheets als Exportziele |
| **Monitoring** | Alerting | E-Mail/Slack-Benachrichtigungen bei Fehlern |
| **Skalierung** | Worker-Architektur | Verteilte Ausfuehrung ueber mehrere Nodes |

---

## 11. Glossar

| Begriff | Beschreibung |
|---|---|
| **Scrape** | Ein kompletter Workflow, bestehend aus Steps und Actions |
| **Step** | Eine logische Gruppierung von Actions innerhalb eines Scrapes |
| **Action** | Eine einzelne ausfuehrbare Operation (z.B. navigate, click, extract) |
| **Run** | Eine einzelne Ausfuehrung eines Scrapes |
| **previousData** | Gespeicherte Ergebnisse vorheriger Actions im aktuellen Run |
| **currentData** | Kontextdaten innerhalb einer Schleife (aktuelles Element + Index) |
| **JSONata** | Abfrage- und Transformationssprache fuer JSON-Daten |
| **Handlebars** | Template-Engine fuer dynamische Werteinjektion |
| **JSONC** | JSON mit Kommentaren (JSON with Comments) |
| **SSE** | Server-Sent Events fuer Echtzeit-Kommunikation |

---

## 12. Referenzen

- [NestJS Dokumentation](https://docs.nestjs.com/)
- [Puppeteer Dokumentation](https://pptr.dev/)
- [Angular Dokumentation](https://angular.dev/)
- [JSONata Dokumentation](https://jsonata.org/)
- [Handlebars Dokumentation](https://handlebarsjs.com/)
- [TypeORM Dokumentation](https://typeorm.io/)
- [Nx Dokumentation](https://nx.dev/)
- [JSON Schema](https://json-schema.org/)
