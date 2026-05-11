# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (requires PostgreSQL running locally or via Docker)
pnpm dev          # Start dev server on port 3000

# Database
pnpm db:push      # Push schema changes to the database (no migrations generated)
pnpm db:studio    # Open Drizzle Studio (DB GUI)

# Worker (separate process)
pnpm worker       # Start the pg-boss worker (runs Lighthouse jobs)

# Production / Docker
docker compose up --build    # Start full stack: db + web + worker
pnpm build                   # Build the TanStack Start app
pnpm start                   # db:push + serve built app on port 3000
```

Required environment variables (see `.env`):
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — secret key for Better-Auth
- `BETTER_AUTH_URL` — base URL of the web app (e.g. `http://localhost:3000`)

## Architecture

This is a **multi-process** app: the web server and the Lighthouse worker are separate processes that coordinate through a PostgreSQL-backed job queue.

### Process Boundary

- **Web process** (`src/`): TanStack Start SSR app. Handles HTTP, auth, DB reads/writes, and enqueues `lhci-run` jobs into pg-boss.
- **Worker process** (`src/worker/index.ts`): Long-running Node.js process that polls pg-boss for `lhci-run` jobs, launches headless Chromium, runs Lighthouse, and writes results back to the `run` table.

The two processes share the same database and the same `src/db/` module. pg-boss manages the job queue entirely within PostgreSQL — no Redis or separate queue service.

### TanStack Start Conventions

Routes live in `src/routes/` using file-based routing (the route tree is auto-generated into `src/routeTree.gen.ts` by the Vite plugin). Server-side logic is co-located with routes via `createServerFn` in `src/services/websites.ts` — these run only on the server and are called from route loaders and component handlers.

Auth is handled by Better-Auth at `src/lib/auth.ts` (server) and `src/lib/auth-client.ts` (client). The auth API is mounted at `/api/auth/*` via `src/routes/api/auth.$.ts`.

### Database

Drizzle ORM with PostgreSQL. Schema is defined in `src/db/schema.ts`. `pnpm db:push` applies changes directly without generating migration files. The schema has two app-level tables:

- `website` — user-owned sites to audit (`id`, `userId`, `name`, `url`)
- `run` — Lighthouse audit records with status (`pending` → `running` → `completed`/`failed`) and score columns (0–100 integers)

Better-Auth owns the `user`, `session`, `account`, and `verification` tables; do not edit those manually.

### Docker

Three services in `docker-compose.yml`: `db` (Postgres 15), `web` (built from `Dockerfile.web`), `worker` (built from `Dockerfile.worker`). The worker Dockerfile installs Chromium system-wide and sets `CHROME_PATH=/usr/bin/chromium` — this is required for `chrome-launcher` to find the browser in the container.
