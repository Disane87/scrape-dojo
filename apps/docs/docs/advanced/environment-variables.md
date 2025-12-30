---
sidebar_position: 2
---

# Environment Variables

Alle verfügbaren Umgebungsvariablen.

## Required ✅

```env
SCRAPE_DOJO_ENCRYPTION_KEY=<64-hex-chars>
```

Generieren:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Server

```env
NODE_ENV=development|production
SCRAPE_DOJO_PORT=3000
SCRAPE_DOJO_TRUST_PROXY=0|1
SCRAPE_DOJO_CORS_ORIGIN=http://localhost:3000
```

## Database

```env
DB_TYPE=sqlite|postgres|mysql|mssql
DB_DATABASE=scrape_dojo
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=scrape_dojo
DB_PASSWORD=<password>
```

## Auth

```env
SCRAPE_DOJO_AUTH_ENABLED=true|false
SCRAPE_DOJO_AUTH_JWT_SECRET=<secret>
SCRAPE_DOJO_AUTH_JWT_EXPIRES_IN=1d
SCRAPE_DOJO_AUTH_API_KEY=<api-key>
```

## OIDC

```env
SCRAPE_DOJO_AUTH_OIDC_ENABLED=true|false
SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL=<issuer-url>
SCRAPE_DOJO_AUTH_OIDC_CLIENT_ID=<client-id>
SCRAPE_DOJO_AUTH_OIDC_CLIENT_SECRET=<secret>
SCRAPE_DOJO_AUTH_OIDC_REDIRECT_URI=<redirect-uri>
```

## MFA

```env
SCRAPE_DOJO_AUTH_MFA_ENABLED=true|false
SCRAPE_DOJO_AUTH_MFA_ISSUER=Scrape Dojo
```

## Variables & Secrets

```env
# Global Variables (unencrypted)
SCRAPE_DOJO_VAR_<NAME>=<value>

# Secrets (encrypted)
SCRAPE_DOJO_SECRET_<NAME>=<value>
```

## Puppeteer

```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_HEADLESS=true|false
```

## Vollständige Liste

Siehe `.env.example` im Repository für alle Optionen.

## Nächste Schritte

- 🔐 [Authentication](./authentication)
- 🗄️ [Database](./database)
