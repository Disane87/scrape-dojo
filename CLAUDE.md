# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Scrape Dojo is a full-stack web scraping and browser automation platform. Users define scrapes declaratively using JSON/JSONC configurations. The platform executes them via Puppeteer with scheduling, secrets management, and real-time monitoring.

## Monorepo Structure

- **Build system**: Nx 22.3.3 with pnpm
- `apps/api/` — NestJS 11 backend (TypeScript, port 3000)
- `apps/ui/` — Angular 21 frontend (TypeScript, Vite, Tailwind CSS 4)
- `apps/docs/` — Astro Starlight documentation site (`de/` + `en/`)
- `libs/shared/` — Shared types/interfaces (`@scrape-dojo/shared` via tsconfig paths)
- `config/sites/` — Scrape configuration files (.jsonc)

## Common Commands

```bash
# Development (runs both API and UI)
pnpm start

# Individual apps
pnpm start:api          # NestJS backend
pnpm start:ui           # Angular frontend (proxies /api to localhost:3000)
pnpm start:api:debug    # API with Node inspector

# Build
pnpm build              # All apps
pnpm build:api
pnpm build:ui

# Testing
pnpm test               # All tests
pnpm test:api           # API tests only
pnpm test:ui            # UI tests only
pnpm test:watch         # Watch mode
pnpm test:e2e           # E2E tests
pnpm test:coverage      # Coverage report

# Linting
pnpm lint               # All projects
pnpm lint:fix           # Auto-fix

# Run a single test file (vitest)
npx nx test api -- --testPathPattern="path/to/file"

# Code generation
pnpm generate:types     # Generate action TypeScript types
pnpm create:schema      # Create JSON schema for scrapes
```

## Architecture

### Backend (NestJS API)

The API uses a modular NestJS architecture:

- **ScrapeModule** — Core orchestration: loads JSONC configs, manages runs/steps/actions, emits real-time events
- **ActionHandler** (`src/action-handler/`) — Pluggable action system with ~30 actions (navigate, click, type, extract, loop, transform, etc.). Each action is a separate file in `actions/`. New actions follow the factory pattern via `action.factory.ts`
- **DatabaseModule** — TypeORM with multi-DB support (SQLite via sql.js default, MySQL, PostgreSQL). Entities: Run, RunStep, RunAction, RunLog, ScrapeData, ScrapeSchedule, SecretEntity, VariableEntity, UserEntity
- **AuthModule** — JWT + local strategy, OIDC/SSO, MFA/TOTP, API keys. Auth is conditionally enabled via `SCRAPE_DOJO_AUTH_ENABLED` env var. JwtAuthGuard is registered as a global guard when auth is enabled
- **EventsModule** — Server-Sent Events for real-time scrape status updates to the UI
- **SecretsModule** — Encrypted at-rest storage using `SCRAPE_DOJO_ENCRYPTION_KEY`
- **PuppeteerService** — Manages headless Chrome instances with stealth plugin

Global middleware configured in `main.ts`: ValidationPipe (whitelist + transform), Helmet, CORS, rate limiting on auth endpoints.

API routes are all prefixed with `/api`: `/api/scrape`, `/api/auth/*`, `/api/secrets`, `/api/variables`, `/api/files`, `/api/health`, `/api/docs` (Swagger).

### Frontend (Angular UI)

- **State**: BehaviorSubject-based store service (`store/store.service.ts`)
- **i18n**: Transloco with English and German (`@jsverse/transloco`)
- **Styling**: Tailwind CSS 4 with Iconify icons
- **Auth**: Guards (authGuard, guestGuard, setupGuard) + HTTP interceptor for JWT
- **Real-time**: ScrapeEventsService subscribes to SSE from backend
- **Routing**: Uses named outlet `modal` for overlay routes (secrets, run dialog, settings, etc.)
- **Dev proxy**: `apps/ui/proxy.conf.json` routes `/api/*` to the backend

### Scrape Configuration

Scrapes are defined as JSONC files in `config/sites/`. Validated against `config/scrapes.schema.json`. Each scrape defines a sequence of actions (navigate, click, extract, loop, etc.) that Puppeteer executes.

### Communication Flow

- **Dev**: UI dev server proxies `/api/*` to NestJS backend
- **Production (Docker)**: Nginx serves Angular SPA, reverse proxies `/api` to API container
- Real-time updates flow via SSE from API EventsModule to UI ScrapeEventsService

## Code Conventions

- **Formatting**: Prettier — single quotes, trailing commas (`.prettierrc`)
- **Linting**: ESLint with @typescript-eslint + prettier plugin. **All new and changed code must be ESLint-conformant** — `npx nx lint api` and `npx nx lint ui` must pass with zero errors before committing. A pre-commit hook (lint-staged + husky) enforces this automatically.
- **ESLint rules to watch for**:
  - Do NOT use the `Function` type — use `(...args: any[]) => any` or `new (...args: any[]) => any` instead
  - Do NOT leave unused imports or variables — remove them or prefix with `_` if required by a signature
  - Do NOT use `require()` in TypeScript — use ES imports. If dynamic `require()` is unavoidable, add `// eslint-disable-next-line @typescript-eslint/no-require-imports`
  - Use `const` instead of `let` when the variable is never reassigned
  - Use LF line endings (not CRLF) — Prettier enforces this
- **Commits**: Conventional Commits enforced via semantic-release (feat, fix, docs, chore, etc.)
- **TypeScript**: Target ES2021, lenient settings (strictNullChecks=false, noImplicitAny=false)
- **File organization**: Feature-based NestJS modules with controllers/services/entities/dto subdirectories
- **Naming**: camelCase for functions/variables, PascalCase for classes/components

## Environment

Key env vars (see `.env.example` for full list):

- `SCRAPE_DOJO_ENCRYPTION_KEY` — Required, 256-bit hex key for secrets encryption
- `DB_TYPE` — sqlite (default), mysql, or postgres
- `SCRAPE_DOJO_AUTH_ENABLED` — Toggles authentication globally
- `SCRAPE_DOJO_PORT` — API port (default 3000)

## Docker

Multi-stage builds in `apps/api/Dockerfile` (based on puppeteer image with Chrome) and `apps/ui/Dockerfile` (nginx:alpine). Orchestrated via `docker-compose.yml`. Persistent volumes: `./data`, `./downloads`, `./logs`, `./config`, `./browser-data`.
