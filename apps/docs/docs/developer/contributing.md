---
sidebar_position: 1
---

# Contributing

Danke, dass du Scrape Dojo verbessern möchtest! 🎉

## Wie kannst du beitragen?

- 🐛 **Bugs melden**: [Issues](https://github.com/disane87/scrape-dojo/issues)
- ✨ **Features vorschlagen**: [Feature Requests](https://github.com/disane87/scrape-dojo/issues/new)
- 💻 **Code beitragen**: Pull Requests willkommen!
- 📚 **Docs verbessern**: Tippfehler, Klarheit, Beispiele

## Development Setup

```bash
# 1. Fork & clone
git clone https://github.com/<dein-username>/scrape-dojo.git
cd scrape-dojo

# 2. Dependencies
pnpm install

# 3. Environment
cp .env.example .env
# SCRAPE_DOJO_ENCRYPTION_KEY setzen!

# 4. Dev servers
pnpm start

# 5. Tests
pnpm test
```

## Commit Messages

Wir nutzen [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add scroll action
fix: prevent crash on missing selector
docs: update README examples
chore: update dependencies
```

## Pull Request Process

1. 🌿 Branch erstellen (`git checkout -b feature/amazing-feature`)
2. ✏️ Changes committen (`git commit -m 'feat: add amazing feature'`)
3. 🚀 Branch pushen (`git push origin feature/amazing-feature`)
4. 📬 Pull Request öffnen

## Code Style

- TypeScript für alle neuen Files
- ESLint Regeln befolgen
- Prettier für Formatting
- Tests für neue Features

## Nächste Schritte

- 💻 [Project Structure](./project-structure)
- 🧪 [Testing](./testing)
- 🎨 [Creating Actions](./creating-actions)
