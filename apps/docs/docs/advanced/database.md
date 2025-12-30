---
sidebar_position: 3
---

# Database

Konfiguration verschiedener Datenbanken.

## SQLite (Standard)

Am einfachsten für Development:

```env
DB_TYPE=sqlite
DB_DATABASE=./data/scrape-dojo.db
```

Vorteile:
- ✅ Keine separate DB nötig
- ✅ File-basiert
- ✅ Perfekt für Dev

Nachteile:
- ❌ Nicht für Production empfohlen
- ❌ Keine Concurrent Writes

## PostgreSQL (Empfohlen)

Beste Wahl für Production:

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=scrape_dojo
DB_PASSWORD=secure-password
DB_DATABASE=scrape_dojo
```

Setup:
```sql
CREATE DATABASE scrape_dojo;
CREATE USER scrape_dojo WITH PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE scrape_dojo TO scrape_dojo;
```

## MySQL/MariaDB

```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=scrape_dojo
DB_PASSWORD=secure-password
DB_DATABASE=scrape_dojo
```

## MSSQL

```env
DB_TYPE=mssql
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=YourStrong@Passw0rd
DB_DATABASE=scrape_dojo
```

## Migrations

Migrations laufen automatisch beim Start.

Manuell:
```bash
pnpm nx run api:migration:run
```

## Backup

### SQLite

```bash
cp data/scrape-dojo.db data/backup-$(date +%Y%m%d).db
```

### PostgreSQL

```bash
pg_dump -U scrape_dojo scrape_dojo > backup.sql
```

## Nächste Schritte

- ⚙️ [Environment Variables](./environment-variables)
- 🔐 [Authentication](./authentication)
