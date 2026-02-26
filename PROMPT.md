# PROMPT.md — Always-Active Instructions

> These instructions are applied to every Claude Code session in this project.

## Communication

- Always respond in **German** when talking to the user.
- All code, comments, commit messages, documentation, and file content must be in **English**.
- Keep responses concise — no filler, no over-explaining obvious things.

## Before Writing Code

- **Read before editing**: Always read the relevant files before making changes. Understand the existing patterns.
- **Check for existing solutions**: Before creating new utilities, helpers, or components, search if something similar already exists in the codebase.
- **Respect the architecture**: Follow the existing module/feature structure. Don't introduce new patterns without discussing them first.

## Code Quality Checklist

After making changes, always verify:

1. **No unused imports** — Remove any imports that are no longer needed.
2. **Consistent formatting** — Follow Prettier config (single quotes, trailing commas).
3. **Type safety** — Use proper TypeScript types from `@scrape-dojo/shared` where applicable.
4. **No hardcoded values** — Use environment variables, constants, or config files.
5. **No console.log left behind** — Use the proper NestJS Logger on the backend.
6. **Run code-simplifier** — After completing a feature or significant change, always run the `code-simplifier` agent on the modified code to ensure clarity, consistency, and maintainability.

## Keep It Small and Maintainable

- **Minimal code**: Write the least amount of code necessary to solve the problem. Every line must earn its place.
- **Small functions**: Functions should do one thing. If a function is longer than ~30 lines, consider splitting it.
- **Small files**: If a file grows beyond ~200-300 lines, evaluate whether it should be split into smaller, focused modules.
- **No premature abstraction**: Don't abstract until there's a clear, repeated pattern. Three copies is better than one bad abstraction.
- **Readable over clever**: Favor straightforward, boring code over clever one-liners that are hard to understand.
- **Delete dead code**: Remove unused functions, variables, and commented-out code. Don't leave "just in case" code around.

## Git & Commits

- Use **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.
- Keep commits atomic — one logical change per commit.
- Never commit `.env`, secrets, or `node_modules`.
- Always check `git status` and `git diff` before committing.

## Development Workflow

- After code changes, suggest running relevant tests if they exist (`pnpm test:api` or `pnpm test:ui`).
- After modifying shared types in `libs/shared/`, remind to run `pnpm generate:types` or `pnpm create:schema` if action types or scrape schemas were affected.
- When adding a new action in `apps/api/src/action-handler/actions/`, also register it in the action factory.

## Error Handling

- Backend: Use NestJS exceptions (`HttpException`, `BadRequestException`, etc.) — not raw `throw new Error()`.
- Frontend: Use proper error handling in services; display user-friendly messages via the UI notification system.
- Always handle the unhappy path, not just the success case.

## Security

- Never expose secrets or encryption keys in logs or responses.
- Sanitize user input at API boundaries.
- Use parameterized queries — never concatenate SQL strings.

## File Organization

- Backend features go into their own NestJS module under `apps/api/src/`.
- Frontend features are organized by Angular component/service structure under `apps/ui/src/app/`.
- Shared types/interfaces belong in `libs/shared/src/`.
- Scrape configurations go into `config/sites/` as `.jsonc` files.

## Documentation

### Astro Docs (`apps/docs/`)

Every feature, API change, or new action **must** be documented in the Astro Starlight docs site at `apps/docs/`.

- **Content lives in**: `apps/docs/src/content/docs/de/` (German, primary) and `apps/docs/src/content/docs/en/` (English).
- **Format**: `.mdx` files with Starlight frontmatter (`title`, `description`, `sidebar`).
- **What to document**:
  - New features or actions → add/update the relevant page under `user-guide/` or `user-guide/actions/`.
  - API changes → update `api/reference.mdx`.
  - Architecture changes → update the relevant page under `architecture/`.
  - New environment variables → update `developer/environment-variables.mdx`.
  - New examples → add to `examples/`.
- **Both languages**: Always update the German docs (`de/`). Update English (`en/`) if the corresponding page exists there.
- **Timing**: Documentation is part of the feature — not an afterthought. Create the docs in the same session as the code change.

### Memory & Project Files

- **CLAUDE.md**, **PROMPT.md**, and other `.md` files in the project root or `.claude/` directory may be updated at any time to reflect new learnings, patterns, or conventions.
- When a new convention or architectural decision is established during a session, proactively suggest updating the relevant `.md` file.
- Keep documentation in sync with the actual codebase — outdated docs are worse than no docs.

## When in Doubt

- Ask before making architectural decisions.
- Ask before deleting files or making breaking changes.
- Prefer small, reviewable changes over large rewrites.
