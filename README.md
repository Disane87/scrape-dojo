<div align="center">

<img src="./apps/ui/public/logos/scrape-dojo-readme-logo.png" width="180" alt="Scrape Dojo Logo" />

# 🥋 Scrape Dojo

_Master the art of web scraping with JSON-powered workflows_

**Define scrapes declaratively · Template everything · Run and monitor in style**

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)](https://pptr.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Nx](https://img.shields.io/badge/Nx-143055?style=for-the-badge&logo=nx&logoColor=white)](https://nx.dev/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![GHCR](https://img.shields.io/badge/GHCR-API%20%7C%20UI-blue?style=for-the-badge&logo=github)](https://github.com/Disane87/scrape-dojo/pkgs/container/scrape-dojo)
![GitHub Stars](https://img.shields.io/github/stars/Disane87/scrape-dojo?style=for-the-badge&logo=github)
![GitHub Issues](https://img.shields.io/github/issues/Disane87/scrape-dojo?style=for-the-badge&logo=github)

</div>

---

## 📖 Table of Contents

- [What's This?](#-whats-this-all-about)
- [Features](#-what-can-this-thing-do)
- [Installation](#-installation)
  - [Quick Start (Docker)](#-quick-start-docker)
  - [Quick Start (Local)](#-quick-start-local)
- [Configuration](#️-configuration)
  - [Environment Variables](#environment-variables)
  - [Variables & Secrets](#-variables--secrets)
  - [Auth (JWT/OIDC/MFA)](#-auth-jwtoidcmfa)
- [Scrape Configuration](#-scrape-configuration)
  - [Basic Concepts](#basic-concepts)
  - [Data Flow](#data-flow-previousdata-and-currentdata)
  - [Loops](#loops)
  - [Templating](#handlebars-templating)
  - [Transformations](#jsonata-transformations)
  - [Available Actions](#what-actions-are-available)
- [Examples](#-examples)
  - [Simple Scrape](#simple-scrape)
  - [Loop Example](#loop-example)
  - [PDF Download](#pdf-download)
- [Development](#️-development)
  - [Project Layout](#project-layout)
  - [API Documentation](#api-documentation)
  - [Tests](#tests)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 What's This All About?

Hey there! 👋 **Scrape Dojo** is your friendly neighborhood web scraping & browser automation toolkit!

Instead of writing hundreds of lines of Puppeteer code for each website, you simply describe your workflows in **JSON/JSONC files**. Think of it as Infrastructure-as-Code, but for web scraping! 🚀

What can you do with it?

- 📋 **Declarative Scrapes**: Define workflows as JSON - no code per website needed
- 🎨 **Dynamic Templates**: Use Handlebars for flexible parameters (`{{variables.*}}`, `{{secrets.*}}`)
- 🔄 **Data Processing**: Extract & transform data with JSONata
- 🔐 **Secure Secrets**: Encryption-at-rest for sensitive data
- 🎯 **Modern UI**: Angular-based dashboard to start & monitor scrapes
- 🔒 **Enterprise Auth**: JWT, OIDC/SSO, MFA/TOTP - all optional

> [!IMPORTANT]
> ⚠️ Scrape Dojo automates real browser interactions. Please respect website terms of service and applicable legal frameworks!

---

## ✨ What Can This Thing Do?

Glad you asked! Here's what Scrape Dojo brings to the table:

### 🎯 Core Features

- 📝 **JSON/JSONC Workflows**: Validated via JSON Schema - IntelliSense included!
- 🎨 **Template Engine**: Handlebars for dynamic parameters
- 🔄 **Data Flow**: `previousData` & `currentData` for seamless action chaining
- 🔁 **Control Flow**: Loops, conditions & more
- 📊 **Extraction**: Easy DOM element reading
- 🔧 **Transformation**: JSONata for complex data processing

### 🎨 UI & Monitoring

- 📺 **Live Monitoring**: Follow your scrapes in real-time
- 📋 **Logs & Events**: Detailed insights into every run
- 🚀 **Quick Start**: Start scrapes with one click
- 📊 **Run History**: Keep track of all executions

### 🔐 Security & Auth

- 🔑 **Secrets Management**: Encrypted storage of sensitive data
- 👤 **Multi-User**: JWT-based authentication
- 🌐 **SSO/OIDC**: Enterprise-ready with OIDC support
- 📱 **MFA**: TOTP-based two-factor authentication
- 🔒 **API Keys**: For headless/automation scenarios

### 🛠️ Developer Experience

- 🏗️ **Nx Monorepo**: Modern, scalable architecture
- 📚 **OpenAPI**: Complete API documentation
- 🐳 **Docker Ready**: Docker Compose for easy deployment
- 🎯 **TypeScript**: Type-safe all the way

---

## 📦 Installation

### 🐳 Quick Start (Docker)

The easiest way! Docker Compose brings you a complete environment with API + UI + persistence.

The image is published to **GitHub Container Registry (GHCR)** with multi-arch support (`linux/amd64` + `linux/arm64`):

```
ghcr.io/disane87/scrape-dojo:latest
```

A single container runs both the API (NestJS + Puppeteer) and UI (Angular via nginx).

#### 1️⃣ Prerequisites

- Docker & Docker Compose installed
- That's it! 🎉

#### 2️⃣ Environment Setup

Copy `.env.example` to `.env` and set at least the encryption key:

```bash
cp .env.example .env
```

Generate a secure encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the generated value to your `.env`:

```env
SCRAPE_DOJO_ENCRYPTION_KEY=<your-generated-key>
```

> [!WARNING]
> 🔐 The `SCRAPE_DOJO_ENCRYPTION_KEY` is **essential**! It encrypts all secrets in the DB. If you change it, existing secrets may become unrecoverable!

#### 3️⃣ Start It Up

```bash
docker compose up -d
docker compose logs -f
```

#### 4️⃣ You're Ready!

- 🎨 **UI**: http://localhost:8080
- 🚀 **API**: http://localhost:8080/api
- 📚 **API Docs**: http://localhost:8080/api

#### 5️⃣ Persistence & Volumes

Docker Compose automatically mounts:

| Directory        | Purpose                 |
| ---------------- | ----------------------- |
| `./data`         | Database & state        |
| `./downloads`    | Downloads & artifacts   |
| `./logs`         | Application logs        |
| `./browser-data` | Browser profile & cache |
| `./config`       | Scrape configurations   |

---

### 💻 Quick Start (Local)

Perfect for development! Full control at your fingertips.

#### 1️⃣ Prerequisites

- Node.js 20+
- pnpm 9+

> [!NOTE]
> 💡 First startup might take a while - Puppeteer downloads browser binaries!

#### 2️⃣ Install Dependencies

```bash
pnpm install
```

#### 3️⃣ Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add it to `.env`:

```env
SCRAPE_DOJO_ENCRYPTION_KEY=<your-generated-key>
```

#### 4️⃣ Start Dev Servers

```bash
pnpm start
```

This automatically starts:

- 🎨 **UI**: http://localhost:4200
- 🚀 **API**: http://localhost:3000
- 📚 **Docs** (optional): http://localhost:4321 (`pnpm nx dev docs`)

> [!TIP]
> 💡 In VS Code, check out the pre-configured tasks! Look for "Tasks" → "Start All Dev Servers"

---

## ⚙️ Configuration

The complete list of supported environment variables is documented in `.env.example`.

### Environment Variables

#### Required ✅

| Variable                     | Description                                   |
| ---------------------------- | --------------------------------------------- |
| `SCRAPE_DOJO_ENCRYPTION_KEY` | 64 hex chars (256-bit) for secrets encryption |

#### Runtime / Server

| Variable                    | Default                 | Description                                                 |
| --------------------------- | ----------------------- | ----------------------------------------------------------- |
| `NODE_ENV`                  | `development`           | Node.js environment (`development` / `production` / `test`) |
| `SCRAPE_DOJO_NODE_ENV`      | `development`           | App-specific environment (used by health & puppeteer)       |
| `SCRAPE_DOJO_PORT`          | `3000`                  | API server port                                             |
| `SCRAPE_DOJO_DOCKER_ENV`    | `false`                 | Enable Docker mode                                          |
| `SCRAPE_DOJO_TRUST_PROXY`   | `1`                     | Reverse proxy trust level                                   |
| `SCRAPE_DOJO_CORS_ORIGIN`   | —                       | CORS origins (comma-separated)                              |
| `SCRAPE_DOJO_FRONTEND_URL`  | `http://localhost:4200` | Frontend URL for OIDC redirects                             |
| `EXPORT_OPENAPI`            | `false`                 | Export OpenAPI spec on startup                              |
| `SCRAPE_DOJO_LOG_MAX_BYTES` | `5000000`               | Max in-memory log buffer size (bytes)                       |

#### Database

| Variable         | Default                 | Description                                      |
| ---------------- | ----------------------- | ------------------------------------------------ |
| `DB_TYPE`        | `sqlite`                | Database type: `sqlite`, `mysql`, `postgres`     |
| `DB_DATABASE`    | `./data/scrape-dojo.db` | Database path (SQLite) or name                   |
| `DB_HOST`        | —                       | Database host (MySQL/PostgreSQL)                 |
| `DB_PORT`        | `3306` / `5432`         | Database port (MySQL/PostgreSQL)                 |
| `DB_USERNAME`    | —                       | Database user (MySQL/PostgreSQL)                 |
| `DB_PASSWORD`    | —                       | Database password (MySQL/PostgreSQL)             |
| `DB_SYNCHRONIZE` | `true`                  | TypeORM schema sync (**`false` in production!**) |
| `DB_LOGGING`     | `false`                 | Enable SQL query logging                         |

#### Authentication

| Variable                                  | Default | Description                                      |
| ----------------------------------------- | ------- | ------------------------------------------------ |
| `SCRAPE_DOJO_AUTH_ENABLED`                | `true`  | Enable authentication globally                   |
| `SCRAPE_DOJO_AUTH_REQUIRE_MFA`            | `true`  | Enforce MFA (TOTP) for all users                 |
| `SCRAPE_DOJO_AUTH_JWT_SECRET`             | —       | JWT signing secret (min 32 chars)                |
| `SCRAPE_DOJO_AUTH_REFRESH_TOKEN_SECRET`   | —       | Refresh token secret (min 32 chars)              |
| `SCRAPE_DOJO_AUTH_ACCESS_TOKEN_EXPIRY`    | `15m`   | Access token expiry (`15m`, `1h`, `7d`)          |
| `SCRAPE_DOJO_AUTH_REFRESH_TOKEN_EXPIRY`   | `7d`    | Refresh token expiry                             |
| `SCRAPE_DOJO_AUTH_RATE_LIMIT_WINDOW_MS`   | `60000` | Rate limit window (ms)                           |
| `SCRAPE_DOJO_AUTH_RATE_LIMIT_MAX`         | `30`    | Max requests per window                          |
| `SCRAPE_DOJO_AUTH_API_KEY`                | —       | API key for headless access (`X-API-Key` header) |
| `SCRAPE_DOJO_AUTH_TRUSTED_DEVICE_RISK_IP` | `true`  | Device trust IP risk checking                    |

#### MFA (TOTP)

| Variable                                | Default       | Description                        |
| --------------------------------------- | ------------- | ---------------------------------- |
| `SCRAPE_DOJO_AUTH_MFA_ISSUER`           | `Scrape Dojo` | Issuer shown in authenticator apps |
| `SCRAPE_DOJO_AUTH_MFA_CHALLENGE_SECRET` | —             | Challenge token signing secret     |
| `SCRAPE_DOJO_AUTH_MFA_ENCRYPTION_KEY`   | —             | Encryption key for MFA secrets     |

#### OIDC / SSO

| Variable                              | Default                                    | Description                |
| ------------------------------------- | ------------------------------------------ | -------------------------- |
| `SCRAPE_DOJO_AUTH_OIDC_ENABLED`       | `false`                                    | Enable OIDC authentication |
| `SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL`    | —                                          | OIDC provider URL          |
| `SCRAPE_DOJO_AUTH_OIDC_CLIENT_ID`     | —                                          | OIDC client ID             |
| `SCRAPE_DOJO_AUTH_OIDC_CLIENT_SECRET` | —                                          | OIDC client secret         |
| `SCRAPE_DOJO_AUTH_OIDC_REDIRECT_URI`  | `http://localhost:3000/auth/oidc/callback` | Callback URL               |
| `SCRAPE_DOJO_AUTH_OIDC_SCOPES`        | `openid profile email`                     | Requested scopes           |
| `SCRAPE_DOJO_AUTH_OIDC_PROVIDER_NAME` | `OIDC Provider`                            | Display name in UI         |

---

### 🔑 Variables & Secrets

Scrape Dojo supports a layered variable system for maximum flexibility!

#### Types of Variables

| Type               | Environment Prefix     | Encrypted | Usage              |
| ------------------ | ---------------------- | --------- | ------------------ |
| Global Variables   | `SCRAPE_DOJO_VAR_*`    | ❌        | Public values      |
| Secrets            | `SCRAPE_DOJO_SECRET_*` | ✅        | Sensitive data     |
| Workflow Variables | -                      | ❌        | Defined per scrape |

#### Resolution Order (highest priority first)

1. 🎯 Runtime parameters
2. 📋 Workflow variables (`metadata.variables`)
3. 🌍 Global variables (`SCRAPE_DOJO_VAR_*`)
4. 🔐 Secrets (`SCRAPE_DOJO_SECRET_*`)

#### Example `.env`

```bash
# Global variables (unencrypted)
SCRAPE_DOJO_VAR_DEFAULT_YEAR=2025
SCRAPE_DOJO_VAR_API_ENDPOINT=https://api.example.com

# Secrets (encrypted in DB)
SCRAPE_DOJO_SECRET_EMAIL=user@example.com
SCRAPE_DOJO_SECRET_PASSWORD=super-secret
SCRAPE_DOJO_SECRET_API_TOKEN=abc123xyz
```

#### Usage in Scrapes

```jsonc
{
  "actions": [
    {
      "name": "Login",
      "action": "type",
      "params": {
        "selector": "#email",
        "text": "{{secrets.email}}",
      },
    },
    {
      "name": "Password",
      "action": "type",
      "params": {
        "selector": "#password",
        "text": "{{secrets.password}}",
      },
    },
  ],
}
```

> [!TIP]
> 🔒 Use secrets for sensitive data like passwords, API keys, etc. They're encrypted in the DB!

---

### 🔐 Auth (JWT/OIDC/MFA)

Full authentication is optional, but enterprise-ready!

Detailed documentation can be found in `docs/AUTH.md`.

#### Initial Setup (Create Admin)

On first startup, you can create an admin user:

```bash
# Check if setup is required
curl http://localhost:3000/api/auth/setup-required

# Create admin
curl -X POST http://localhost:3000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepassword123",
    "displayName": "Administrator"
  }'
```

> [!NOTE]
> 💡 In dev, the UI can proxy API calls. For scripts/tools, the direct API URL is usually easier!

#### API Key (Headless)

If `SCRAPE_DOJO_AUTH_API_KEY` is set, services can access via `X-API-Key`:

```bash
curl http://localhost:3000/api/scrapes \
  -H "X-API-Key: <your-api-key>"
```

#### OIDC/SSO

OIDC is activated via `SCRAPE_DOJO_AUTH_OIDC_*`. Pay special attention to:

- ✅ `SCRAPE_DOJO_AUTH_OIDC_REDIRECT_URI` (must be exactly allowed by provider)
- ✅ `SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL` (correct realm/tenant)
- ✅ Reverse proxy/HTTPS in production (`SCRAPE_DOJO_TRUST_PROXY` and CORS)

#### MFA (TOTP)

When MFA is active, users must confirm a TOTP code.

> [!IMPORTANT]
> 🔐 In production, MFA secrets must be set (see `.env.example`). Also: Time/time sync is critical for TOTP!

---

## 📝 Scrape Configuration

Scrapes are stored under `config/sites/` as `.jsonc` files.

### Basic Concepts

```text
config/
  ├── scrapes.schema.json  (JSON Schema for validation)
  └── sites/
      ├── amazon.jsonc
      └── example.jsonc
```

#### Structure

- A config file contains a list of `scrapes`
- A scrape has `steps`
- A step contains `actions`

#### Minimal Example

```jsonc
{
  "$schema": "../scrapes.schema.json",
  "scrapes": [
    {
      "id": "my-scrape",
      "metadata": {
        "description": "Example scrape",
        "version": "1.0.0",
      },
      "steps": [
        {
          "name": "Get Title",
          "actions": [
            {
              "name": "Navigate",
              "action": "navigate",
              "params": { "url": "https://example.com" },
            },
            {
              "name": "Extract Title",
              "action": "extract",
              "params": { "selector": "h1" },
            },
          ],
        },
      ],
    },
  ],
}
```

> [!TIP]
> 💡 Use `$schema` for IntelliSense in your editor!

---

### Data Flow: `previousData` and `currentData`

The heart of the data flow system! Each action can access data from previous actions.

#### `previousData`

- Each action stores its result under `previousData.<actionName>`
- Access via Handlebars: `{{previousData.actionName}}`

#### `currentData`

- In loops: `currentData.<loopName>.value` (current item)
- In loops: `currentData.<loopName>.index` (current index)

#### Example

```jsonc
{
  "actions": [
    {
      "name": "pageTitle",
      "action": "extract",
      "params": { "selector": "h1" },
    },
    {
      "name": "logTitle",
      "action": "logger",
      "params": {
        "message": "Title: {{previousData.pageTitle}}",
      },
    },
  ],
}
```

What happens here?

1. ✅ `extract` reads the `<h1>` tag
2. ✅ Result is stored as `previousData.pageTitle`
3. ✅ `logger` accesses it and outputs it

---

### Loops

Loops are your friends for repeated actions! 🔁

#### Syntax

```jsonc
{
  "name": "processOrders",
  "action": "loop",
  "params": {
    "items": "{{previousData.orders}}",
  },
  "actions": [
    {
      "name": "downloadPdf",
      "action": "download",
      "params": {
        "url": "https://example.com/order/{{currentData.processOrders.value.id}}.pdf",
        "filename": "order-{{currentData.processOrders.index}}.pdf",
      },
    },
  ],
}
```

What happens here?

- 📋 `items` contains an array of orders
- 🔄 For each item, `downloadPdf` is executed
- 📊 `currentData.processOrders.value` = current order object
- 🔢 `currentData.processOrders.index` = 0, 1, 2, ...

---

### Handlebars Templating

Easily inject dynamic values!

#### Built-in Variables

```handlebars
{{previousData.x}}
# Data from previous actions
{{currentData.x}}
# Loop context
{{variables.x}}
# Workflow variables
{{secrets.x}}
# Encrypted secrets
```

#### Helpers

```handlebars
{{add 1 2}}
# 3
{{subtract 2025 1}}
# 2024
{{multiply 10 2}}
# 20
{{divide 100 10}}
# 10
{{not true}}
# false
{{eq a b}}
# a === b
{{concat 'Hello' ' ' 'World'}}
# "Hello World"
```

#### Example

```jsonc
{
  "action": "logger",
  "params": {
    "message": "Processing order #{{currentData.orders.index}} - Total: {{multiply currentData.orders.value.price 1.19}}€",
  },
}
```

---

### JSONata Transformations

For complex data processing, Scrape Dojo uses [JSONata](https://jsonata.org/)!

#### Example: Clean Data

```jsonc
{
  "name": "cleanOrders",
  "action": "transform",
  "params": {
    "data": "{{previousData.rawOrders}}",
    "expression": "$map($, function($v) { {'id': $v.orderId, 'total': $number($v.price)} })",
  },
}
```

#### What can JSONata do?

- 🔍 Filter: `$[price > 100]`
- 🔄 Transform: `$map($, function($v) { ... })`
- 📊 Aggregate: `$sum(prices)`
- 🎯 Select: `orders.items[0].name`

> [!TIP]
> 🧪 Test your JSONata expressions online: https://try.jsonata.org/

---

### What Actions Are Available?

The UI uses action metadata to drive forms/validation. You can also query them directly:

```bash
curl http://localhost:3000/api/actions/metadata
```

#### Commonly Used Actions

| Action       | Description                   |
| ------------ | ----------------------------- |
| `navigate`   | Navigate to a URL             |
| `click`      | Click on an element           |
| `type`       | Type text into an input field |
| `extract`    | Extract data from the DOM     |
| `transform`  | Transform data with JSONata   |
| `loop`       | Iterate over an array         |
| `condition`  | Conditional execution         |
| `wait`       | Wait x milliseconds           |
| `download`   | Download a file               |
| `screenshot` | Take a screenshot             |
| `logger`     | Log a message                 |

Full list in the API documentation! 📚

---

## 💡 Examples

### Simple Scrape

Let's scrape a simple website!

```jsonc
{
  "$schema": "../scrapes.schema.json",
  "scrapes": [
    {
      "id": "example-scrape",
      "metadata": {
        "description": "Scrape example.com title",
        "version": "1.0.0",
      },
      "steps": [
        {
          "name": "Main",
          "actions": [
            {
              "name": "GoToPage",
              "action": "navigate",
              "params": {
                "url": "https://example.com",
              },
            },
            {
              "name": "GetTitle",
              "action": "extract",
              "params": {
                "selector": "h1",
              },
            },
            {
              "name": "LogTitle",
              "action": "logger",
              "params": {
                "message": "Found title: {{previousData.GetTitle}}",
              },
            },
          ],
        },
      ],
    },
  ],
}
```

What happens?

1. 🌐 Open example.com
2. 📋 Extract the h1 text
3. 📝 Log the result

---

### Loop Example

Process multiple items? No problem!

```jsonc
{
  "actions": [
    {
      "name": "GetProducts",
      "action": "extract",
      "params": {
        "selector": ".product",
        "extractAll": true,
        "properties": {
          "name": ".product-name",
          "price": ".product-price",
        },
      },
    },
    {
      "name": "ProcessProducts",
      "action": "loop",
      "params": {
        "items": "{{previousData.GetProducts}}",
      },
      "actions": [
        {
          "name": "LogProduct",
          "action": "logger",
          "params": {
            "message": "Product {{currentData.ProcessProducts.index}}: {{currentData.ProcessProducts.value.name}} - {{currentData.ProcessProducts.value.price}}",
          },
        },
      ],
    },
  ],
}
```

Awesome! Now each product is processed individually. 🎯

---

### PDF Download

Automatically download PDFs!

```jsonc
{
  "actions": [
    {
      "name": "Login",
      "action": "navigate",
      "params": { "url": "https://example.com/login" },
    },
    {
      "name": "EnterEmail",
      "action": "type",
      "params": {
        "selector": "#email",
        "text": "{{secrets.email}}",
      },
    },
    {
      "name": "EnterPassword",
      "action": "type",
      "params": {
        "selector": "#password",
        "text": "{{secrets.password}}",
      },
    },
    {
      "name": "Submit",
      "action": "click",
      "params": { "selector": "button[type=submit]" },
    },
    {
      "name": "DownloadInvoice",
      "action": "download",
      "params": {
        "url": "https://example.com/invoice/123.pdf",
        "filename": "invoice-{{variables.orderNumber}}.pdf",
      },
    },
  ],
}
```

Done! The PDF lands in `./downloads/`. 📥

---

## 🛠️ Development

### Project Layout

```text
scrape-dojo/
├── apps/
│   ├── api/           # NestJS Backend
│   ├── ui/            # Angular Frontend
│   └── docs/          # Docusaurus Documentation
├── libs/
│   └── shared/        # Shared Types
├── config/
│   ├── scrapes.schema.json
│   └── sites/
├── downloads/         # Downloaded Files
├── data/              # SQLite DB (default)
├── logs/              # Application Logs
└── browser-data/      # Puppeteer Browser Cache
```

#### Apps

**api/ (NestJS)**

- 🚀 Backend engine
- 📊 REST API
- 🤖 Puppeteer integration
- 🔐 Auth & secrets

**ui/ (Angular)**

- 🎨 Web interface
- 📊 Monitoring dashboard
- 📋 Scrape management
- 📈 Run history

**docs/ (Astro Starlight)**

- 📚 Project documentation (EN + DE)
- 🔗 API reference
- 💡 Guides & tutorials

---

### API Documentation

The complete API documentation is available via **OpenAPI/Swagger**:

#### Swagger UI

Start the API and open:

```
http://localhost:3000/api
```

Here you'll find:

- 📋 All endpoints
- 🔧 Interactive API tests
- 📖 Request/Response schemas
- 🔐 Auth methods

#### OpenAPI JSON

Raw OpenAPI spec:

```
http://localhost:3000/api/openapi.json
```

---

### Tests

```bash
# Unit tests (all apps)
pnpm test

# API only
pnpm test:api

# UI only
pnpm test:ui

# With coverage
pnpm test:coverage

# E2E tests
pnpm test:e2e

# Watch mode
pnpm test:watch
```

#### Test Structure

```text
apps/
  api/
    src/
      **/__tests__/      # Unit tests
  test/
    e2e.spec.ts          # E2E tests
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1️⃣ Puppeteer Won't Start

**Problem:** Browser binary not found

**Solution:**

```bash
# Reinstall dependencies
pnpm install

# Manually download browser
npx puppeteer browsers install chrome
```

#### 2️⃣ Secrets Can't Be Decrypted

**Problem:** `SCRAPE_DOJO_ENCRYPTION_KEY` was changed

**Solution:**

- ⚠️ Reset key OR
- 🔑 Recreate secrets

> [!WARNING]
> 🔐 A changed encryption key makes old secrets unusable!

#### 3️⃣ CORS Errors in Production

**Problem:** UI can't communicate with API

**Solution:**

```env
# In .env
SCRAPE_DOJO_CORS_ORIGIN=https://your-ui-domain.com,https://other-domain.com
SCRAPE_DOJO_TRUST_PROXY=1
```

#### 4️⃣ Auth Not Working

**Problem:** JWT/OIDC configuration incorrect

**Solution:**

```bash
# Check logs
docker compose logs api

# Check auth status
curl http://localhost:3000/api/auth/status
```

See also: `docs/AUTH.md`

---

## 🤝 Contributing

Hey! Want to make Scrape Dojo better? That's awesome! 🎉

### How Can You Contribute?

- 🐛 **Find & report bugs**: [Issues](https://github.com/Disane87/scrape-dojo/issues)
- ✨ **Suggest features**: [Feature Requests](https://github.com/Disane87/scrape-dojo/issues/new)
- 💻 **Contribute code**: Pull requests are welcome!
- 📚 **Improve docs**: Typos, clarity, examples

### Development Setup

```bash
# 1. Fork & clone repo
git clone https://github.com/<your-username>/scrape-dojo.git
cd scrape-dojo

# 2. Dependencies
pnpm install

# 3. Environment
cp .env.example .env
# Set SCRAPE_DOJO_ENCRYPTION_KEY!

# 4. Dev servers
pnpm start

# 5. Tests
pnpm test
```

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new action type "scroll"
fix: prevent crash when selector not found
docs: update README examples
chore: update dependencies
```

### Pull Request Process

1. 🌿 Create branch (`git checkout -b feature/amazing-feature`)
2. ✏️ Commit changes (`git commit -m 'feat: add amazing feature'`)
3. 🚀 Push branch (`git push origin feature/amazing-feature`)
4. 📬 Open pull request

> [!TIP]
> 💡 Check out open [Issues](https://github.com/Disane87/scrape-dojo/issues) - maybe something's there for you!

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) for details.

This means:

- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed

---

## 🎉 Cheers!

Thanks for using Scrape Dojo! If you like it, give us a ⭐ on GitHub! 🙌

**Questions? Problems? Ideas?**

- 📬 [Issues](https://github.com/Disane87/scrape-dojo/issues)
- 💬 [Discussions](https://github.com/Disane87/scrape-dojo/discussions)
- 📧 Email: [mfranke87@icloud.com](mailto:mfranke87@icloud.com)

**Happy Scraping!** 🥋✨

---

<div align="center">

Made with ❤️ by [Marco Franke](https://github.com/Disane87)

[⬆ Back to top](#-scrape-dojo)

</div>
