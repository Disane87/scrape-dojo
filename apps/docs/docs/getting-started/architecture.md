---
sidebar_position: 3
---

# Architektur

Verstehe wie Scrape Dojo aufgebaut ist und wie die Komponenten zusammenarbeiten.

## System-Übersicht

```mermaid
graph TB
    UI[Angular UI<br/>Port 3000/8080]
    API[NestJS API<br/>Port 3333/3030]
    DB[(Database<br/>SQLite/Postgres)]
    Browser[Puppeteer<br/>Headless Chrome]
    Files[File System<br/>Downloads/Logs]
    
    UI -->|REST API| API
    API -->|TypeORM| DB
    API -->|Controls| Browser
    API -->|Writes| Files
    Browser -->|Downloads| Files
```

## Komponenten

### 1. Frontend (Angular)

**Zweck**: Benutzeroberfläche zum Verwalten und Überwachen von Scrapes

**Features**:
- 📋 Scrape-Übersicht und Management
- 🚀 Scrape-Ausführung mit Live-Monitoring
- 📊 Run-Historie und Logs
- 🔐 Secrets & Variablen Management
- 👤 User Management (wenn Auth aktiviert)

**Technologien**:
- Angular 21
- Angular Material
- Monaco Editor (für Config-Bearbeitung)
- Server-Sent Events (SSE) für Live-Updates

### 2. Backend (NestJS)

**Zweck**: API-Server und Scrape-Engine

**Module**:

```text
api/
├── scrapes/          # Scrape Management
├── runner/           # Execution Engine
├── actions/          # Action Implementations
├── auth/             # Authentication & Authorization
├── secrets/          # Secrets Management
├── database/         # Database Entities
└── sse/             # Server-Sent Events
```

**Technologien**:
- NestJS Framework
- TypeORM (Database)
- Puppeteer (Browser Control)
- Handlebars (Templating)
- JSONata (Transformations)
- Passport (Authentication)

### 3. Shared Library

**Zweck**: Gemeinsame Types und Interfaces

```text
libs/shared/
├── types/
│   ├── scrape.types.ts
│   ├── action.types.ts
│   └── auth.types.ts
└── utils/
```

Beide Apps (UI & API) nutzen dieselben Types → Type-Safety! ✨

## Datenbankschema

### Entities

```mermaid
erDiagram
    User ||--o{ ScrapeRun : creates
    User ||--o{ Secret : owns
    ScrapeRun ||--|{ RunLog : has
    ScrapeRun ||--o{ RunEvent : has
    
    User {
        string id PK
        string email
        string password
        string displayName
        boolean mfaEnabled
    }
    
    Secret {
        string id PK
        string key
        string encryptedValue
        string userId FK
    }
    
    ScrapeRun {
        string id PK
        string scrapeId
        string status
        json result
        timestamp startedAt
        timestamp finishedAt
        string userId FK
    }
    
    RunLog {
        string id PK
        string level
        string message
        timestamp timestamp
        string runId FK
    }
```

### Unterstützte Datenbanken

- ✅ SQLite (Standard, gut für Development)
- ✅ PostgreSQL (Empfohlen für Production)
- ✅ MySQL/MariaDB
- ✅ MSSQL

## Request Flow

### Scrape-Ausführung

```mermaid
sequenceDiagram
    participant UI
    participant API
    participant Runner
    participant Puppeteer
    participant DB
    
    UI->>API: POST /scrapes/{id}/run
    API->>DB: Create ScrapeRun
    API->>Runner: Execute Scrape
    Runner->>Puppeteer: Launch Browser
    
    loop For each Action
        Runner->>Puppeteer: Execute Action
        Puppeteer-->>Runner: Result
        Runner->>DB: Log Event
        Runner->>API: SSE Update
        API->>UI: SSE Stream
    end
    
    Runner->>DB: Update Run Status
    Runner->>Puppeteer: Close Browser
    Runner-->>API: Final Result
    API-->>UI: Response
```

## Datenfluss

### Action Execution

```mermaid
graph LR
    A[Config geladen] --> B[Variablen aufgelöst]
    B --> C[Secrets entschlüsselt]
    C --> D[Template gerendert]
    D --> E[Action ausgeführt]
    E --> F[Result gespeichert]
    F --> G[previousData aktualisiert]
```

### Template Rendering

Jedes Action-Param wird durch Handlebars geparst:

```javascript
// Input
"{{secrets.email}}"

// Prozess
1. Secrets aus DB laden
2. Verschlüsselung aufheben
3. Template rendern
4. Ergebnis verwenden

// Output
"user@example.com"
```

## Sicherheit

### Secrets Encryption

```mermaid
graph LR
    A[Plain Secret] --> B[AES-256-GCM]
    B --> C[Encrypted + IV + Tag]
    C --> D[Stored in DB]
    
    D --> E[Load from DB]
    E --> F[Decrypt with Key]
    F --> G[Plain Secret]
```

**Wichtig**: 
- 🔑 Encryption Key = `SCRAPE_DOJO_ENCRYPTION_KEY`
- ⚠️ Key ändern = Secrets unbrauchbar
- 🔒 Key nie committen!

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant API
    participant DB
    
    User->>UI: Login
    UI->>API: POST /auth/login
    API->>DB: Verify Credentials
    DB-->>API: User Data
    API->>API: Generate JWT
    API-->>UI: JWT Token
    UI->>UI: Store in LocalStorage
    
    UI->>API: Request + Authorization Header
    API->>API: Verify JWT
    API-->>UI: Protected Data
```

## File System Layout

```text
scrape-dojo/
├── apps/
│   ├── api/              # Backend
│   │   ├── src/
│   │   └── dist/         # Build output
│   ├── ui/               # Frontend
│   │   ├── src/
│   │   └── dist/         # Build output
│   └── docs/             # Documentation
│
├── config/
│   ├── scrapes.schema.json
│   └── sites/            # Scrape configs
│       ├── amazon.jsonc
│       └── ...
│
├── data/                 # Database files (SQLite)
├── downloads/            # Downloaded files
├── logs/                 # Application logs
└── browser-data/         # Puppeteer cache
```

## Performance Optimierungen

### Browser Management

- **Browser-Pooling**: Wiederverwendung von Browser-Instanzen
- **Headless Mode**: Kein GUI = schneller
- **Resource Limiting**: Memory & CPU Grenzen

### Caching

- **Static Assets**: UI-Assets werden gecached
- **API Responses**: Conditional requests
- **Browser Cache**: Browser-Daten persistent

## Skalierung

### Horizontal Scaling

Mehrere API-Instanzen parallel:

```yaml
# docker-compose.scale.yml
services:
  api:
    deploy:
      replicas: 3
```

**Beachte**:
- Shared Database notwendig
- Shared File System für Downloads
- Load Balancer vor API

### Limits

Aktuelle Empfehlungen:

| Resource | Dev | Production |
|----------|-----|------------|
| RAM | 2GB | 4GB+ |
| CPU | 2 Cores | 4+ Cores |
| Disk | 5GB | 20GB+ |
| Concurrent Scrapes | 1-2 | 3-5 |

## Nächste Schritte

- 🔐 [Authentication](../advanced/authentication) - Auth konfigurieren
- ⚙️ [Environment Variables](../advanced/environment-variables) - Alle Settings
- 💻 [Project Structure](../developer/project-structure) - Code-Organisation
