# 🤝 Contributing to Scrape Dojo

Thanks for your interest in contributing! Here's how to get started.

## 🛠️ Development Setup

1. **Prerequisites**: Node.js 20+, pnpm 10+, Docker (optional)

2. **Clone and install**:
   ```bash
   git clone https://github.com/Disane87/scrape-dojo.git
   cd scrape-dojo
   pnpm install
   ```

3. **Environment**: Copy `.env.example` to `.env` and adjust values

4. **Run locally**:
   ```bash
   pnpm nx serve api    # Backend (NestJS)
   pnpm nx serve ui     # Frontend (Angular)
   ```

## 💡 How to Contribute

### 🐛 Reporting Bugs

- Use the [Bug Report template](https://github.com/Disane87/scrape-dojo/issues/new?template=bug_report.yml)
- Include reproduction steps, expected vs. actual behavior, and environment details

### ✨ Suggesting Features

- Use the [Feature Request template](https://github.com/Disane87/scrape-dojo/issues/new?template=feature_request.yml)
- Describe the use case, not just the solution

### 🔀 Pull Requests

1. Fork the repo and create a branch from `main`
2. Follow existing code style (ESLint + Prettier are configured)
3. Write meaningful commit messages
4. Keep PRs focused — one feature or fix per PR
5. Update documentation if your change affects user-facing behavior
6. Ensure all existing tests pass

### 🌿 Branch Naming

- `feat/short-description` — ✨ new features
- `fix/short-description` — 🐛 bug fixes
- `docs/short-description` — 📚 documentation
- `refactor/short-description` — ♻️ code improvements

## 📁 Project Structure

```
apps/
  api/          # NestJS backend
  ui/           # Angular frontend
  docs/         # Astro documentation site
libs/           # Shared libraries
config/         # Scrape configuration files
```

## 📜 Code of Conduct

By participating, you agree to our [Code of Conduct](CODE_OF_CONDUCT.md).

## ❓ Questions?

Open a [Discussion](https://github.com/Disane87/scrape-dojo/discussions) for questions or ideas.
