---
sidebar_position: 4
---

# Testing

## Unit Tests

```bash
# Alle Tests
pnpm test

# Nur API
pnpm test:api

# Nur UI
pnpm test:ui

# Mit Coverage
pnpm test:coverage

# Watch Mode
pnpm test:watch
```

## E2E Tests

```bash
pnpm test:e2e
```

## Test-Struktur

```text
apps/api/src/**/__tests__/    # Unit Tests
test/                          # E2E Tests
```

## Beispiel Unit Test

```typescript
describe('ScrapeService', () => {
  it('should execute a simple scrape', async () => {
    const result = await service.run('test-scrape');
    expect(result.status).toBe('success');
  });
});
```

## Beispiel E2E Test

```typescript
describe('Scrapes API', () => {
  it('/api/scrapes (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/scrapes')
      .expect(200);
  });
});
```

## CI/CD

Tests laufen automatisch bei jedem Push via GitHub Actions.
