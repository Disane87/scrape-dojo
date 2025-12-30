---
sidebar_position: 6
---

# Secrets & Variablen

Verwalte sensible Daten und Konfigurationswerte sicher und flexibel.

## Übersicht

Scrape Dojo unterstützt mehrere Arten von Variablen:

| Typ | Prefix | Verschlüsselt | Verwendung |
|-----|--------|---------------|------------|
| Secrets | `SCRAPE_DOJO_SECRET_*` | ✅ Ja | Passwörter, API-Keys |
| Global Vars | `SCRAPE_DOJO_VAR_*` | ❌ Nein | Öffentliche Werte |
| Workflow Vars | `metadata.variables` | ❌ Nein | Pro-Scrape Config |

## Secrets (Verschlüsselt)

### Einrichten

In `.env`:

```env
SCRAPE_DOJO_SECRET_EMAIL=user@example.com
SCRAPE_DOJO_SECRET_PASSWORD=super-secret-pw
SCRAPE_DOJO_SECRET_API_KEY=abc123xyz
SCRAPE_DOJO_SECRET_TOTP=JBSWY3DPEHPK3PXP
```

### Verwendung

```json
{
  "name": "Login",
  "action": "type",
  "params": {
    "selector": "#email",
    "text": "{{secrets.email}}"  // Zugriff ohne PREFIX
  }
}
```

**Wichtig**:
- 🔑 Prefix `SCRAPE_DOJO_SECRET_` in .env
- 🎯 Zugriff via `{{secrets.email}}` (lowercase!)
- 🔒 Werte werden bei Startup verschlüsselt in DB gespeichert

## Globale Variablen

### Einrichten

In `.env`:

```env
SCRAPE_DOJO_VAR_DEFAULT_YEAR=2025
SCRAPE_DOJO_VAR_API_ENDPOINT=https://api.example.com
SCRAPE_DOJO_VAR_MAX_RETRIES=3
```

### Verwendung

```json
{
  "name": "Navigate",
  "action": "navigate",
  "params": {
    "url": "{{variables.apiEndpoint}}/orders?year={{variables.defaultYear}}"
  }
}
```

## Workflow-Variablen

### Definition

In der Scrape-Config:

```json
{
  "id": "my-scrape",
  "metadata": {
    "description": "...",
    "variables": {
      "productId": "12345",
      "outputFormat": "json",
      "maxResults": 100
    }
  }
}
```

### Verwendung

```json
{
  "name": "FetchProduct",
  "action": "navigate",
  "params": {
    "url": "https://example.com/product/{{variables.productId}}"
  }
}
```

## Auflösungsreihenfolge

Wenn derselbe Variablenname mehrfach definiert ist:

1. 🥇 **Runtime Parameters** (höchste Priorität)
2. 🥈 **Workflow Variables** (`metadata.variables`)
3. 🥉 **Global Variables** (`SCRAPE_DOJO_VAR_*`)
4. 🏅 **Secrets** (`SCRAPE_DOJO_SECRET_*`)

### Beispiel

```env
# .env
SCRAPE_DOJO_VAR_YEAR=2024
SCRAPE_DOJO_SECRET_YEAR=2023
```

```json
// config.jsonc
{
  "metadata": {
    "variables": {
      "year": "2025"
    }
  }
}
```

```handlebars
{{variables.year}}  // → "2025" (Workflow Variable gewinnt)
```

## Runtime Parameters

### Via API

```bash
curl -X POST http://localhost:3333/api/scrapes/my-scrape/run \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "year": "2026",
      "customParam": "value"
    }
  }'
```

### Via UI

Die UI bietet ein Formular zum Setzen von Runtime-Variablen vor der Ausführung.

## Secrets Management

### Encryption

- **Algorithmus**: AES-256-GCM
- **Key**: `SCRAPE_DOJO_ENCRYPTION_KEY` (256-bit)
- **Storage**: Encrypted in Database

:::danger Key-Wechsel
⚠️ Wenn du den `SCRAPE_DOJO_ENCRYPTION_KEY` änderst, werden alle bestehenden Secrets unbrauchbar! Sichere den Key!
:::

### Best Practices

```env
# ✅ DO
SCRAPE_DOJO_SECRET_DB_PASSWORD=very-secure-password
SCRAPE_DOJO_SECRET_API_TOKEN=abc123xyz

# ❌ DON'T
SCRAPE_DOJO_VAR_PASSWORD=insecure  # Nicht verschlüsselt!
```

## Via UI verwalten

### Secrets anlegen

1. Navigiere zu "Settings" → "Secrets"
2. Klicke "Add Secret"
3. Name: `api_key`
4. Value: `your-secret-value`
5. Speichern

### Zugriff

```json
{
  "params": {
    "token": "{{secrets.apiKey}}"  // camelCase!
  }
}
```

## Beispiele

### Login Flow

```json
{
  "steps": [
    {
      "name": "Login",
      "actions": [
        {
          "name": "GoToLogin",
          "action": "navigate",
          "params": {
            "url": "{{variables.loginUrl}}"
          }
        },
        {
          "name": "EnterEmail",
          "action": "type",
          "params": {
            "selector": "#email",
            "text": "{{secrets.email}}"
          }
        },
        {
          "name": "EnterPassword",
          "action": "type",
          "params": {
            "selector": "#password",
            "text": "{{secrets.password}}"
          }
        },
        {
          "name": "Submit",
          "action": "click",
          "params": {
            "selector": "button[type=submit]"
          }
        }
      ]
    }
  ]
}
```

### API Integration

```json
{
  "name": "CallAPI",
  "action": "executeScript",
  "params": {
    "script": `
      return fetch('{{variables.apiEndpoint}}/data', {
        headers: {
          'Authorization': 'Bearer {{secrets.apiToken}}'
        }
      }).then(r => r.json());
    `
  }
}
```

## Troubleshooting

### Secret nicht gefunden

**Fehler**: `Secret 'xyz' not found`

**Lösung**:
1. ✅ Check `.env`: `SCRAPE_DOJO_SECRET_XYZ=...`
2. ✅ Server neu starten
3. ✅ In Config: `{{secrets.xyz}}` (lowercase!)

### Encryption Error

**Fehler**: `Unable to decrypt secret`

**Ursache**: `SCRAPE_DOJO_ENCRYPTION_KEY` wurde geändert

**Lösung**:
- Alten Key wiederherstellen ODER
- Alle Secrets neu erstellen

## Nächste Schritte

- 🔐 [Authentication](../advanced/authentication) - User Auth konfigurieren
- ⚙️ [Environment Variables](../advanced/environment-variables) - Alle Optionen
- 💡 [Beispiele](../examples/login-flow) - Praktische Anwendungen
