---
sidebar_position: 3
---

# API Reference

Die vollständige API-Dokumentation ist via OpenAPI/Swagger verfügbar.

## Swagger UI

Starte die API und öffne:

```
http://localhost:3333/api
```

## OpenAPI Spec

Raw OpenAPI JSON:

```
http://localhost:3333/api/openapi.json
```

## Hauptendpunkte

### Scrapes

- `GET /api/scrapes` - Liste aller Scrapes
- `GET /api/scrapes/:id` - Scrape Details
- `POST /api/scrapes/:id/run` - Scrape ausführen
- `GET /api/scrapes/:id/runs` - Run-Historie

### Runs

- `GET /api/runs` - Alle Runs
- `GET /api/runs/:id` - Run Details
- `GET /api/runs/:id/logs` - Run Logs
- `DELETE /api/runs/:id` - Run löschen

### Actions

- `GET /api/actions/metadata` - Action-Metadaten

### Auth

- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/profile` - User Profil

## Authentication

### JWT

```bash
# Login
curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Antwort
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}

# Authenticated Request
curl http://localhost:3333/api/scrapes \
  -H "Authorization: Bearer eyJhbGc..."
```

### API Key

```bash
curl http://localhost:3333/api/scrapes \
  -H "X-API-Key: your-api-key"
```

## Beispiele

Siehe [Swagger UI](http://localhost:3333/api) für interaktive Beispiele.
