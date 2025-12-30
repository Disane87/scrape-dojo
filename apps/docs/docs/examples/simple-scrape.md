---
sidebar_position: 1
---

# Simple Scrape

Einfaches Beispiel zum Extrahieren von Daten.

## Config

```json
{
  "$schema": "../scrapes.schema.json",
  "scrapes": [
    {
      "id": "simple-scrape",
      "metadata": {
        "description": "Extract title and description from example.com",
        "version": "1.0.0"
      },
      "steps": [
        {
          "name": "ExtractData",
          "actions": [
            {
              "name": "Navigate",
              "action": "navigate",
              "params": {
                "url": "https://example.com"
              }
            },
            {
              "name": "GetTitle",
              "action": "extract",
              "params": {
                "selector": "h1"
              }
            },
            {
              "name": "GetDescription",
              "action": "extract",
              "params": {
                "selector": "p"
              }
            },
            {
              "name": "LogResults",
              "action": "logger",
              "params": {
                "message": "Title: {{previousData.GetTitle}}, Description: {{previousData.GetDescription}}"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Ausführung

```bash
curl -X POST http://localhost:3333/api/scrapes/simple-scrape/run
```

## Ergebnis

```json
{
  "status": "success",
  "result": {
    "GetTitle": "Example Domain",
    "GetDescription": "This domain is for use in illustrative examples..."
  }
}
```
