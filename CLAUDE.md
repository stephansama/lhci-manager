# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Local development (typical flow)
pnpm dev:services # docker compose up db worker -d  (Postgres + worker in background)
pnpm dev          # Start the web dev server on port 3000
pnpm dev:stop     # docker compose down

# Database
pnpm db:push      # Push schema changes to the database (no migrations generated)
pnpm db:studio    # Open Drizzle Studio (DB GUI)

# Worker (only needed if running it outside Docker)
pnpm worker       # Start the pg-boss worker (runs Lighthouse jobs)

# Production / Docker
docker compose up --build    # Start full stack: db + web + worker
pnpm build                   # Build the TanStack Start app
pnpm start                   # db:push + vite preview --host 0.0.0.0 --port 3000
```

Required environment variables (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — secret key for Better-Auth
- `BETTER_AUTH_URL` — base URL of the web app (e.g. `http://localhost:3000`)

Optional OAuth providers (loaded conditionally by `src/lib/auth.ts`): `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `APPLE_CLIENT_ID/SECRET`.

## Tooling

- Node 24 locally (pinned via `.node-version`); Docker images use `node:22-slim` — the skew is intentional, just be aware when comparing local vs container behavior.
- TS path aliases: `@/*` → `./src/*` and `~/*` → `./app/*` (also used implicitly by `unplugin-icons` as `~icons/...`).
- No test framework, ESLint, or Prettier config in the repo — do not propose `pnpm test` or `pnpm lint`; they do not exist.

## Architecture

This is a **multi-process** app: the web server and the Lighthouse worker are separate processes that coordinate through a PostgreSQL-backed job queue.

### Process Boundary

- **Web process** (`src/`): TanStack Start SSR app. Handles HTTP, auth, DB reads/writes, and enqueues `lhci-run` jobs into pg-boss.
- **Worker process** (`src/worker/index.ts`): Long-running Node.js process that polls pg-boss for `lhci-run` jobs, launches headless Chromium, runs Lighthouse, and writes results back to the `run` table.

The two processes share the same database and the same `src/db/` module. pg-boss manages the job queue entirely within PostgreSQL — no Redis or separate queue service.

### TanStack Start Conventions

Routes live in `src/routes/` using file-based routing (the route tree is auto-generated into `src/routeTree.gen.ts` by the Vite plugin). Server-side logic lives in `src/services/` (`websites.ts`, `admin.ts`) as `createServerFn` handlers — these run only on the server and are called from route loaders and component handlers.

Data flow is server-first: route `loader`s call serverFns to fetch, and mutations call serverFns then invalidate/navigate to refetch. There is no TanStack Query or client-side store — do not introduce one without a good reason.

Every serverFn must check auth before doing work. The pattern: `websites.ts` calls `getSession()` (from `src/lib/auth.ts`) at the top of each handler; `admin.ts` uses the `requireAdmin()` helper. Preserve this when adding new serverFns — route-level `beforeLoad` guards alone do **not** protect serverFns from being called directly.

Auth is handled by Better-Auth at `src/lib/auth.ts` (server) and `src/lib/auth-client.ts` (client). The auth API is mounted at `/api/auth/*` via `src/routes/api/auth.$.ts`. The `admin` plugin is enabled on both server and client; admin status is `session.user.role === 'admin'`.

### Database

Drizzle ORM with PostgreSQL. Schema is defined in `src/db/schema.ts`. `pnpm db:push` applies changes directly without generating migration files. The schema has two app-level tables:

- `website` — user-owned sites to audit (`id`, `userId`, `name`, `url`, `formFactor`)
- `run` — Lighthouse audit records with status (`pending` → `running` → `completed`/`failed`), score columns (0–100 integers), `fullReportJson` (entire Lighthouse JSON — large), and `thumbnailDataUrl` (base64-encoded screenshot). Both of those columns are non-trivial in size; think before selecting them in list queries.

Better-Auth owns `user`, `session`, `account`, and `verification`. The `admin` plugin extends `user` with `role`, `banned`, `banReason`, `banExpires` — these are managed via Better-Auth APIs, not direct writes.

### Worker & Job Queue

- Queue name: `lhci-run`. Payload: `{ runId: string, websiteId: string }`.
- Jobs are enqueued by `triggerAudit()` in `src/services/websites.ts` immediately after inserting a `pending` row in `run`.
- The worker (`src/worker/index.ts`) uses default pg-boss concurrency (one job at a time per process) and has no retry/timeout config — a failure marks the run `failed` and the job is done.
- Chrome launched with `--headless --no-sandbox --disable-gpu`. Screen emulation switches between mobile (412×823 @ 1.75×) and desktop (1350×940 @ 1×) based on `website.formFactor`.

### UI & Styling

- shadcn/ui components live in `src/components/ui/` — extend these rather than pulling in another component library.
- Tailwind CSS v4 (no `tailwind.config.*`; v4 reads inline config from CSS).
- Icons via `unplugin-icons`, imported as `import Pencil from '~icons/lucide/pencil'`.
- Charts via Recharts, wrapped in `src/components/ui/chart.tsx`.
- Score → color mapping helpers in `src/lib/score.ts` (`scorePillClass`, `scoreClass`, `scoreColorVar`, `dotClass`). Reuse these — don't re-derive the 90/75/50/25 thresholds.
- URL → favicon/og-image scraping helper at `src/lib/scrapeMetadata.ts` (Cheerio-based, 5s timeout, returns null on failure).

### Docker

Three services in `docker-compose.yml`: `db` (Postgres 15), `web` (built from `Dockerfile.web`), `worker` (built from `Dockerfile.worker`). The worker Dockerfile installs Chromium system-wide and sets `CHROME_PATH=/usr/bin/chromium` — this is required for `chrome-launcher` to find the browser in the container.
