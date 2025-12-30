<div align="center">

<img src="./apps/ui/public/logos/scrape-dojo-readme-logo.png" width="180" alt="Scrape Dojo Logo" />

# Scrape Dojo

_A web scraping & browser automation toolkit driven by JSON configs._

**Define scrapes with JSON/JSONC · Use templates · Run and monitor in a UI**

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)](https://pptr.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Nx](https://img.shields.io/badge/Nx-143055?style=for-the-badge&logo=nx&logoColor=white)](https://nx.dev/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
![GitHub Stars](https://img.shields.io/github/stars/Disane87/scrape-dojo?style=for-the-badge&logo=github)
![GitHub Issues](https://img.shields.io/github/issues/Disane87/scrape-dojo?style=for-the-badge&logo=github)

[Features](#features) · [Quick start](#quick-start) · [Configuration](#configuration) · [Scrape configs](#scrape-configs) · [API](#api) · [Development](#development) · [Contributing](#contributing)

</div>

---

## Features

- JSON/JSONC driven scraping workflows (validated via JSON Schema)
- Template engine (Handlebars) for dynamic parameters (`{{variables.*}}`, `{{secrets.*}}`)
- Data extraction + transformation (JSONata)
- Control-flow building blocks (loops, conditions)
- UI for running scrapes, inspecting logs, runs, and data
- Secret management with encryption-at-rest (requires an encryption key)
- Nx monorepo with separate API / UI / Docs apps

---

## Quick start

### Prerequisites

- Node.js 18+
- pnpm 8+

### 1) Install

```bash
pnpm install
```

### 2) Configure environment

Copy the template and set at least the encryption key:

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the generated value into `SCRAPE_DOJO_ENCRYPTION_KEY` in `.env`.

> [!WARNING]
> `SCRAPE_DOJO_ENCRYPTION_KEY` is required. It is used to encrypt secrets stored in the database.

### 3) Start dev servers

```bash
pnpm start
```

By default:

- UI: http://localhost:3000
- API (direct): http://localhost:3333
- Docs (optional): http://localhost:3001 (run with `pnpm nx serve docs`)

> [!NOTE]
> The first run can take a moment while Puppeteer downloads browser binaries.

---

## Configuration

The authoritative list of supported environment variables lives in `.env.example`.

### Required

- `SCRAPE_DOJO_ENCRYPTION_KEY` — 64 hex chars (256-bit). Used for encrypting secrets in the DB.

### Common (high-level)

- Runtime/server: `NODE_ENV`, `SCRAPE_DOJO_PORT`, `SCRAPE_DOJO_TRUST_PROXY`, `SCRAPE_DOJO_CORS_ORIGIN`
- Database: `DB_TYPE`, `DB_DATABASE` (sqlite), or `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`
- Optional auth: `SCRAPE_DOJO_AUTH_ENABLED`, `SCRAPE_DOJO_AUTH_JWT_SECRET`, `SCRAPE_DOJO_AUTH_API_KEY`, …

### Variables & secrets

Scrape Dojo supports a layered variable system:

- Global variables (unencrypted): `SCRAPE_DOJO_VAR_*`
- Secrets (encrypted): `SCRAPE_DOJO_SECRET_*`
- Workflow variables (defined per scrape in `metadata.variables`)

Resolution order (highest priority first):

1. Runtime parameters
2. Workflow variables (`metadata.variables`)
3. Global variables (`SCRAPE_DOJO_VAR_*`)
4. Secrets (`SCRAPE_DOJO_SECRET_*`)

Example `.env`:

```bash
SCRAPE_DOJO_VAR_DEFAULT_YEAR=2025

SCRAPE_DOJO_SECRET_EMAIL=user@example.com
SCRAPE_DOJO_SECRET_PASSWORD=super-secret
```

Usage inside a config:

```jsonc
{
  "action": "type",
  "params": {
    "selector": "#email",
    "text": "{{secrets.email}}"
  }
}
```

---

## Scrape configs

Scrapes are defined under `config/`.

```
config/
  scrapes.schema.json
  sites/
    amazon.jsonc
    example.jsonc
```

### Minimal structure

Scrape configs are JSON/JSONC and can reference the schema.

```jsonc
{
  "$schema": "../scrapes.schema.json",
  "scrapes": [
    {
      "id": "my-scrape",
      "metadata": {
        "description": "Example scrape",
        "version": "1.0.0"
      },
      "steps": [
        {
          "name": "Login",
          "actions": [
            {
              "name": "Navigate",
              "action": "navigate",
              "params": { "url": "https://example.com/login" }
            }
          ]
        }
      ]
    }
  ]
}
```

### Action result composition

Every action stores its result under `previousData.<actionName>` and can be referenced by later actions.

```jsonc
{
  "name": "pageTitle",
  "action": "extract",
  "params": { "selector": "h1" }
}
```

```jsonc
{
  "action": "logger",
  "params": {
    "message": "Title: {{previousData.pageTitle}}"
  }
}
```

### Loops

The `loop` action iterates `items` and exposes `currentData.<loopName>.value` and `currentData.<loopName>.index`.

```jsonc
{
  "name": "processOrders",
  "action": "loop",
  "params": {
    "items": "{{previousData.orders}}"
  },
  "actions": [
    {
      "name": "downloadPdf",
      "action": "download",
      "params": {
        "url": "https://example.com/order/{{currentData.processOrders.value.id}}.pdf",
        "filename": "order-{{currentData.processOrders.index}}.pdf"
      }
    }
  ]
}
```

### Handlebars templating

Built-ins:

```handlebars
{{previousData.x}}
{{currentData.x}}
{{variables.x}}
{{secrets.x}}
```

Helpers (examples):

```handlebars
{{add 1 2}}
{{subtract 2025 1}}
{{multiply 10 2}}
{{not true}}
```

### JSONata transformations

```jsonc
{
  "name": "cleanOrders",
  "action": "transform",
  "params": {
    "data": "{{previousData.rawOrders}}",
    "expression": "$map($, function($v) { {'id': $v.orderId, 'total': $number($v.price)} })"
  }
}
```

---

## Project layout

```
apps/
  api/   (NestJS)
  ui/    (Angular)
  docs/  (Docusaurus)
config/
  sites/
  scrapes.schema.json
downloads/
data/
logs/
browser-data/
```

---

## API

> [!NOTE]
> In dev, the UI runs on port 3000 and can proxy API calls. The API also runs directly (default 3333).

Key endpoints (see `apps/api/openapi.json` for the full list):

| Endpoint | Method | Purpose |
|---|---:|---|
| `/scrapes` | GET | List available scrapes (for the UI) |
| `/scrapes/{id}` | GET | Get a scrape by id |
| `/run/{scrapeId}` | POST | Run a scrape |
| `/events` | GET | Server-sent events stream |
| `/logs` | GET | Logs |
| `/scrape/{scrapeId}` | GET | Start scraping (engine endpoint) |
| `/scrape/stop` | POST | Stop a running scrape |
| `/api/actions/metadata` | GET | Action metadata |
| `/api/health` | GET | Healthcheck |
| `/secrets` | GET/POST | Secret management (values are not returned) |

---

## Development

### Common scripts

```bash
# Start everything
pnpm start

# Start individually
pnpm start:api
pnpm start:ui

# Debug API
pnpm start:api:debug

# Build
pnpm build

# Tests
pnpm test
pnpm test:api
pnpm test:ui
pnpm test:e2e

# Lint
pnpm lint

# Nx graph
pnpm graph
```

### Generate schema / OpenAPI

```bash
pnpm create:schema
pnpm generate:openapi
```

---

## Docker

```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

---

## Contributing

- Use Conventional Commits (`feat:`, `fix:`, `docs:`, …)
- Keep changes focused and add/update docs where needed
- Run `pnpm lint` and `pnpm test` before opening a PR

---

## License

MIT — see [LICENSE](LICENSE).

---

_Last updated: December 2025_
