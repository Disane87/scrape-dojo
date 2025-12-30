---
sidebar_position: 1
---

# Scrape-Konfiguration

Scrapes werden als JSON/JSONC-Dateien unter `config/sites/` gespeichert. Diese Dateien definieren deine kompletten Workflows.

## Dateistruktur

```text
config/
  ├── scrapes.schema.json    # JSON Schema für Validierung
  └── sites/
      ├── amazon.jsonc       # Amazon Scrapes
      ├── ebay.jsonc         # eBay Scrapes
      └── example.jsonc      # Beispiele
```

## Basis-Schema

Jede Scrape-Datei folgt diesem Schema:

```json
{
  "$schema": "../scrapes.schema.json",
  "scrapes": [
    {
      "id": "unique-scrape-id",
      "metadata": {
        "description": "Beschreibung der Scrape",
        "version": "1.0.0",
        "author": "Dein Name",
        "tags": ["tag1", "tag2"],
        "variables": {
          "customVar": "value"
        }
      },
      "steps": [
        {
          "name": "Step Name",
          "description": "Optional: Beschreibung",
          "actions": [
            // Actions hier
          ]
        }
      ]
    }
  ]
}
```

## Scrape-ID

Die `id` ist der eindeutige Bezeichner für deine Scrape.

**Regeln**:
- ✅ Nur Kleinbuchstaben, Zahlen, Bindestriche
- ✅ Beispiele: `my-scrape`, `amazon-orders`, `pdf-download-123`
- ❌ Keine Leerzeichen, Sonderzeichen, Großbuchstaben

**Verwendung**:
```bash
# Via API
POST /api/scrapes/my-scrape/run

# Via CLI
pnpm scrape run my-scrape
```

## Metadata

### Pflichtfelder

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `description` | string | Kurze Beschreibung |
| `version` | string | Semantische Version (1.0.0) |

### Optionale Felder

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `author` | string | Autor der Scrape |
| `tags` | string[] | Kategorisierungs-Tags |
| `variables` | object | Workflow-spezifische Variablen |
| `schedule` | string | Cron-Expression für Scheduling |

### Beispiel mit allen Feldern

```json
{
  "metadata": {
    "description": "Download monthly invoices",
    "version": "2.1.0",
    "author": "Marco Franke",
    "tags": ["invoices", "download", "automated"],
    "variables": {
      "year": "2025",
      "outputFormat": "pdf"
    },
    "schedule": "0 0 1 * *"  // Am 1. jeden Monats
  }
}
```

## Steps (Schritte)

Steps gruppieren Actions logisch. Denke an Kapitel in einem Buch.

### Warum Steps?

- 📋 **Übersichtlichkeit**: Große Workflows strukturieren
- 🐛 **Debugging**: Fehler leichter lokalisieren
- 📊 **Reporting**: Fortschritt pro Step tracken
- 🔄 **Wiederverwendung**: Steps können wiederholt werden

### Beispiel

```json
{
  "steps": [
    {
      "name": "Login",
      "description": "User authentication",
      "actions": [
        { "name": "Navigate", "action": "navigate", "params": {...} },
        { "name": "EnterEmail", "action": "type", "params": {...} },
        { "name": "Submit", "action": "click", "params": {...} }
      ]
    },
    {
      "name": "ExtractData",
      "description": "Extract product information",
      "actions": [
        { "name": "GetProducts", "action": "extract", "params": {...} }
      ]
    }
  ]
}
```

## Actions

Actions sind die eigentlichen Operationen. Jede Action hat:

- `name`: Eindeutiger Name (für `previousData`)
- `action`: Action-Typ (z.B. "navigate", "click")
- `params`: Parameter für die Action
- `condition` (optional): Ausführungsbedingung

### Action-Name Best Practices

```json
// ✅ Gut - beschreibend und eindeutig
"name": "GetProductTitle"
"name": "ClickLoginButton"
"name": "ExtractOrderList"

// ❌ Schlecht - zu generisch
"name": "Extract"
"name": "Action1"
"name": "Test"
```

:::tip Naming Convention
Verwende PascalCase für Action-Namen: `GetProductTitle`, `ClickSubmitButton`
:::

### Conditional Actions

Actions können bedingt ausgeführt werden:

```json
{
  "name": "ClickCookieBanner",
  "action": "click",
  "params": {
    "selector": "#cookie-accept"
  },
  "condition": "{{previousData.CookieBannerVisible}}"
}
```

## Komplettes Beispiel

```json
{
  "$schema": "../scrapes.schema.json",
  "scrapes": [
    {
      "id": "product-monitor",
      "metadata": {
        "description": "Monitor product prices on e-commerce site",
        "version": "1.0.0",
        "author": "Marco Franke",
        "tags": ["monitoring", "prices", "e-commerce"],
        "variables": {
          "productUrl": "https://example.com/product/123",
          "maxPrice": "99.99"
        }
      },
      "steps": [
        {
          "name": "Navigation",
          "description": "Navigate to product page",
          "actions": [
            {
              "name": "GoToProduct",
              "action": "navigate",
              "params": {
                "url": "{{variables.productUrl}}"
              }
            },
            {
              "name": "WaitForLoad",
              "action": "wait",
              "params": {
                "duration": 2000
              }
            }
          ]
        },
        {
          "name": "DataExtraction",
          "description": "Extract product data",
          "actions": [
            {
              "name": "GetPrice",
              "action": "extract",
              "params": {
                "selector": ".product-price",
                "attribute": "textContent"
              }
            },
            {
              "name": "GetStock",
              "action": "extract",
              "params": {
                "selector": ".stock-status"
              }
            }
          ]
        },
        {
          "name": "Processing",
          "description": "Process and validate data",
          "actions": [
            {
              "name": "LogPrice",
              "action": "logger",
              "params": {
                "level": "info",
                "message": "Current price: {{previousData.GetPrice}}"
              }
            },
            {
              "name": "CheckPrice",
              "action": "condition",
              "params": {
                "condition": "{{lt (number previousData.GetPrice) variables.maxPrice}}",
                "actions": [
                  {
                    "name": "SendAlert",
                    "action": "logger",
                    "params": {
                      "level": "warn",
                      "message": "Price dropped below threshold!"
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## JSON Schema Validation

Die Datei `scrapes.schema.json` definiert alle erlaubten Strukturen.

### IntelliSense aktivieren

Füge am Anfang jeder Config-Datei hinzu:

```json
{
  "$schema": "../scrapes.schema.json",
  // ... rest of config
}
```

VS Code (und andere Editoren) bieten dann:
- ✨ Auto-Completion
- ✅ Echtzeit-Validierung
- 📖 Inline-Dokumentation
- 🐛 Fehler-Highlighting

### Schema neu generieren

Falls du Actions erweitert hast:

```bash
pnpm create:schema
```

## Nächste Schritte

- 🔄 [Data Flow](./data-flow) - Wie Daten zwischen Actions fließen
- 🎨 [Actions Übersicht](./actions-overview) - Alle verfügbaren Actions
- 🔁 [Loops](./loops) - Wiederholte Ausführung
- 🎯 [Templating](./templating) - Dynamische Werte mit Handlebars
