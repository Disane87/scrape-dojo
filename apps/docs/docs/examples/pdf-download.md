---
sidebar_position: 3
---

# PDF Download

PDFs automatisch herunterladen.

## Config

```json
{
  "id": "pdf-download",
  "metadata": {
    "description": "Download invoices as PDF",
    "version": "1.0.0",
    "variables": {
      "year": "2025"
    }
  },
  "steps": [
    {
      "name": "Login",
      "actions": [
        {
          "name": "Navigate",
          "action": "navigate",
          "params": {
            "url": "https://example.com/login"
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
        },
        {
          "name": "WaitForDashboard",
          "action": "waitForSelector",
          "params": {
            "selector": ".dashboard"
          }
        }
      ]
    },
    {
      "name": "DownloadInvoices",
      "actions": [
        {
          "name": "GoToInvoices",
          "action": "navigate",
          "params": {
            "url": "https://example.com/invoices"
          }
        },
        {
          "name": "GetInvoiceLinks",
          "action": "extract",
          "params": {
            "selector": ".invoice-link",
            "extractAll": true,
            "properties": {
              "id": { "selector": "", "attribute": "data-id" },
              "url": { "selector": "", "attribute": "href" }
            }
          }
        },
        {
          "name": "DownloadLoop",
          "action": "loop",
          "params": {
            "items": "{{previousData.GetInvoiceLinks}}"
          },
          "actions": [
            {
              "name": "Download",
              "action": "download",
              "params": {
                "url": "{{currentData.DownloadLoop.value.url}}",
                "filename": "invoice-{{variables.year}}-{{currentData.DownloadLoop.value.id}}.pdf",
                "directory": "invoices"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Secrets Setup

`.env`:
```env
SCRAPE_DOJO_SECRET_EMAIL=user@example.com
SCRAPE_DOJO_SECRET_PASSWORD=your-password
```

## Ergebnis

Downloads landen in `./downloads/invoices/`:
- `invoice-2025-123.pdf`
- `invoice-2025-456.pdf`
- ...

Mehr: [Secrets & Variablen](../user-guide/secrets-variables)
