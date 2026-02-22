# Repository Guidelines

## Project Structure & Module Organization

- `app/` contains the Next.js App Router pages, layout, and global styles.
- `app/components/` contains reusable client components (e.g. `navbar.tsx`).
- `app/admin/` is the admin CRUD UI (token required).
- `public/` hosts static assets such as the MAQZONE logo.
- `backend/` contains the Go API (config, DB, migrations, HTTP handlers).
- `backend/cmd/api/` is the server entrypoint.
- `backend/internal/config/` loads env-based configuration.
- `backend/internal/db/` handles SQLite connection and Goose migrations.
- `backend/internal/db/sqlc/` holds the sqlc-style query layer (models, queries).
- `backend/internal/db/migrations/` stores Goose SQL migrations (schema + seed data).
- `backend/internal/httpapi/` contains HTTP routes, handlers, admin auth, and tests.
- `backend/db/queries/` stores the raw SQL queries for sqlc.
- `tests/e2e/` holds Playwright end-to-end tests.
- `scripts/` contains shell scripts for smoke tests (curl).
- Root config files include `tailwind.config.js`, `postcss.config.js`, and `next.config.js`.

## Build, Test, and Development Commands

All commands run via Docker:

- `docker compose up --build` runs frontend + backend in development mode.
- `docker compose -f docker-compose.prod.yml up --build -d` runs production build.
- API uses `ADMIN_TOKEN` env var for admin CRUD (`/api/admin/*`).
- Admin UI lives at `/admin`.

Testing (inside containers or CI):

- `go test ./... -v` runs Go API integration tests (from `backend/`).
- `npx playwright test` runs Playwright E2E tests.
- `bash scripts/curl-tests.sh` runs curl smoke tests.

## Coding Style & Naming Conventions

- Use TypeScript in `app/` and keep React components in `PascalCase`.
- Client components that use hooks must have `"use client"` directive.
- Tailwind utility classes are preferred over inline styles.
- Use Spanish UI copy to match current content.
- Go code uses standard library conventions, `zerolog` for logging.

## Testing Guidelines

- Playwright tests live in `tests/e2e` and follow `*.spec.ts` naming.
- Go integration tests live in `backend/internal/httpapi/` and follow `*_test.go` naming.
- Curl smoke tests are in `scripts/curl-tests.sh` and hit `/` and `/api/health`.

## Commit & Pull Request Guidelines

- Use `feat:`, `fix:`, `chore:` prefixes for commit messages.
- PRs should include a summary, screenshots for UI changes, and testing notes.

## Docker & Deployment

- `docker compose up --build` runs frontend + backend in Docker (dev).
- `docker compose -f docker-compose.prod.yml up --build -d` runs production.
- SQLite data persists in the `sqlite-data` volume.
- Backend container uses `backend/Dockerfile` and exposes `:8080`.
- Frontend container uses root `Dockerfile` and exposes `:3000`.
- Set `ADMIN_TOKEN` in `.env` before running production.
- `NEXT_PUBLIC_API_BASE` must be the public-facing backend URL (not internal Docker hostname).
- `API_BASE` is the internal backend URL for server-side rendering.
