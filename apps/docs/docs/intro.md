---
sidebar_position: 1
slug: /
---

# Willkommen bei Scrape Dojo! 🥋

Hey! Schön, dass du hier bist! 👋

Hast du jemals stundenlang Puppeteer-Code geschrieben, nur um Daten von einer einzigen Website zu scrapen? Oder musstest du denselben Code für zehn verschiedene Seiten duplizieren und anpassen? Dann kennst du den Schmerz! 😅

**Scrape Dojo** ist hier, um dir das Leben leichter zu machen. Stell dir vor, du könntest deine Web-Scraping-Workflows einfach in JSON beschreiben - so wie du deine Infrastruktur als Code definierst. Kein Copy-Paste mehr, keine hundert Zeilen Boilerplate pro Website. Nur klare, deklarative Workflows! 🎯

## Das Problem

Web Scraping ist mächtig, aber oft auch frustrierend:

```javascript
// Kennst du das? 😩
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  
  await page.type('#email', 'user@example.com');
  await page.type('#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  const data = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.item')).map(item => ({
      title: item.querySelector('.title').textContent,
      price: item.querySelector('.price').textContent
    }));
  });
  
  await browser.close();
  console.log(data);
})();
```

**Und dann?** Du brauchst dasselbe für eine andere Website... copy-paste, anpassen, testen, debuggen. Und was ist mit Secrets? Logging? Error Handling? Scheduling? 😰

## Die Lösung

Mit Scrape Dojo wird daraus:

```json
{
  "id": "my-scrape",
  "steps": [
    {
      "name": "Login",
      "actions": [
        {"action": "navigate", "params": {"url": "https://example.com"}},
        {"action": "type", "params": {"selector": "#email", "text": "{{secrets.email}}"}},
        {"action": "type", "params": {"selector": "#password", "text": "{{secrets.password}}"}},
        {"action": "click", "params": {"selector": "button[type=submit]"}}
      ]
    },
    {
      "name": "Extract",
      "actions": [
        {
          "action": "extract",
          "params": {
            "selector": ".item",
            "extractAll": true,
            "properties": {
              "title": ".title",
              "price": ".price"
            }
          }
        }
      ]
    }
  ]
}
```

**Das war's!** 🎉 Secrets sind verschlüsselt, Logging ist automatisch, die UI zeigt dir alles in Echtzeit!

## Warum Scrape Dojo?

### 🎯 Für Nutzer

Du musst **kein Puppeteer-Profi** sein! Schreib einfach eine JSON-Datei, die beschreibt, was du tun willst:

- 🌐 "Gehe zu URL X"
- 🖱️ "Klicke auf Button Y"
- 📋 "Extrahiere Daten Z"
- 💾 "Lade PDF herunter"

Scrape Dojo kümmert sich um den Rest! Browser starten, Fehlerbehandlung, Timeouts, Screenshots - alles dabei! 📦

### 🎨 Für Power-User

Du brauchst mehr? Kein Problem!

- 🔁 **Loops**: Verarbeite Arrays, extrahiere hunderte Produkte
- 🎯 **Bedingungen**: "Nur wenn Preis < 50€"
- 🔄 **Transformationen**: JSONata für komplexe Datenverarbeitung
- 🎭 **Templates**: Handlebars für dynamische Workflows
- 🔐 **Secrets**: Verschlüsselte Passwörter & API-Keys

### 💼 Für Unternehmen

Production-ready aus der Box:

- 🔒 **Enterprise Auth**: JWT, OIDC/SSO, MFA/TOTP
- 📊 **Monitoring**: Live-Logs, Run-Historie, Statistiken
- 🐳 **Docker Ready**: docker-compose up - fertig!
- 🗄️ **Multi-DB**: SQLite, PostgreSQL, MySQL, MSSQL
- 👥 **Multi-User**: Team-Workflows mit User-Management

## Was kannst du damit machen?

Die Möglichkeiten sind endlos! Hier ein paar Ideen:

### 📄 Rechnungen automatisch herunterladen

Jeden Monat PDFs von verschiedenen Portalen sammeln? Lass Scrape Dojo das machen!

```json
{
  "schedule": "0 0 1 * *",  // Jeden 1. des Monats
  "actions": [
    // Login, zu Rechnungen navigieren, PDFs downloaden
  ]
}
```

### 📊 Preise überwachen

Produkt beobachten und Alarm bei Preisänderung?

```json
{
  "actions": [
    {"action": "extract", "params": {"selector": ".price"}},
    {"action": "condition", "params": {
      "condition": "{{lt previousData.price 99.99}}",
      "actions": [/* Benachrichtigung senden */]
    }}
  ]
}
```

### 🔍 Daten aggregieren

Informationen von mehreren Quellen sammeln und konsolidieren?

```json
{
  "actions": [
    // Website A scrapen
    // Website B scrapen
    {"action": "transform", "params": {/* Daten kombinieren */}}
  ]
}
```

### 🤖 E2E-Tests

Ja, du kannst Scrape Dojo auch für automatisierte Tests nutzen!

## Die Kernfeatures

### 📋 Deklarativ statt imperativ

```json
// Du sagst WAS, nicht WIE
{"action": "extract", "params": {"selector": "h1"}}
```

Scrape Dojo kümmert sich um: Browser starten, Seite laden, Element finden, Text extrahieren, Error Handling, Cleanup. Du definierst nur, **was** passieren soll! 🎯

### 🔄 Mächtiger Datenfluss

Jede Action kann auf vorherige Ergebnisse zugreifen:

```handlebars
{{previousData.ExtractTitle}}  // Ergebnis von "ExtractTitle"
{{currentData.loop.value}}     // Aktuelles Loop-Element
{{variables.year}}             // Konfigurationsvariable
{{secrets.password}}           // Verschlüsseltes Secret
```

### 🎨 Moderne UI

Vergiss Command Line! Die Angular-basierte UI bietet:

- 📊 Dashboard mit Übersicht
- 🚀 One-Click Scrape-Start
- 👀 Live-Monitoring während der Ausführung
- 📝 Detaillierte Logs & Fehleranalyse
- 📈 Run-Historie & Statistiken
- ⚙️ Secrets & Variablen Management

### 🔐 Security First

- 🔒 **AES-256-GCM** Verschlüsselung für Secrets
- 🔑 **JWT** Authentication
- 🌐 **OIDC/SSO** für Enterprise
- 📱 **MFA/TOTP** für zusätzliche Sicherheit
- 🔐 **API Keys** für Headless-Zugriff

:::warning Verantwortung
⚠️ Scrape Dojo automatisiert echte Browser-Interaktionen. Bitte respektiere:
- Website Terms of Service
- robots.txt
- Rate Limits
- Datenschutzgesetze (DSGVO, etc.)

Mit großer Macht kommt große Verantwortung! 🦸
:::

## Für wen ist Scrape Dojo?

### ✅ Perfekt für dich, wenn du...

- 📊 Regelmäßig Daten von Websites sammeln musst
- 📄 Dokumente automatisch herunterladen willst
- 🔄 Repetitive Browser-Tasks automatisieren möchtest
- 🎯 Keine Lust auf Copy-Paste von Puppeteer-Code hast
- 🏢 Ein Team-Tool für Web Scraping suchst
- 🧪 E2E-Tests mit echten Browser-Interaktionen brauchst

### 🤔 Vielleicht nicht, wenn du...

- 📱 Mobile Apps scrapen willst (Scrape Dojo ist für Websites)
- ⚡ Millisekunden-Performance brauchst (echte Browser sind langsamer als HTTP-Clients)
- 🎮 Komplexe JavaScript-Games automatisieren möchtest
- 📺 Streaming-Inhalte aufnehmen willst (dafür gibt's andere Tools)

## Los geht's! 🚀

Bereit, dein erstes Scraping-Projekt zu starten?

1. 📦 **Installation**: [Installiere Scrape Dojo](./getting-started/installation) - Docker oder lokal, du entscheidest!
2. 🎯 **Quickstart**: [Deine erste Scrape in 5 Minuten](./getting-started/quickstart) - Von Null zur ersten funktionierenden Scrape!
3. 📚 **Deep Dive**: [Verstehe die Konzepte](./getting-started/first-scrape) - Wie alles zusammenspielt
4. 💡 **Beispiele**: [Lerne von echten Use Cases](./examples/simple-scrape) - Von simpel bis komplex

## Brauchst du Hilfe?

Kein Problem! Wir sind für dich da:

- 📖 **Diese Docs**: Alles, was du wissen musst, findest du hier
- 🐛 **GitHub Issues**: [Bug gefunden? Lass es uns wissen!](https://github.com/disane87/scrape-dojo/issues)
- 💬 **Discussions**: [Fragen? Ideen? Austausch!](https://github.com/disane87/scrape-dojo/discussions)
- 📧 **Email**: [mfranke87@icloud.com](mailto:mfranke87@icloud.com)

## Was kommt als Nächstes?

Die Entwicklung von Scrape Dojo geht weiter! Geplant sind:

- 🔌 **Plugin System**: Eigene Actions als NPM-Packages
- 📅 **Advanced Scheduling**: Cron-Jobs direkt in der UI
- 📊 **Analytics Dashboard**: Visualisierung deiner Scraping-Daten
- 🔔 **Notifications**: Slack, Discord, Email-Integration
- 🌍 **Cloud Version**: Managed Scrape Dojo as a Service

Hast du eine Idee? [Erzähl uns davon!](https://github.com/disane87/scrape-dojo/discussions)

---

**Jetzt aber genug geredet - Zeit zum Loslegen!** 🚀

👉 [Zur Installation](./getting-started/installation) | [Zum Quickstart](./getting-started/quickstart) | [Beispiele ansehen](./examples/simple-scrape)