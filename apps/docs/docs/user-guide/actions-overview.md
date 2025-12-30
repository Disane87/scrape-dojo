---
sidebar_position: 3
---

# Actions Übersicht

Alle verfügbaren Actions in Scrape Dojo mit Beispielen.

## Navigation

### navigate

Navigiere zu einer URL.

```json
{
  "name": "GoToPage",
  "action": "navigate",
  "params": {
    "url": "https://example.com",
    "waitUntil": "networkidle0"  // Optional
  }
}
```

**Parameter**:
- `url` (string): Ziel-URL
- `waitUntil` (optional): `load` | `domcontentloaded` | `networkidle0` | `networkidle2`

## Interaktion

### click

Klicke auf ein Element.

```json
{
  "name": "ClickButton",
  "action": "click",
  "params": {
    "selector": "button.submit",
    "waitForNavigation": true  // Optional
  }
}
```

### type

Text in ein Input-Feld eingeben.

```json
{
  "name": "EnterEmail",
  "action": "type",
  "params": {
    "selector": "#email",
    "text": "{{secrets.email}}",
    "delay": 100  // Optional: ms zwischen Zeichen
  }
}
```

### select

Option in einem Dropdown wählen.

```json
{
  "name": "SelectCountry",
  "action": "select",
  "params": {
    "selector": "#country",
    "value": "DE"
  }
}
```

## Datenextraktion

### extract

DOM-Elemente extrahieren.

```json
// Einzelnes Element
{
  "name": "GetTitle",
  "action": "extract",
  "params": {
    "selector": "h1",
    "attribute": "textContent"  // Optional, default: textContent
  }
}

// Mehrere Elemente
{
  "name": "GetProducts",
  "action": "extract",
  "params": {
    "selector": ".product",
    "extractAll": true,
    "properties": {
      "name": ".product-name",
      "price": ".product-price",
      "image": { 
        "selector": "img",
        "attribute": "src"
      }
    }
  }
}
```

**Rückgabe**:
- Single: String oder `null`
- Multiple: Array von Objekten

## Datenverarbeitung

### transform

JSONata Transformationen.

```json
{
  "name": "CleanData",
  "action": "transform",
  "params": {
    "data": "{{previousData.RawProducts}}",
    "expression": "$map($, function($v) { {'name': $uppercase($v.name), 'price': $number($v.price)} })"
  }
}
```

### logger

Nachrichten loggen.

```json
{
  "name": "LogInfo",
  "action": "logger",
  "params": {
    "level": "info",  // debug | info | warn | error
    "message": "Processing item {{currentData.loop.index}}"
  }
}
```

## Control Flow

### loop

Über ein Array iterieren.

```json
{
  "name": "ProcessItems",
  "action": "loop",
  "params": {
    "items": "{{previousData.ItemList}}"
  },
  "actions": [
    // Actions hier
  ]
}
```

### condition

Bedingte Ausführung.

```json
{
  "name": "CheckPrice",
  "action": "condition",
  "params": {
    "condition": "{{gt previousData.Price 100}}",
    "actions": [
      // Wird ausgeführt wenn condition = true
    ],
    "elseActions": [
      // Optional: Wird ausgeführt wenn condition = false
    ]
  }
}
```

### wait

Warten (in Millisekunden).

```json
{
  "name": "WaitForLoad",
  "action": "wait",
  "params": {
    "duration": 2000  // 2 Sekunden
  }
}
```

### waitForSelector

Warte auf ein Element.

```json
{
  "name": "WaitForButton",
  "action": "waitForSelector",
  "params": {
    "selector": "button.submit",
    "timeout": 5000  // Optional, default: 30000
  }
}
```

## Downloads & Files

### download

Datei herunterladen.

```json
{
  "name": "DownloadPDF",
  "action": "download",
  "params": {
    "url": "https://example.com/file.pdf",
    "filename": "invoice-{{variables.orderId}}.pdf",
    "directory": "invoices"  // Optional, relativ zu downloads/
  }
}
```

### screenshot

Screenshot erstellen.

```json
{
  "name": "TakeScreenshot",
  "action": "screenshot",
  "params": {
    "filename": "page-{{timestamp}}.png",
    "fullPage": true  // Optional, default: false
  }
}
```

## Browser Control

### reload

Seite neu laden.

```json
{
  "name": "RefreshPage",
  "action": "reload",
  "params": {
    "waitUntil": "networkidle0"
  }
}
```

### back / forward

Browser-Navigation.

```json
{
  "name": "GoBack",
  "action": "back"
}

{
  "name": "GoForward",
  "action": "forward"
}
```

### scroll

Scrollen.

```json
{
  "name": "ScrollDown",
  "action": "scroll",
  "params": {
    "x": 0,
    "y": 1000
  }
}
```

## Erweitert

### executeScript

JavaScript im Browser ausführen.

```json
{
  "name": "RunCustomJS",
  "action": "executeScript",
  "params": {
    "script": "return document.querySelectorAll('.item').length;"
  }
}
```

:::warning Vorsicht
Nur verwenden wenn keine andere Action passt! Kann Sicherheitsrisiken haben.
:::

### setCookie

Cookie setzen.

```json
{
  "name": "SetAuthCookie",
  "action": "setCookie",
  "params": {
    "name": "session",
    "value": "{{secrets.sessionToken}}",
    "domain": "example.com"
  }
}
```

## Vollständige Liste

Für die vollständige, aktuelle Liste mit allen Parametern:

```bash
curl http://localhost:3333/api/actions/metadata
```

Oder besuche die [API-Dokumentation](http://localhost:3333/api).

## Nächste Schritte

- 🔁 [Loops](./loops) - Iteration im Detail
- 🎯 [Templating](./templating) - Dynamische Parameter
- 💡 [Beispiele](../examples/simple-scrape) - Praktische Anwendungen
