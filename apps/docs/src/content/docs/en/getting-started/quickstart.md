---
title: Quick Start
description: Get started with Scrape Dojo
---

## Installation

### Using Docker (recommended)

```bash
docker-compose up -d
```

The API will run on `http://localhost:3000` and the UI on `http://localhost:4200`.

### Local Development

#### Prerequisites

- Node.js >= 20
- pnpm

#### Installation

```bash
# Install dependencies
pnpm install

# Start API
pnpm nx serve api

# Start UI (in new terminal)
pnpm nx serve ui
```

## Your First Scrape Configuration

Create a JSON file in `config/sites/my-site.json`:

```json
{
  "name": "My first scrape",
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

## Next Steps

- [Understand the Architecture](/getting-started/architecture/)
- [Actions Overview](/user-guide/actions-overview/)
- [View Examples](/examples/simple-scrape/)
