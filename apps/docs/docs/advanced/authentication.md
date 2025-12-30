---
sidebar_position: 1
---

# Authentication

Sichere deine Scrape Dojo Installation mit verschiedenen Auth-Methoden.

## Auth aktivieren

`.env`:
```env
SCRAPE_DOJO_AUTH_ENABLED=true
SCRAPE_DOJO_AUTH_JWT_SECRET=<sehr-langes-zufälliges-secret>
```

## Initial Setup

### Admin User erstellen

```bash
# Check if setup needed
curl http://localhost:3333/api/auth/setup-required

# Create admin
curl -X POST http://localhost:3333/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepassword123",
    "displayName": "Administrator"
  }'
```

## API Key (Headless)

Für Scripts und Automatisierung:

`.env`:
```env
SCRAPE_DOJO_AUTH_API_KEY=your-secret-api-key
```

Verwendung:
```bash
curl http://localhost:3333/api/scrapes \
  -H "X-API-Key: your-secret-api-key"
```

## OIDC/SSO

Enterprise SSO mit OIDC:

`.env`:
```env
SCRAPE_DOJO_AUTH_OIDC_ENABLED=true
SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL=https://auth.example.com/realms/main
SCRAPE_DOJO_AUTH_OIDC_CLIENT_ID=scrape-dojo
SCRAPE_DOJO_AUTH_OIDC_CLIENT_SECRET=<client-secret>
SCRAPE_DOJO_AUTH_OIDC_REDIRECT_URI=http://localhost:3000/auth/callback
```

Unterstützte Provider:
- Keycloak
- Auth0
- Okta
- Azure AD
- Google Workspace

## MFA (TOTP)

Two-Factor Authentication:

`.env`:
```env
SCRAPE_DOJO_AUTH_MFA_ENABLED=true
SCRAPE_DOJO_AUTH_MFA_ISSUER=Scrape Dojo
```

User können MFA in ihrem Profil aktivieren.

## Mehr Details

Siehe `docs/AUTH.md` im Repository für vollständige Dokumentation.

## Nächste Schritte

- ⚙️ [Environment Variables](./environment-variables)
- 🔐 [Secrets & Variablen](../user-guide/secrets-variables)
