---
sidebar_position: 2
---

# Scraping Workflow Visualisierung

Mit Mermaid-Diagrammen können Sie Ihre Scraping-Workflows visuell darstellen.

## Basis Scraping Flow

```mermaid
graph TB
    A[Start] --> B[Load Configuration]
    B --> C{Valid Config?}
    C -->|Yes| D[Launch Browser]
    C -->|No| E[Error: Invalid Config]
    D --> F[Navigate to URL]
    F --> G[Wait for Selectors]
    G --> H[Extract Data]
    H --> I{More Pages?}
    I -->|Yes| J[Next Page]
    J --> G
    I -->|No| K[Save Results]
    K --> L[Close Browser]
    L --> M[End]
    E --> M
    
    style A fill:#fb923c
    style M fill:#22c55e
    style E fill:#ef4444
    style K fill:#eab308
```

## Scraper Architektur

```mermaid
graph LR
    UI[Angular UI] -->|HTTP Request| API[NestJS API]
    API --> Config[Config Service]
    API --> Queue[Job Queue]
    Queue --> Worker[Scraper Worker]
    Worker --> Browser[Puppeteer Browser]
    Browser --> Target[Target Website]
    Worker --> Storage[Data Storage]
    Storage --> Files[(JSON Files)]
    
    style UI fill:#fb923c
    style API fill:#ea580c
    style Worker fill:#f97316
    style Browser fill:#eab308
```

## Daten-Pipeline

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant API
    participant Scraper
    participant Browser
    participant Storage
    
    User->>UI: Start Scraping
    UI->>API: POST /api/scrape
    API->>Scraper: Initialize Job
    Scraper->>Browser: Launch
    Browser->>Browser: Navigate to URL
    Browser->>Scraper: Page Loaded
    Scraper->>Browser: Execute Selectors
    Browser-->>Scraper: Return Data
    Scraper->>Storage: Save Results
    Storage-->>Scraper: Confirm
    Scraper-->>API: Job Complete
    API-->>UI: Return Results
    UI-->>User: Display Data
```

## Fehlerbehandlung

```mermaid
graph TD
    A[Execute Action] --> B{Success?}
    B -->|Yes| C[Next Action]
    B -->|No| D{Retry Count < Max?}
    D -->|Yes| E[Wait & Retry]
    E --> A
    D -->|No| F[Log Error]
    F --> G{Critical Error?}
    G -->|Yes| H[Abort Scraping]
    G -->|No| I[Skip & Continue]
    
    style C fill:#22c55e
    style H fill:#ef4444
    style I fill:#eab308
```

## Status-Diagramm

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Queued: Start Job
    Queued --> Running: Worker Available
    Running --> Extracting: Browser Ready
    Extracting --> Saving: Data Extracted
    Saving --> Completed: Save Success
    Running --> Failed: Error Occurred
    Extracting --> Failed: Selector Failed
    Saving --> Failed: Storage Error
    Failed --> [*]
    Completed --> [*]
    
    note right of Running
        Browser launched
        Page loading
    end note
    
    note right of Extracting
        Executing selectors
        Processing data
    end note
```

## Nächste Schritte

Diese Diagramme helfen Ihnen, die Scraping-Logik zu verstehen und zu planen. Passen Sie sie an Ihre eigenen Workflows an!
