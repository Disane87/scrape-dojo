---
sidebar_position: 1
---

# Einen Scraper erstellen

Lernen Sie, wie Sie Ihren ersten Web Scraper mit Scrape Dojo erstellen.

## Scraper-Konfiguration

Scraper werden über JSON-Dateien im Verzeichnis `config/sites/` konfiguriert.

### Beispiel-Konfiguration

```json
{
  "name": "example-scraper",
  "url": "https://example.com",
  "selectors": {
    "title": "h1",
    "content": ".main-content"
  }
}
```

## Scraper ausführen

Verwenden Sie die API, um einen Scraper zu starten:

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"siteName": "example-scraper"}'
```

## Nächste Schritte

- Erkunden Sie erweiterte Selektoren
- Konfigurieren Sie Daten-Transformationen
- Implementieren Sie Custom Actions
