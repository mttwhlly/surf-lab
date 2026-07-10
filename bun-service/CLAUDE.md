# CLAUDE.md

This file provides guidance to Claude Code when working with the Bun AI service in this directory.

## Runtime: Always Use Bun

- `bun run index.ts` — run the server
- `bun --watch index.ts` — dev with hot reload
- `bun install` — install dependencies
- Bun auto-loads `.env` — do not use `dotenv`

## Commands

```bash
bun dev      # hot-reload dev server
bun start    # production run
```

## Architecture

Single-file service (`index.ts`) deployed as a Docker container on Coolify. Receives a cron trigger, fetches surf data from the Next.js app, generates an AI report via OpenAI, and saves the result back to the Next.js app.

**Cron flow:**
1. GitHub Actions calls `POST /cron/generate-fresh-report` with `{ cronSecret, vercelUrl }`
2. This service fetches `vercelUrl/api/surfability`
3. Calls OpenAI `gpt-4o-mini` via Vercel AI SDK (`generateObject`)
4. POSTs result to `vercelUrl/api/admin/save-report`

**Direct flow:**
- `POST /generate-surf-report` with `{ surfData, apiKey }` — caller provides surf data directly

## Deployment

Docker on Coolify. Set the **Base Directory** in Coolify source settings to `/bun-service`.

## Environment Variables

```
OPENAI_API_KEY   # OpenAI API key
API_SECRET       # Shared secret for /generate-surf-report
CRON_SECRET      # Shared secret for /cron/generate-fresh-report
PORT             # Default 3000
```
