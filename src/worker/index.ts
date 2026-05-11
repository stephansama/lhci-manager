import Boss from 'pg-boss';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { db } from '../db';
import { run, website } from '../db/schema';
import { eq } from 'drizzle-orm';

async function startWorker() {
  const boss = new Boss(process.env.DATABASE_URL!);

  boss.on('error', (error) => console.error(error));

  await boss.start();

  console.log('Worker started, listening for jobs...');

  await boss.work('lhci-run', async (job) => {
    const { runId, websiteId } = job.data as { runId: string, websiteId: string };
    console.log(`Processing LHCI run ${runId} for website ${websiteId}`);

    try {
      // Update status to running
      await db.update(run)
        .set({ status: 'running' })
        .where(eq(run.id, runId));

      // Get website URL
      const [site] = await db.select().from(website).where(eq(website.id, websiteId));
      if (!site) throw new Error('Website not found');

      // Launch chrome
      const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });
      
      // Run Lighthouse
      const isMobile = site.formFactor !== 'desktop'
      const result = await lighthouse(site.url, {
        port: chrome.port,
        output: 'json',
        logLevel: 'info',
        formFactor: isMobile ? 'mobile' : 'desktop',
        screenEmulation: isMobile
          ? { mobile: true,  width: 412,  height: 823, deviceScaleFactor: 1.75, disabled: false }
          : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1,    disabled: false },
      });

      await chrome.kill();

      if (!result) throw new Error('Lighthouse failed to produce result');

      const report = result.lhr;
      
      // Update run with results
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
    }
  });
}

startWorker().catch(console.error);
