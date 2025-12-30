---
sidebar_position: 2
---

# Project Structure

## Monorepo Layout

```text
scrape-dojo/
├── apps/
│   ├── api/              # NestJS Backend
│   ├── ui/               # Angular Frontend
│   └── docs/             # Docusaurus Docs
├── libs/
│   └── shared/           # Shared Types
├── config/               # Scrape Configs
├── downloads/            # Downloaded Files
├── data/                 # Database
├── logs/                 # Application Logs
└── browser-data/         # Puppeteer Cache
```

## Backend (API)

```text
apps/api/src/
├── main.ts              # Entry Point
├── app.module.ts        # Root Module
├── scrapes/             # Scrape Management
│   ├── scrapes.controller.ts
│   ├── scrapes.service.ts
│   └── dto/
├── runner/              # Execution Engine
│   ├── runner.service.ts
│   └── action-executor.ts
├── actions/             # Action Implementations
│   ├── navigate.action.ts
│   ├── click.action.ts
│   └── extract.action.ts
├── auth/                # Authentication
├── secrets/             # Secrets Management
└── database/            # TypeORM Entities
```

## Frontend (UI)

```text
apps/ui/src/
├── app/
│   ├── features/
│   │   ├── scrapes/
│   │   ├── runs/
│   │   └── auth/
│   ├── shared/
│   │   ├── components/
│   │   ├── services/
│   │   └── guards/
│   └── core/
```

## Shared Library

```text
libs/shared/
├── src/
│   ├── types/
│   │   ├── scrape.types.ts
│   │   ├── action.types.ts
│   │   └── auth.types.ts
│   └── utils/
```

## Build Outputs

```text
dist/
├── apps/
│   ├── api/             # NestJS Production Build
│   └── ui/              # Angular Production Build
```

## Nächste Schritte

- 🧪 [Testing](./testing)
- 📚 [API Reference](./api-reference)
- 🎨 [Creating Actions](./creating-actions)
