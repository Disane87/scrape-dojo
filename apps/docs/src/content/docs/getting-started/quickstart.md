---
title: Schnellstart
description: Erste Schritte mit Scrape Dojo
---

## Installation

### Mit Docker (empfohlen)

```bash
docker-compose up -d
```

Die API läuft dann auf `http://localhost:3000` und die UI auf `http://localhost:4200`.

### Lokale Entwicklung

#### Voraussetzungen

- Node.js >= 20
- pnpm

#### Installation

```bash
# Dependencies installieren
pnpm install

# API starten
pnpm nx serve api

# UI starten (in neuem Terminal)
pnpm nx serve ui
```

## Deine erste Scrape-Konfiguration

Erstelle eine JSON-Datei in `config/sites/meine-seite.json`:

```json
{
  "name": "Meine erste Scrape",
  "url": "https://example.com",
  "actions": [
    {
      "type": "navigate",
      "url": "{{url}}"
    },
    {
      "type": "extract",
      "selector": "h1",
      "variable": "title"
    }
  ]
}
```

## Nächste Schritte

- [Architektur verstehen](/scrape-dojo/getting-started/architecture/)
- [Actions Übersicht](/scrape-dojo/user-guide/actions-overview/)
- [Beispiele ansehen](/scrape-dojo/examples/simple-scrape/)
