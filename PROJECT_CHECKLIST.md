# Project Checklist

## Frontend (Next.js + Tailwind)
- [x] Initialize Next.js app structure (`app/`, `public/`)
- [x] Configure Tailwind (`tailwind.config.js`, `postcss.config.js`, `app/globals.css`)
- [x] Build main landing layout with SaaS positioning (`app/page.tsx`)
- [x] Add logo asset (`public/maqzone-logo.jpg`)
- [x] Add app metadata (`app/layout.tsx`)
- [x] Connect frontend to backend API (with fallback)
- [x] Add data-driven components for auctions/listings from API
- [x] Add admin CRUD UI (`/admin`)
- [x] Add responsive mobile hamburger menu (`app/components/navbar.tsx`)

## Docker & Ops
- [x] Dockerfile (multi-stage: dev/build/prod)
- [x] `docker-compose.yml` for dev
- [x] Persist SQLite via Docker volume (`sqlite-data`)
- [x] Add `.dockerignore`
- [x] Add `.env.example` for `SQLITE_PATH`
- [x] Add backend Dockerfile
- [x] Add backend service to compose
- [x] Add production compose/service (`docker-compose.prod.yml`)
- [x] Add healthcheck endpoint
- [x] Add Docker healthcheck
- [x] Add `.gitignore`

## Testing
- [x] Playwright config (`playwright.config.ts`)
- [x] E2E tests (`tests/e2e/home.spec.ts`)
- [x] Curl smoke tests (`scripts/curl-tests.sh`)
- [x] Go API integration tests (`backend/internal/httpapi/server_test.go`)

## Backend (Go 1.23 + SQLite + sqlc)
- [x] Create backend skeleton (`backend/`)
- [x] Add migrations (`backend/db/migrations`)
- [x] Seed data migration
- [x] Define SQL queries (`backend/db/queries/*.sql`)
- [x] Add sqlc config (`backend/sqlc.yaml`)
- [x] Add manual sqlc stubs (`backend/internal/db/sqlc/*`)
- [x] Add DB connection + migrations runner
- [x] Add HTTP server with routes (auctions, listings)
- [x] Add JSON handlers + validation
- [x] Add CORS + logging + graceful shutdown
- [x] Add config via env (`SQLITE_PATH`, `PORT`)
- [x] Add production binary build in Docker
- [x] Add admin CRUD routes (token protected)
- [x] Add image_url fields and seed images
- [x] Fix CORS to allow PUT/DELETE methods and X-Admin-Token header

## Docs
- [x] `AGENTS.md` updated with current structure and commands
- [x] Add README with setup + API docs
