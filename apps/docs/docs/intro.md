---
sidebar_position: 1
---

# Einführung

Willkommen bei **Scrape Dojo** - einem leistungsstarken Web Scraping Framework!

## Erste Schritte

Beginnen Sie mit der **Erstellung Ihres ersten Scrapers**.

### Was Sie benötigen

- [Node.js](https://nodejs.org/en/download/) Version 18.0 oder höher
- [pnpm](https://pnpm.io/) als Package Manager
- Grundlegende Kenntnisse in JavaScript/TypeScript

## Schnellstart

Installieren Sie die Abhängigkeiten:

```bash
pnpm install
```

Starten Sie die Entwicklungsserver:

```bash
pnpm nx serve api
pnpm nx serve ui
```

## Projektstruktur

Das Projekt ist ein Nx Monorepo mit folgender Struktur:

- `apps/api` - NestJS Backend API
- `apps/ui` - Angular Frontend
- `apps/docs` - Docusaurus Dokumentation (diese Seite)
- `config/sites` - Scraper-Konfigurationen
- `libs/shared` - Gemeinsam genutzte Bibliotheken

## Nächste Schritte

Lernen Sie, wie Sie [einen Scraper erstellen](./tutorial-basics/create-a-scraper.md).
