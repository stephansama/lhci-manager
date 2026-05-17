import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { website, run } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '../lib/auth'
import { getRequestHeaders } from '@tanstack/react-start/server'
import Boss from 'pg-boss'
import { scrapeMetadata } from '../lib/scrapeMetadata'
import { validateCron } from '../lib/cron'

function normalizeCron(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  validateCron(trimmed)
  return trimmed
}

const boss = new Boss(process.env.DATABASE_URL!)
const bossReady = boss.start()

export const getSession = createServerFn({ method: 'GET' })
  .handler(async () => {
    const headers = await getRequestHeaders()
    return auth.api.getSession({ headers })
  })

export const getWebsites = createServerFn({ method: 'GET' })
  .handler(async () => {
    const headers = await getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    if (!session) {
      throw new Error('Unauthorized')
    }

    return await db.query.website.findMany({
      where: eq(website.userId, session.user.id),
      with: {
        runs: {
          limit: 1,
          orderBy: (runs, { desc }) => [desc(runs.createdAt)],
          columns: { fullReportJson: false },
        }
      }
    })
  })

export const getWebsiteRuns = createServerFn({ method: 'GET' })
  .inputValidator((data: { websiteId: string }) => data)
  .handler(async ({ data }) => {
    const headers = await getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    if (!session) {
      throw new Error('Unauthorized')
    }

    const isAdmin = (session.user as { role?: string }).role === 'admin'
    return await db.query.website.findFirst({
      where: isAdmin
        ? eq(website.id, data.websiteId)
        : and(eq(website.id, data.websiteId), eq(website.userId, session.user.id)),
      with: {
        runs: {
          orderBy: (runs, { desc }) => [desc(runs.createdAt)],
          columns: { fullReportJson: false },
        }
      }
    })
  })

export const addWebsite = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; url: string; formFactor: 'mobile' | 'desktop'; cronExpression?: string | null }) => data)
  .handler(async ({ data }) => {
    const headers = await getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    if (!session) {
      throw new Error('Unauthorized')
    }

    const cronExpression = normalizeCron(data.cronExpression)

    const [inserted] = await db.insert(website).values({
      name: data.name,
      url: data.url,
      formFactor: data.formFactor,
      cronExpression,
      userId: session.user.id,
    }).returning({ id: website.id })

    const meta = await scrapeMetadata(data.url)
    if (meta.faviconUrl || meta.ogImageUrl) {
      await db.update(website)
        .set({ faviconUrl: meta.faviconUrl, ogImageUrl: meta.ogImageUrl })
        .where(eq(website.id, inserted.id))
    }
  })

export const deleteWebsite = createServerFn({ method: 'POST' })
  .inputValidator((data: { websiteId: string }) => data)
  .handler(async ({ data }) => {
    const headers = await getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    if (!session) {
      throw new Error('Unauthorized')
    }

    await db.delete(run).where(eq(run.websiteId, data.websiteId))
    await db.delete(website).where(
      and(eq(website.id, data.websiteId), eq(website.userId, session.user.id))
    )
  })

export const getRunDetail = createServerFn({ method: 'GET' })
  .inputValidator((data: { runId: string }) => data)
  .handler(async ({ data }) => {
    const headers = await getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session) throw new Error('Unauthorized')

    const runRecord = await db.query.run.findFirst({
      where: eq(run.id, data.runId),
      with: {
        website: { columns: { userId: true, name: true, url: true, id: true } },
      },
    })

    const isAdmin = (session.user as { role?: string }).role === 'admin'
    if (!runRecord || (!isAdmin && runRecord.website.userId !== session.user.id)) return null
    // Cast needed: TanStack Start's serialization validator rejects `Record<string, unknown>`
    // (the Drizzle JSONB column type). The value is a plain Lighthouse LHR JSON object — safe to serialize.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return runRecord as any
  })

export const triggerAudit = createServerFn({ method: 'POST' })
  .inputValidator((data: { websiteId: string }) => data)
  .handler(async ({ data }) => {
    const headers = await getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    if (!session) {
      throw new Error('Unauthorized')
    }

    const owned = await db.query.website.findFirst({
      where: and(eq(website.id, data.websiteId), eq(website.userId, session.user.id)),
      columns: { id: true },
    })
    if (!owned) {
      throw new Error('Forbidden')
    }

    const [newRun] = await db.insert(run).values({
      websiteId: data.websiteId,
      status: 'pending',
    }).returning()

    await bossReady
    await boss.send('lhci-run', { runId: newRun.id, websiteId: data.websiteId })
  })

export const setWebsiteVisibility = createServerFn({ method: 'POST' })
  .inputValidator((data: { websiteId: string; visibility: 'private' | 'public_latest' | 'public_all' }) => data)
  .handler(async ({ data }) => {
    const headers = await getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session) throw new Error('Unauthorized')

    await db.update(website)
      .set({ visibility: data.visibility })
      .where(and(eq(website.id, data.websiteId), eq(website.userId, session.user.id)))
  })

export const setRunVisibility = createServerFn({ method: 'POST' })
  .inputValidator((data: { runId: string; isPublic: boolean }) => data)
  .handler(async ({ data }) => {
    const headers = await getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session) throw new Error('Unauthorized')

    const runRecord = await db.query.run.findFirst({
      where: eq(run.id, data.runId),
      with: { website: { columns: { userId: true } } },
    })
    if (!runRecord || runRecord.website.userId !== session.user.id) {
      throw new Error('Forbidden')
    }

    await db.update(run)
      .set({ isPublic: data.isPublic })
      .where(eq(run.id, data.runId))
  })

export const updateWebsite = createServerFn({ method: 'POST' })
  .inputValidator((data: { websiteId: string; name: string; url: string; faviconUrl: string | null; ogImageUrl: string | null; formFactor: 'mobile' | 'desktop'; cronExpression?: string | null }) => data)
  .handler(async ({ data }) => {
    const headers = await getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    if (!session) {
      throw new Error('Unauthorized')
    }

    const cronExpression = normalizeCron(data.cronExpression)

    await db.update(website)
      .set({
        name: data.name,
        url: data.url,
        faviconUrl: data.faviconUrl,
        ogImageUrl: data.ogImageUrl,
        formFactor: data.formFactor,
        cronExpression,
        ...(cronExpression === null ? { lastScheduledRunAt: null } : {}),
      })
      .where(and(eq(website.id, data.websiteId), eq(website.userId, session.user.id)))
  })

export const fetchMetadataForUrl = createServerFn({ method: 'POST' })
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data }) => scrapeMetadata(data.url))
