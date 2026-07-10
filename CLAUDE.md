# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start development server (localhost:3000)
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm type-check   # TypeScript type checking (tsc --noEmit)
pnpm setup-db     # Initialize Neon PostgreSQL schema
```

There are no automated tests in this project.

## Architecture

This is a Next.js 14 app (App Router) that delivers AI-generated surf reports for St. Augustine, FL. The live site is `canisurf.today`.

### Data Flow

```
Browser → /api/surf-report (GET)
           ├── Cache hit (< 8h old) → return cached DB row immediately
           └── Cache miss → fetch /api/surfability → POST to Bun AI service → save to DB → return
```

**Cron job** (`/api/admin/request-forecast`, 4× daily): clears the DB cache, then calls the Bun service to pre-generate a fresh report so user requests are always served from cache.

### Key architectural decision: Bun AI service

Report generation is **not done inside Next.js**. The `BUN_SERVICE_URL` env var points to a separately deployed Bun runtime (hosted on Coolify) that calls OpenAI and saves the report to the DB. The Next.js `surf-report` route only calls the Bun service; if the Bun service is unavailable, it falls back to a local text-template (`createDetailedFallbackReport`).

### External data sources (all in `/api/surfability/route.ts`)

- **Open-Meteo Marine API** — wave height (m→ft), wave period, swell direction, sea surface temperature
- **Open-Meteo Weather API** — air temp, wind speed (m/s→knots), wind direction, weather code
- **NOAA Tides API (station 8720587)** — current tide height, hi/lo predictions

`/api/surfability` will 503 if any real data source fails; it has no fallback estimates (strict by design).

### Frontend

`page.tsx` (server component) → `SurfAppClient.tsx` (client component) → `useSurfReportOptimized` hook (TanStack Query) → `/api/surf-report`

The hook is configured with aggressive caching (`staleTime: 30m`, no auto-refetch) because reports only update via cron. `SurfReportCard` renders the raw AI-generated text as a large prose block.

### Database

Neon PostgreSQL (`@neondatabase/serverless`). Single table: `surf_reports`. All DB functions are in `src/app/lib/db.ts`. The `getCachedReport` function fetches the most recent row for a location regardless of `cached_until` — the 8-hour staleness check is done in the route handler.

### Environment variables required

| Variable | Purpose |
|---|---|
| `NEON_DATABASE_URL` | Neon PostgreSQL connection string |
| `BUN_SERVICE_URL` | URL of external Bun AI generation service |
| `BUN_API_SECRET` | Auth token sent to Bun service |
| `CRON_SECRET` | Bearer token required by `/api/admin/request-forecast` |
| `NEXT_PUBLIC_API_URL` | Base URL for internal self-calls (optional, falls back to host header) |

### What's in the codebase but not active

`useSurfReport.ts` is superseded by `useSurfReportOptimized.ts`. The `StatusCard`, `WeatherHeader`, `SurfDetails`, `TideCard`, and animation components exist but are unused in the main UI. The PWA service worker (`public/sw.js`) and manifest exist but the install/notification flows are not wired up.
