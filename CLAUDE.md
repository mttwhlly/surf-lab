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
pnpm test         # Vitest: route-handler/unit tests (external calls mocked)
pnpm test:watch   # Vitest in watch mode
pnpm test:e2e     # Playwright: e2e smoke tests (spins up pnpm dev)
```

### Testing

Baseline suite covering the golden paths: home page, a `[slug]` location page, `/api/surf-report` (cache-hit and cache-miss), `/api/og`.

- **Vitest** (`tests/unit/`) tests route-handler logic in isolation — `@/lib/db` and `fetch` are mocked, so no real DB/network calls happen.
- **Playwright** (`tests/e2e/`) drives a real `pnpm dev` server in a browser. The `/api/surf-report` client fetch is intercepted with `page.route` to avoid exercising the live generation chain (surfability → Bun AI service → DB write); server-side reads of the DB cache (in `[slug]/page.tsx`) are real, so `.env.local` must be present locally. Not wired into CI yet.
- `/api/og`'s e2e test is `test.fixme()` — the route currently crashes on every request in dev (tracked in [#36](https://github.com/mttwhlly/swells/issues/36)), pre-existing and unrelated to any of this repo's other in-flight work.

## Architecture

This is a Next.js 14 app (App Router) that delivers AI-generated surf reports for St. Augustine, FL. The live site is `swells.surf` (previously `surf-report-rouge.vercel.app` and `canisurf.today`, now inactive).

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

The hook is configured with aggressive caching (`staleTime: 30m`, no polling interval) because reports only update via cron; it does refetch on window focus (once the 30m staleTime has elapsed) so long-lived open tabs catch up when revisited. `SurfReportCard` renders the raw AI-generated text as a large prose block.

### Database

Neon PostgreSQL (`@neondatabase/serverless`). Three tables: `surf_reports`, `location_requests` (spot suggestions from the "Suggest a spot" form), and `push_subscriptions` (browser push subscriptions, one row per subscription `endpoint`, scoped to a single `location`). All DB functions are in `src/app/lib/db.ts`. The `getCachedReport` function fetches the most recent row for a location regardless of `cached_until` — the 8-hour staleness check is done in the route handler.

### Environment variables required

| Variable | Purpose |
|---|---|
| `NEON_DATABASE_URL` | Neon PostgreSQL connection string |
| `BUN_SERVICE_URL` | URL of external Bun AI generation service |
| `BUN_API_SECRET` | Auth token sent to Bun service |
| `CRON_SECRET` | Bearer token required by `/api/admin/request-forecast` |
| `NEXT_PUBLIC_API_URL` | Base URL for internal self-calls (optional, falls back to host header) |
| `RESEND_API_KEY` | Sends the "suggest a spot" notification email via Resend (`/api/location-request`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key passed to `PushManager.subscribe()` in the browser |
| `VAPID_PRIVATE_KEY` | VAPID private key used server-side to sign push messages (`web-push`) |
| `VAPID_SUBJECT` | Contact identifier (URL) sent to push services alongside VAPID-signed requests |

### What's in the codebase but not active

The web app manifest (`public/manifest.json`, linked from `layout.tsx`), the install-prompt flow (`beforeinstallprompt`/`appinstalled` handling and Install button in `SurfAppClient.tsx`'s dock bar), and `public/sw.js`'s offline caching (registered from `SurfAppClient.tsx`, with `install`/`activate`/`fetch` handlers implementing its `CACHE_STRATEGIES`) are all fully wired up.

Push notifications are fully wired up end to end. A "Notify" button in `SurfAppClient.tsx`'s dock bar (shown only where `PushManager` exists — which on iOS means only inside an installed PWA) requests `Notification` permission, subscribes via `pushManager.subscribe()` with the VAPID public key, and POSTs the subscription (plus per-subscriber condition thresholds entered in the Notify popover) to `/api/push-subscription`, which upserts it into the `push_subscriptions` table keyed by `endpoint`. Scope is single-location: a subscription is tied to whichever location the visitor was viewing when they opted in, and re-subscribing from a different location moves it (re-upserts the same `endpoint` row with the new `location`). Clicking again unsubscribes client-side and `DELETE`s the row. `public/sw.js` has `push` and `notificationclick` handlers that render and route the notification, and `src/app/lib/push.ts` (using `web-push`) is called from the cron flow to evaluate each subscriber's thresholds against the fresh report and send matching notifications.

On iOS Safari when the app hasn't been added to the home screen, neither `beforeinstallprompt` nor `PushManager` are available (Apple platform limitations, not bugs), so the Install and Notify buttons are hidden. In that case `SurfAppClient.tsx` shows an "Install" dock item with a share/user-agent-detected iOS check (`isIOS`) that opens a popover instructing the visitor to use Safari's Share → "Add to Home Screen" to install and unlock notifications.
