import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { user, website, run } from '../db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '../lib/auth'
import { getRequestHeaders } from '@tanstack/react-start/server'

async function requireAdmin() {
  const headers = await getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new Error('Unauthorized')
  if (session.user.role !== 'admin') throw new Error('Forbidden')
  return session
}

export const adminListUsers = createServerFn({ method: 'GET' })
  .handler(async () => {
    await requireAdmin()
    return db.query.user.findMany({
      orderBy: (u, { desc }) => [desc(u.createdAt)],
    })
  })

export const adminListWebsites = createServerFn({ method: 'GET' })
  .handler(async () => {
    await requireAdmin()
    return db.query.website.findMany({
      with: {
        user: { columns: { id: true, email: true, name: true } },
        runs: {
          limit: 1,
          orderBy: (r, { desc }) => [desc(r.createdAt)],
          columns: { fullReportJson: false },
        },
      },
      orderBy: (w, { desc }) => [desc(w.createdAt)],
    })
  })

export const adminSetUserRole = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string; role: 'admin' | 'user' }) => data)
  .handler(async ({ data }) => {
    const session = await requireAdmin()
    if (data.userId === session.user.id) throw new Error('Cannot change your own role')
    await db.update(user).set({ role: data.role }).where(eq(user.id, data.userId))
  })

export const adminBanUser = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string; reason?: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireAdmin()
    if (data.userId === session.user.id) throw new Error('Cannot ban yourself')
    await db.update(user)
      .set({ banned: true, banReason: data.reason ?? null })
      .where(eq(user.id, data.userId))
  })

export const adminUnbanUser = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    await db.update(user)
      .set({ banned: false, banReason: null })
      .where(eq(user.id, data.userId))
  })

export const adminDeleteWebsite = createServerFn({ method: 'POST' })
  .inputValidator((data: { websiteId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    await db.delete(run).where(eq(run.websiteId, data.websiteId))
    await db.delete(website).where(eq(website.id, data.websiteId))
  })

export const adminReassignWebsite = createServerFn({ method: 'POST' })
  .inputValidator((data: { websiteId: string; newUserId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    await db.update(website).set({ userId: data.newUserId }).where(eq(website.id, data.websiteId))
  })
