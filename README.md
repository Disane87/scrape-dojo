<div align="center">

<img src="./apps/ui/public/logos/scrape-dojo-readme-logo.png" width="180" alt="Scrape Dojo Logo" />

# Scrape Dojo

_Declarative web scraping & browser automation with JSON workflows_

[![Version](https://img.shields.io/github/v/release/Disane87/scrape-dojo?style=for-the-badge&label=Version&color=f97316)](https://github.com/Disane87/scrape-dojo/releases)
[![GHCR](https://img.shields.io/badge/GHCR-Container-blue?style=for-the-badge&logo=github)](https://github.com/Disane87/scrape-dojo/pkgs/container/scrape-dojo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Docs](https://img.shields.io/badge/Docs-scrape--dojo.com-f97316?style=for-the-badge&logo=astro&logoColor=white)](https://scrape-dojo.com)

[![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Angular](https://img.shields.io/badge/Angular_21-DD0031?style=flat-square&logo=angular&logoColor=white)](https://angular.dev/)
[![Astro](https://img.shields.io/badge/Astro_5-BC52EE?style=flat-square&logo=astro&logoColor=white)](https://astro.build/)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?style=flat-square&logo=puppeteer&logoColor=white)](https://pptr.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Nx](https://img.shields.io/badge/Nx_22-143055?style=flat-square&logo=nx&logoColor=white)](https://nx.dev/)
[![pnpm](https://img.shields.io/badge/pnpm_10-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)

![GitHub Stars](https://img.shields.io/github/stars/Disane87/scrape-dojo?style=flat-square&logo=github)
![GitHub Issues](https://img.shields.io/github/issues/Disane87/scrape-dojo?style=flat-square&logo=github)
![CI](https://img.shields.io/github/actions/workflow/status/Disane87/scrape-dojo/ci.yml?style=flat-square&label=CI&logo=githubactions&logoColor=white)

</div>

---

> [!NOTE]
> **🤖 AI-Aided Development (AIAD)**
>
> This project openly uses AI-assisted development (e.g. [Claude Code](https://claude.ai/code)) to accelerate workflows, improve code quality, and gain more development momentum. All AI-generated code is **reviewed and approved by humans** — this is not a vibe-coding project, but a deliberate effort to build a useful product while exploring the boundaries, benefits, and trade-offs of AI-aided development.

---

## 🥷 What is Scrape Dojo?

Scrape Dojo is a self-hosted web scraping & browser automation platform. Instead of writing Puppeteer code for every site, you define workflows declaratively in **JSON/JSONC** — like Infrastructure-as-Code, but for scraping.

**Key capabilities:**

- ⚡ **25+ built-in actions** — navigate, click, type, extract, loop, download, screenshot, and more
- 🧩 **Handlebars + JSONata** — dynamic templates and powerful data transformations
- ⏰ **Cron scheduling** — automate scrapes with cron, webhooks, or startup triggers
- 🔐 **Encrypted secrets** — AES-256-CBC at-rest encryption for credentials
- 📡 **Real-time monitoring** — SSE-powered live execution tracking in Angular UI
- 🛡️ **Auth (optional)** — JWT, OIDC/SSO, MFA/TOTP, API keys
- 🗄️ **Multi-DB** — SQLite (default), MySQL, PostgreSQL

> [!IMPORTANT]
> Scrape Dojo automates real browser interactions. Please respect website terms of service and applicable legal frameworks.

**Full documentation: [scrape-dojo.com](https://scrape-dojo.com)**

---

## 🐳 Quick Start (Docker)

```bash
# 1. Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Create docker-compose.yml
cat <<'EOF' > docker-compose.yml
services:
  scrape-dojo:
    image: ghcr.io/disane87/scrape-dojo:latest
    ports:
      - '8080:80'
    environment:
      - SCRAPE_DOJO_ENCRYPTION_KEY=your_generated_key_here
      - SCRAPE_DOJO_AUTH_JWT_SECRET=your_random_jwt_secret_here
      - SCRAPE_DOJO_AUTH_REFRESH_TOKEN_SECRET=your_random_refresh_secret_here
      - DB_TYPE=sqlite
    volumes:
      - ./data:/home/pptruser/app/data
      - ./downloads:/home/pptruser/app/downloads
      - ./logs:/home/pptruser/app/logs
      - ./config:/home/pptruser/app/config
      - ./browser-data:/home/pptruser/app/browser-data
    restart: unless-stopped
EOF

# 3. Start
docker compose up -d
```

Open **http://localhost:8080** — UI and API on the same port.

> [!WARNING]
> The `SCRAPE_DOJO_ENCRYPTION_KEY` encrypts all secrets. Store it safely — if lost, existing secrets are unrecoverable.

For local development, environment variables, auth setup, and more: see the **[Quickstart Guide](https://scrape-dojo.com/de/getting-started/quickstart/)**.

---

## ⚡ Your First Scrape

Create `config/sites/my-first-scrape.jsonc`:

```jsonc
{
  "$schema": "../scrapes.schema.json",
  "scrapes": [
    {
      "id": "my-first-scrape",
      "metadata": {
        "description": "Read a page title",
        "triggers": [{ "type": "manual" }],
      },
      "steps": [
        {
          "name": "Main",
          "actions": [
            {
              "name": "open",
              "action": "navigate",
              "params": { "url": "https://example.com" },
            },
            {
              "name": "title",
              "action": "extract",
              "params": { "selector": "h1" },
            },
            {
              "name": "log",
              "action": "logger",
              "params": { "message": "Title: {{previousData.title}}" },
            },
          ],
        },
      ],
    },
  ],
}
```

The scrape auto-appears in the UI (hot reload). Click **Run** or use the API:

```bash
curl http://localhost:8080/api/scrape/my-first-scrape
```

---

## 📖 Documentation

Everything else lives in the docs:

| Topic                           | Link                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------- |
| 🚀 Quickstart (Docker & Source) | [Getting Started](https://scrape-dojo.com/de/getting-started/quickstart/)       |
| 📐 Config format & metadata     | [Configuration](https://scrape-dojo.com/de/user-guide/config-format/)           |
| ⚡ All 22 actions with examples | [Actions Reference](https://scrape-dojo.com/de/user-guide/actions/)             |
| 🧩 Templates & JSONata          | [Templates](https://scrape-dojo.com/de/user-guide/templates/)                   |
| ⏰ Scheduling & triggers        | [Scheduling](https://scrape-dojo.com/de/user-guide/scheduling/)                 |
| 🔐 Secrets & variables          | [Secrets & Variables](https://scrape-dojo.com/de/user-guide/secrets-variables/) |
| ⚙️ Environment variables        | [Env Reference](https://scrape-dojo.com/de/developer/environment-variables/)    |
| 🏗️ Architecture & API           | [Developer Guide](https://scrape-dojo.com/de/developer/)                        |
| 🛡️ Auth (JWT/OIDC/MFA)          | [Authentication](https://scrape-dojo.com/de/developer/authentication/)          |
| 💡 Full examples                | [Examples](https://scrape-dojo.com/de/examples/)                                |

---

## 🛠️ Development

```bash
git clone https://github.com/disane87/scrape-dojo.git && cd scrape-dojo
pnpm install
cp .env.example .env  # Set SCRAPE_DOJO_ENCRYPTION_KEY
pnpm start            # API (3000) + UI (4200)
pnpm test             # All tests
```

| Command         | What it does         |
| --------------- | -------------------- |
| `pnpm start`    | API + UI dev servers |
| `pnpm test`     | All tests            |
| `pnpm test:api` | API tests only       |
| `pnpm test:ui`  | UI tests only        |
| `pnpm lint`     | Lint all projects    |
| `pnpm build`    | Build all apps       |

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.).

---

## 🤝 Contributing

- 🐛 **Issues & bugs**: [GitHub Issues](https://github.com/Disane87/scrape-dojo/issues)
- 💡 **Feature requests**: [New Issue](https://github.com/Disane87/scrape-dojo/issues/new)
- 🔀 **Pull requests**: Fork → branch → commit → PR

---

## 📄 License

[MIT](LICENSE) — use it however you like.

---

## 🌟 Contributors

<!-- readme: contributors -start -->
<a href="https://github.com/Disane87/scrape-dojo/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Disane87/scrape-dojo" alt="Contributors" />
</a>
<!-- readme: contributors -end -->

---

<div align="center">

Made with ❤️ by [Marco Franke](https://github.com/Disane87)

**[Documentation](https://scrape-dojo.com)** · **[Issues](https://github.com/Disane87/scrape-dojo/issues)** · **[Discussions](https://github.com/Disane87/scrape-dojo/discussions)**

</div>
