import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { website, run } from '../db/schema'
import { and, eq, ne } from 'drizzle-orm'

type Visibility = 'private' | 'public_latest' | 'public_all'

async function loadPublicWebsite(websiteId: string) {
  const site = await db.query.website.findFirst({
    where: and(eq(website.id, websiteId), ne(website.visibility, 'private')),
    columns: {
      id: true,
      name: true,
      url: true,
      faviconUrl: true,
      ogImageUrl: true,
      formFactor: true,
      visibility: true,
    },
  })
  return site ?? null
}

export const getPublicWebsiteOverview = createServerFn({ method: 'GET' })
  .inputValidator((data: { websiteId: string }) => data)
  .handler(async ({ data }) => {
    const site = await loadPublicWebsite(data.websiteId)
    if (!site) return null

    const includeHistory = site.visibility === 'public_all'
    const runs = await db.query.run.findMany({
      where: eq(run.websiteId, site.id),
      orderBy: (r, { desc }) => [desc(r.createdAt)],
      limit: includeHistory ? undefined : 1,
      columns: { fullReportJson: false },
    })

    return { site, runs, includeHistory }
  })

export const getPublicRunDetail = createServerFn({ method: 'GET' })
  .inputValidator((data: { websiteId: string; runId: string }) => data)
  .handler(async ({ data }) => {
    const runRecord = await db.query.run.findFirst({
      where: eq(run.id, data.runId),
      with: {
        website: {
          columns: { id: true, name: true, url: true, visibility: true },
        },
      },
    })
    if (!runRecord || runRecord.websiteId !== data.websiteId) return null

    const websiteVisibility = runRecord.website.visibility as Visibility
    let allowed = runRecord.isPublic

    if (!allowed && websiteVisibility !== 'private') {
      if (websiteVisibility === 'public_all') {
        allowed = true
      } else {
        const [latest] = await db.query.run.findMany({
          where: eq(run.websiteId, runRecord.websiteId),
          orderBy: (r, { desc }) => [desc(r.createdAt)],
          limit: 1,
          columns: { id: true },
        })
        allowed = latest?.id === runRecord.id
      }
    }
    if (!allowed) return null

    // Cast for TanStack Start serialization (same reason as getRunDetail).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return runRecord as any
  })
