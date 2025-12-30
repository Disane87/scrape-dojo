---
sidebar_position: 1
---

# Quickstart - In 5 Minuten zur ersten Scrape! ⚡

Du möchtest **sofort loslegen**? Perfekt! In 5 Minuten hast du deine erste funktionierende Scrape! 🚀

## Schritt 1: Installation ⚙️

Wähle deinen bevorzugten Weg:

### 🐳 Docker (Empfohlen - 2 Minuten)

```bash
# Projekt klonen
git clone https://github.com/disane87/scrape-dojo.git
cd scrape-dojo

# .env einrichten
cp .env.example .env

# WICHTIG: Encryption Key setzen!
# Öffne .env und setze: SCRAPE_DOJO_ENCRYPTION_KEY=mein-super-sicherer-key-123
```

```bash
# Starten
docker-compose up -d
```

**Das war's!** 🎉 Scrape Dojo läuft auf:
- UI: http://localhost:8080
- API: http://localhost:3030

### 💻 Lokal (Entwickler - 5 Minuten)

```bash
# Projekt klonen
git clone https://github.com/disane87/scrape-dojo.git
cd scrape-dojo

# Dependencies installieren
pnpm install

# .env einrichten
cp .env.example .env
# SCRAPE_DOJO_ENCRYPTION_KEY setzen!

# Dev-Server starten
pnpm start
```

**Fertig!** UI läuft auf http://localhost:3000

:::tip Tipp
Du kannst auch nur einzelne Teile starten:
- `pnpm start:api` - Nur die API
- `pnpm start:ui` - Nur die UI
- `pnpm start:docs` - Nur diese Docs
:::

## Schritt 2: Erste Scrape erstellen 📝

Öffne http://localhost:8080 (oder :3000 bei lokaler Installation).

### 2.1 Scrape-Datei anlegen

Erstelle eine neue Datei: `config/sites/my-first-scrape.json`

```json
{
  "id": "wikipedia-scrape",
  "description": "Extrahiert den Haupttitel von Wikipedia",
  "steps": [
    {
      "name": "Wikipedia öffnen",
      "actions": [
        {
          "action": "navigate",
          "params": {
            "url": "https://www.wikipedia.org"
          }
        }
      ]
    },
    {
      "name": "Titel extrahieren",
      "actions": [
        {
          "action": "extract",
          "params": {
            "selector": ".central-textlogo",
            "waitForSelector": true,
            "property": "textContent"
          }
        }
      ]
    }
  ]
}
```

### 2.2 In der UI ausführen

1. 🔄 **Refresh** in der UI (die neue Scrape sollte erscheinen)
2. ▶️ **Klick auf "Run"** neben "wikipedia-scrape"
3. 👀 **Watch the magic!** Du siehst:
   - Live-Logs während der Ausführung
   - Browser-Screenshots
   - Extrahierte Daten
   - Erfolgs-/Fehlermeldungen

**Glückwunsch!** 🎉 Du hast deine erste Scrape erfolgreich ausgeführt!

## Schritt 3: Mach es interessanter! 🔥

Lass uns ein **realistischeres Beispiel** bauen - Produkte von einer E-Commerce-Seite extrahieren:

```json
{
  "id": "product-scraper",
  "description": "Extrahiert Produktinfos von example.com",
  "steps": [
    {
      "name": "Zur Produktseite",
      "actions": [
        {
          "action": "navigate",
          "params": {
            "url": "https://books.toscrape.com"
          }
        }
      ]
    },
    {
      "name": "Alle Bücher extrahieren",
      "actions": [
        {
          "action": "extract",
          "params": {
            "selector": "article.product_pod",
            "extractAll": true,
            "properties": {
              "title": "h3 a",
              "price": ".price_color",
              "availability": ".availability",
              "rating": {
                "selector": "p.star-rating",
                "property": "className"
              }
            }
          }
        }
      ]
    },
    {
      "name": "Daten transformieren",
      "actions": [
        {
          "action": "transform",
          "params": {
            "expression": "$map(previousData['Alle Bücher extrahieren'], function($book) { { 'title': $book.title, 'price': $number($replace($book.price, '£', '')), 'inStock': $contains($book.availability, 'In stock'), 'stars': $book.rating ~> /star-rating (\\w+)/ ? $1 : 'Unknown' } })"
          }
        }
      ]
    }
  ]
}
```

**Was macht das?** 📚

1. ✅ Navigiert zu books.toscrape.com (eine Demo-Website zum Üben)
2. ✅ Extrahiert **alle** Bücher mit Titel, Preis, Verfügbarkeit und Rating
3. ✅ **Transformiert** die Daten:
   - Entfernt £-Zeichen aus Preisen
   - Wandelt Preise in Zahlen um
   - Extrahiert Sternebewertung aus der CSS-Klasse
   - Prüft ob "In stock"

**Output:**
```json
[
  {
    "title": "A Light in the Attic",
    "price": 51.77,
    "inStock": true,
    "stars": "Three"
  },
  {
    "title": "Tipping the Velvet",
    "price": 53.74,
    "inStock": true,
    "stars": "One"
  }
  // ... weitere Bücher
]
```

## Schritt 4: Mit Secrets arbeiten 🔐

Für echte Websites brauchst du oft Login-Daten. **Niemals hartcodieren!**

### 4.1 Secret in UI anlegen

1. Gehe zu **Settings** (⚙️) in der UI
2. Tab **Secrets**
3. Erstelle ein Secret:
   - Key: `email`
   - Value: `deine@email.com`

### 4.2 In Scrape verwenden

```json
{
  "id": "login-scrape",
  "steps": [
    {
      "name": "Login",
      "actions": [
        {
          "action": "navigate",
          "params": {"url": "https://example.com/login"}
        },
        {
          "action": "type",
          "params": {
            "selector": "input[name='email']",
            "text": "{{secrets.email}}"
          }
        },
        {
          "action": "type",
          "params": {
            "selector": "input[name='password']",
            "text": "{{secrets.password}}"
          }
        },
        {
          "action": "click",
          "params": {"selector": "button[type='submit']"}
        }
      ]
    }
  ]
}
```

**Secrets werden:**
- 🔒 **AES-256-GCM** verschlüsselt in der DB gespeichert
- 🔑 Nur zur Laufzeit entschlüsselt
- 🚫 **Niemals** in Logs angezeigt (erscheinen als `***`)

## Schritt 5: Loops für viele Items 🔁

Du willst durch eine Liste iterieren? **Loops** sind dein Freund!

```json
{
  "id": "multi-page-scraper",
  "variables": {
    "pages": [1, 2, 3, 4, 5]
  },
  "steps": [
    {
      "name": "Durch Seiten loopen",
      "actions": [
        {
          "action": "loop",
          "params": {
            "loopArray": "{{variables.pages}}",
            "actions": [
              {
                "action": "navigate",
                "params": {
                  "url": "https://books.toscrape.com/catalogue/page-{{currentData.loop.value}}.html"
                }
              },
              {
                "action": "extract",
                "params": {
                  "selector": "article.product_pod",
                  "extractAll": true,
                  "properties": {
                    "title": "h3 a",
                    "price": ".price_color"
                  }
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

**Was passiert?**
- Loop über Array `[1, 2, 3, 4, 5]`
- Für jede Zahl: Navigiere zu Seite X
- Extrahiere Produkte von **allen 5 Seiten**
- Ergebnis: Kombinierte Daten von allen Seiten! 🎯

## Was du jetzt kannst! 🎓

Nach diesem Quickstart kannst du:

- ✅ Scrape Dojo installieren & starten
- ✅ Einfache Scrapes in JSON schreiben
- ✅ Daten von Websites extrahieren
- ✅ Mit Secrets sicher arbeiten
- ✅ Loops für mehrere Items nutzen
- ✅ Daten mit JSONata transformieren

## Nächste Schritte 🚀

Bereit für mehr? Check diese aus:

1. 📚 **[Scrape-Konfiguration verstehen](../user-guide/scrape-configuration)** - Alle Optionen im Detail
2. 🎯 **[Actions Übersicht](../user-guide/actions-overview)** - Alle verfügbaren Actions (30+!)
3. 🔄 **[Datenfluss verstehen](../user-guide/data-flow)** - Wie `previousData` & Co. funktionieren
4. 💡 **[Mehr Beispiele](../examples/simple-scrape)** - Von simpel bis komplex
5. 🔐 **[Authentication Deep Dive](../advanced/authentication)** - Login-Flows meistern

:::tip Pro-Tipp
Schau dir die **[Beispiele](../examples/simple-scrape)** an! Sie zeigen echte Use Cases:
- 📄 PDFs automatisch herunterladen
- 🔐 Login-Flows mit 2FA
- 🔁 Komplexe Loops & Bedingungen
- 📊 Daten-Aggregation
:::

## Brauchst du Hilfe? 🆘

Stuck? Kein Problem!

- 📖 **Diese Docs** - Alles im Detail erklärt
- 🐛 **[GitHub Issues](https://github.com/disane87/scrape-dojo/issues)** - Bugs & Feature Requests
- 💬 **[Discussions](https://github.com/disane87/scrape-dojo/discussions)** - Community-Hilfe
- 📧 **Email**: mfranke87@icloud.com

---

**Viel Spaß beim Scrapen!** 🥋✨
