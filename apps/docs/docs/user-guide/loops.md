---
sidebar_position: 4
---

# Loops

Wiederhole Actions für jedes Element in einem Array.

## Grundlagen

```json
{
  "name": "ProcessItems",
  "action": "loop",
  "params": {
    "items": "{{previousData.ItemList}}"
  },
  "actions": [
    {
      "name": "LogItem",
      "action": "logger",
      "params": {
        "message": "Item {{currentData.ProcessItems.index}}: {{currentData.ProcessItems.value}}"
      }
    }
  ]
}
```

## currentData

- `{{currentData.LoopName.value}}` - Aktuelles Element
- `{{currentData.LoopName.index}}` - Index (0-basiert)

## Beispiele

### Produkte verarbeiten

```json
{
  "actions": [
    {
      "name": "GetProducts",
      "action": "extract",
      "params": {
        "selector": ".product",
        "extractAll": true,
        "properties": {
          "name": ".name",
          "price": ".price"
        }
      }
    },
    {
      "name": "ProcessProducts",
      "action": "loop",
      "params": {
        "items": "{{previousData.GetProducts}}"
      },
      "actions": [
        {
          "name": "LogProduct",
          "action": "logger",
          "params": {
            "message": "Product: {{currentData.ProcessProducts.value.name}} - €{{currentData.ProcessProducts.value.price}}"
          }
        }
      ]
    }
  ]
}
```

### PDFs herunterladen

```json
{
  "name": "DownloadInvoices",
  "action": "loop",
  "params": {
    "items": "{{previousData.InvoiceUrls}}"
  },
  "actions": [
    {
      "name": "Download",
      "action": "download",
      "params": {
        "url": "{{currentData.DownloadInvoices.value}}",
        "filename": "invoice-{{currentData.DownloadInvoices.index}}.pdf"
      }
    }
  ]
}
```

### Verschachtelte Loops

```json
{
  "name": "ProcessCategories",
  "action": "loop",
  "params": {
    "items": "{{previousData.Categories}}"
  },
  "actions": [
    {
      "name": "ProcessProducts",
      "action": "loop",
      "params": {
        "items": "{{currentData.ProcessCategories.value.products}}"
      },
      "actions": [
        {
          "name": "LogProduct",
          "action": "logger",
          "params": {
            "message": "Cat {{currentData.ProcessCategories.index}}, Prod {{currentData.ProcessProducts.index}}: {{currentData.ProcessProducts.value.name}}"
          }
        }
      ]
    }
  ]
}
```

Mehr: [Data Flow](./data-flow)

