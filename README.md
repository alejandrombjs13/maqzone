# MAQZONE

Plataforma SaaS de subastas y ventas directas de maquinaria pesada y equipos industriales para el mercado mexicano y LATAM.

## Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Go 1.23, chi router, SQLite (WAL mode), sqlc, Goose migrations
- **Infra**: Docker, Docker Compose

## Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env and set a secure ADMIN_TOKEN

# Development
docker compose up --build

# Production
docker compose -f docker-compose.prod.yml up --build -d
```

- Frontend: http://localhost
- API: http://localhost:8080
- Admin panel: http://localhost/admin

## Manual Setup

### Backend

```bash
cd backend
go mod download
SQLITE_PATH=./data/maqzone.db ADMIN_TOKEN=your_secret go run ./cmd/api
```

### Frontend

```bash
npm install
API_BASE=http://localhost:8080 NEXT_PUBLIC_API_BASE=http://localhost:8080 npm run dev
```

## API Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/auctions?limit=N` | List active auctions (default 20, max 100) |
| GET | `/api/auctions/:id` | Get auction by ID |
| GET | `/api/listings?limit=N` | List active listings (default 20, max 100) |
| GET | `/api/listings/:id` | Get listing by ID |

### Admin (requires `X-Admin-Token` header)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/auctions` | Create auction |
| PUT | `/api/admin/auctions/:id` | Update auction |
| DELETE | `/api/admin/auctions/:id` | Delete auction |
| POST | `/api/admin/listings` | Create listing |
| PUT | `/api/admin/listings/:id` | Update listing |
| DELETE | `/api/admin/listings/:id` | Delete listing |

### Auction JSON

```json
{
  "title": "Excavadora Komatsu PC210",
  "description": "Lote verificado con historial completo.",
  "location": "Saltillo, MX",
  "current_bid": 58000,
  "reserve_price": 75000,
  "status": "active",
  "end_time": "2026-12-31T23:59:59Z",
  "image_url": "https://images.unsplash.com/..."
}
```

### Listing JSON

```json
{
  "title": "Bulldozer D6T",
  "description": "Venta directa con inspección incluida.",
  "location": "Tijuana, MX",
  "price": 110000,
  "sale_type": "direct",
  "year": 2020,
  "status": "active",
  "image_url": "https://images.unsplash.com/..."
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Backend server port |
| `SQLITE_PATH` | `./data/maqzone.db` | SQLite database file path |
| `CORS_ALLOWED_ORIGINS` | (empty) | Comma-separated allowed origins |
| `CORS_ALLOW_ALL` | `true` | Allow all CORS origins |
| `ADMIN_TOKEN` | (empty) | Token for admin API endpoints |
| `LOG_LEVEL` | `info` | Zerolog log level |
| `API_BASE` | `http://localhost:8080` | Backend URL for SSR (server-side) |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:8080` | Backend URL for client-side fetch |

## Testing

```bash
# Go API integration tests
cd backend && go test ./... -v

# Next.js build check
npm run build

# Playwright E2E tests (requires dev server running)
npm run test:e2e

# Curl smoke tests (requires both servers running)
npm run test:curl
```

## Project Structure

```
maqzone/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── globals.css         # Tailwind + custom styles
│   ├── components/         # Client components (navbar)
│   └── admin/page.tsx      # Admin CRUD panel
├── backend/
│   ├── cmd/api/main.go     # Server entrypoint
│   ├── internal/
│   │   ├── config/         # Env-based config
│   │   ├── db/             # SQLite connection, migrations, sqlc
│   │   └── httpapi/        # HTTP routes, handlers, admin auth
│   └── Dockerfile
├── tests/e2e/              # Playwright tests
├── scripts/                # Shell smoke tests
├── docker-compose.yml      # Dev compose
├── docker-compose.prod.yml # Production compose
└── Dockerfile              # Frontend multi-stage
```
