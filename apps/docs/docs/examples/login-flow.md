---
sidebar_position: 4
---

# Login Flow

Vollständiger Login mit MFA.

## Config

```json
{
  "id": "login-with-mfa",
  "metadata": {
    "description": "Login with email, password and TOTP",
    "version": "1.0.0"
  },
  "steps": [
    {
      "name": "Authentication",
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
          "name": "ClickLogin",
          "action": "click",
          "params": {
            "selector": "button[type=submit]"
          }
        },
        {
          "name": "WaitForMFA",
          "action": "waitForSelector",
          "params": {
            "selector": "#totp-code",
            "timeout": 10000
          }
        },
        {
          "name": "GenerateTOTP",
          "action": "totp",
          "params": {
            "secret": "{{secrets.totpSecret}}"
          }
        },
        {
          "name": "EnterTOTP",
          "action": "type",
          "params": {
            "selector": "#totp-code",
            "text": "{{previousData.GenerateTOTP}}"
          }
        },
        {
          "name": "SubmitMFA",
          "action": "click",
          "params": {
            "selector": "button.verify"
          }
        },
        {
          "name": "WaitForDashboard",
          "action": "waitForSelector",
          "params": {
            "selector": ".dashboard"
          }
        },
        {
          "name": "LogSuccess",
          "action": "logger",
          "params": {
            "level": "info",
            "message": "Successfully logged in!"
          }
        }
      ]
    }
  ]
}
```

## Secrets

`.env`:
```env
SCRAPE_DOJO_SECRET_EMAIL=user@example.com
SCRAPE_DOJO_SECRET_PASSWORD=secure-password
SCRAPE_DOJO_SECRET_TOTP_SECRET=JBSWY3DPEHPK3PXP
```

Mehr: [Secrets & Variablen](../user-guide/secrets-variables)
