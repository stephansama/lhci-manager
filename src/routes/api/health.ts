import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { workerHeartbeat } from "../../db/schema";

const WORKER_STALE_AFTER_MS = 120_000;

type CheckState = "ok" | "fail" | "stale" | "unknown";

async function runHealthcheck(): Promise<Response> {
  const checks: Record<"web" | "db" | "worker", CheckState> = {
    web: "ok",
    db: "ok",
    worker: "ok",
  };

  let dbOk = false;
  try {
    await db.execute(sql`select 1`);
    dbOk = true;
  } catch {
    checks.db = "fail";
  }

  if (!dbOk) {
    checks.worker = "unknown";
  } else {
    try {
      const [row] = await db.select().from(workerHeartbeat).limit(1);
      const ageMs = row ? Date.now() - row.lastHeartbeatAt.getTime() : Infinity;
      if (!row || ageMs > WORKER_STALE_AFTER_MS) checks.worker = "stale";
    } catch {
      checks.worker = "fail";
    }
  }

  const allOk = checks.db === "ok" && checks.worker === "ok";
  return new Response(
    JSON.stringify({ status: allOk ? "ok" : "degraded", checks }),
    {
      status: allOk ? 200 : 503,
      headers: { "content-type": "application/json" },
    },
  );
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () => runHealthcheck(),
    },
  },
});
