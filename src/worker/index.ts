import { createServer } from 'http';
import Boss from 'pg-boss';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { CronExpressionParser } from 'cron-parser';
import { db } from '../db';
import { run, website, workerHeartbeat } from '../db/schema';
import { eq, isNotNull, sql } from 'drizzle-orm';

async function startWorker() {
  const boss = new Boss(process.env.DATABASE_URL!);

  boss.on('error', (error) => console.error(error));

  await boss.start();

  console.log('Worker started, listening for jobs...');

  const writeHeartbeat = () =>
    db.insert(workerHeartbeat)
      .values({ id: 1, lastHeartbeatAt: new Date() })
      .onConflictDoUpdate({ target: workerHeartbeat.id, set: { lastHeartbeatAt: new Date() } })
      .catch((err) => console.error('heartbeat write failed:', err));

  await writeHeartbeat();
  const heartbeatTimer = setInterval(writeHeartbeat, 30_000);

  const healthPort = Number(process.env.WORKER_HEALTH_PORT ?? 8080);
  const healthServer = createServer(async (req, res) => {
    if (req.method !== 'GET' || req.url !== '/health') {
      res.writeHead(404).end();
      return;
    }
    try {
      await db.execute(sql`select 1`);
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ status: 'ok' }));
    } catch {
      res.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ status: 'degraded' }));
    }
  });
  healthServer.listen(healthPort, () => console.log(`worker health on :${healthPort}`));

  await boss.schedule('lhci-scheduler-tick', '* * * * *');
  await boss.work('lhci-scheduler-tick', async () => {
    const sites = await db.select().from(website).where(isNotNull(website.cronExpression));
    const now = new Date();
    for (const site of sites) {
      if (!site.cronExpression) continue;
      let prevTick: Date;
      try {
        prevTick = CronExpressionParser.parse(site.cronExpression, { currentDate: now }).prev().toDate();
      } catch (err) {
        console.error(`Invalid cron for website ${site.id}: ${site.cronExpression}`, err);
        continue;
      }
      if (site.lastScheduledRunAt && site.lastScheduledRunAt >= prevTick) continue;

      const [newRun] = await db.insert(run).values({
        websiteId: site.id,
        status: 'pending',
      }).returning();
      await boss.send('lhci-run', { runId: newRun.id, websiteId: site.id });
      await db.update(website)
        .set({ lastScheduledRunAt: now })
        .where(eq(website.id, site.id));
      console.log(`Scheduled run ${newRun.id} for ${site.name} (${site.cronExpression})`);
    }
  });

  await boss.work('lhci-run', { teamSize: 1, teamConcurrency: 1 }, async (job) => {
    const { runId, websiteId } = job.data as { runId: string, websiteId: string };
    console.log(`Processing LHCI run ${runId} for website ${websiteId}`);

    let chrome: chromeLauncher.LaunchedChrome | undefined;

    try {
      await db.update(run)
        .set({ status: 'running' })
        .where(eq(run.id, runId));

      const [site] = await db.select().from(website).where(eq(website.id, websiteId));
      if (!site) throw new Error('Website not found');

      chrome = await chromeLauncher.launch({
        chromeFlags: [
          '--headless=new',
          '--no-sandbox',
          '--disable-gpu',
        ],
      });

      const isMobile = site.formFactor !== 'desktop';
      const result = await lighthouse(site.url, {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        maxWaitForLoad: 45_000,
        formFactor: isMobile ? 'mobile' : 'desktop',
        screenEmulation: isMobile
          ? { mobile: true,  width: 412,  height: 823, deviceScaleFactor: 1.75, disabled: false }
          : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1,    disabled: false },
      });

      if (!result) throw new Error('Lighthouse failed to produce result');

      const report = result.lhr;

      await db.update(run)
        .set({
          status: 'completed',
          performanceScore: Math.round(report.categories.performance.score! * 100),
          accessibilityScore: Math.round(report.categories.accessibility.score! * 100),
          bestPracticesScore: Math.round(report.categories['best-practices'].score! * 100),
          seoScore: Math.round(report.categories.seo.score! * 100),
          fullReportJson: report as unknown as Record<string, unknown>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          thumbnailDataUrl: (report as any).audits?.['screenshot-thumbnails']?.details?.items?.[0]?.data ?? null,
          completedAt: new Date(),
        })
        .where(eq(run.id, runId));

      console.log(`Run ${runId} completed successfully`);
    } catch (error) {
      console.error(`Run ${runId} failed:`, error);
      await db.update(run)
        .set({ status: 'failed', completedAt: new Date() })
        .where(eq(run.id, runId));
    } finally {
      if (chrome) {
        try {
          chrome.kill();
        } catch (err) {
          console.error('chrome.kill failed:', err);
        }
      }
    }
  });

  const shutdown = async (signal: string) => {
    console.log(`worker: received ${signal}, draining...`);
    clearInterval(heartbeatTimer);
    healthServer.close();
    try {
      await boss.stop({ graceful: true, timeout: 30_000 });
    } catch (err) {
      console.error('worker: shutdown error', err);
    }
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startWorker().catch(console.error);
