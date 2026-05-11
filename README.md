# LHCI Manager

LHCI Manager is a self-hosted Lighthouse CI management dashboard designed to help you track and monitor the performance, accessibility, best practices, and SEO of your websites over time. It provides a clean, visual interface for managing multiple sites, viewing historical Lighthouse runs, and triggering new audits.

![LHCI Manager Screenshot](./screenshot.png)

## Features

- **Website Monitoring**: Add and track multiple websites with configurable form factors (Mobile or Desktop).
- **Automated Audits**: Background worker handles Lighthouse audits, ensuring your UI stays responsive.
- **Historic Trends**: Track performance, accessibility, best practices, and SEO scores over time with interactive charts.
- **Detailed Reports**: View full Lighthouse reports and screenshots for every run.
- **Modern Architecture**: Built with a cutting-edge stack for speed and reliability.
- **Secure Auth**: Integrated authentication powered by Better Auth.

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React Router + Nitro)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Job Queue**: [pg-boss](https://github.com/timgit/pg-boss) for background Lighthouse tasks
- **Auditing**: [Lighthouse](https://github.com/GoogleChrome/lighthouse)
- **Charts**: [Recharts](https://recharts.org/)
- **Auth**: [Better Auth](https://www.better-auth.com/)

## Getting Started

### Prerequisites

- Node.js (version specified in `.node-version`)
- Docker and Docker Compose
- pnpm

### Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd lhci-manager
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment**:
   Create a `.env` file based on the required variables (see `docker-compose.yml` for reference):
   ```env
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/lhci
   BETTER_AUTH_SECRET=your_secret_key
   BETTER_AUTH_URL=http://localhost:3000
   ```

4. **Start Infrastructure**:
   Use Docker Compose to start the database and worker:
   ```bash
   pnpm dev:services
   ```

5. **Run Development Server**:
   ```bash
   pnpm dev
   ```
   The application will be available at `http://localhost:3000`.

## Scripts

- `pnpm dev`: Starts the Vite development server.
- `pnpm dev:services`: Starts the database and worker via Docker Compose.
- `pnpm worker`: Starts the Lighthouse worker locally (requires a running PostgreSQL).
- `pnpm build`: Builds the application for production.
- `pnpm start`: Pushes database schema and starts the production preview.
- `pnpm db:push`: Syncs the Drizzle schema with the database.
- `pnpm db:studio`: Opens Drizzle Studio to explore your data.

## Architecture

LHCI Manager is a multi-process application:
- **Web Process**: Handles the UI, API, and job orchestration.
- **Worker Process**: A separate Node.js process that polls the job queue, runs headless Chromium/Lighthouse, and stores the results.

Both processes communicate through the PostgreSQL database using `pg-boss` as a job queue.

## License

MIT
