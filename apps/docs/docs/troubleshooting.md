---
sidebar_position: 1
---

# Troubleshooting

Häufige Probleme und Lösungen.

## Puppeteer startet nicht

**Problem**: Browser binary nicht gefunden

**Lösung**:
```bash
pnpm install
npx puppeteer browsers install chrome
```

## Secrets können nicht entschlüsselt werden

**Problem**: `SCRAPE_DOJO_ENCRYPTION_KEY` wurde geändert

**Lösung**:
- Alten Key wiederherstellen ODER
- Alle Secrets neu erstellen

## CORS Errors

**Problem**: UI kann nicht mit API kommunizieren

**Lösung** (.env):
```env
SCRAPE_DOJO_CORS_ORIGIN=https://your-domain.com
SCRAPE_DOJO_TRUST_PROXY=1
```

## Auth funktioniert nicht

**Lösung**:
```bash
# Logs prüfen
docker-compose logs api

# Auth status
curl http://localhost:3333/api/auth/status
```

## Element nicht gefunden

**Problem**: `Selector '.xyz' not found`

**Lösungen**:
1. `waitForSelector` verwenden
2. `wait` Action vor extract
3. Selector in DevTools testen

## Performance Probleme

**Lösungen**:
- Headless mode nutzen
- `networkidle0` vermeiden
- Nur nötige Daten extrahieren
- Browser-Cache leeren

## Logs analysieren

```bash
# Docker
docker-compose logs -f api

# Lokal
# Logs in ./logs/
```

## Support

- 📬 [GitHub Issues](https://github.com/disane87/scrape-dojo/issues)
- 📧 Email: mfranke87@icloud.com
