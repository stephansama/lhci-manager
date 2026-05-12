import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import {
  adminListUsers,
  adminListWebsites,
  adminSetUserRole,
  adminBanUser,
  adminUnbanUser,
  adminDeleteWebsite,
  adminReassignWebsite,
} from '@/services/admin'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import { ScoreCell } from '@/components/ScoreCell'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

export const Route = createFileRoute('/admin/')({
  loader: async () => {
    const [users, websites] = await Promise.all([adminListUsers(), adminListWebsites()])
    return { users, websites }
  },
  component: AdminDashboard,
})

type Tab = 'users' | 'websites'
type LoadedUser = Awaited<ReturnType<typeof adminListUsers>>[number]
type LoadedWebsite = Awaited<ReturnType<typeof adminListWebsites>>[number]

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

// ── Invite User Dialog ────────────────────────────────────────────────────────

function InviteUserDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => { setName(''); setEmail(''); setPassword(''); setRole('user'); setError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await (authClient as any).admin.createUser({ name, email, password, role })
      if (result?.error) {
        setError(result.error.message ?? 'Failed to create user')
      } else {
        setOpen(false)
        reset()
        onDone()
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger render={<Button size="sm" />}>
        + Invite User
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-name">Name</Label>
            <Input id="invite-name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-password">Temporary Password</Label>
            <Input id="invite-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" minLength={8} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              className={selectClass}
              value={role}
              onChange={e => setRole(e.target.value as 'user' | 'admin')}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create User'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Reassign Website Dialog ───────────────────────────────────────────────────

function ReassignDialog({
  website,
  users,
  onDone,
}: {
  website: LoadedWebsite
  users: LoadedUser[]
  onDone: () => void
}) {
  const owner = (website as any).user as { id: string; email: string; name: string } | undefined
  const [open, setOpen] = useState(false)
  const [newUserId, setNewUserId] = useState(owner?.id ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newUserId === owner?.id) { setOpen(false); return }
    setLoading(true)
    await adminReassignWebsite({ data: { websiteId: website.id, newUserId } })
    setLoading(false)
    setOpen(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="h-7 text-xs" />}>
        Reassign
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Website</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{website.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{website.url}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reassign-user">New Owner</Label>
            <select
              id="reassign-user"
              className={selectClass}
              value={newUserId}
              onChange={e => setNewUserId(e.target.value)}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={loading || newUserId === owner?.id}>
              {loading ? 'Saving…' : 'Reassign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

function AdminDashboard() {
  const { users, websites } = Route.useLoaderData()
  const { data: session } = authClient.useSession()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('users')

  const reload = () => router.invalidate()

  const handleSetRole = async (userId: string, role: 'admin' | 'user') => {
    await adminSetUserRole({ data: { userId, role } })
    reload()
  }

  const handleBan = async (userId: string, banned: boolean) => {
    if (banned) await adminUnbanUser({ data: { userId } })
    else await adminBanUser({ data: { userId } })
    reload()
  }

  const handleDeleteWebsite = async (websiteId: string) => {
    if (!confirm('Delete this website and all its runs? This cannot be undone.')) return
    await adminDeleteWebsite({ data: { websiteId } })
    reload()
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-primary text-foreground'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin</h1>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{users.length} user{users.length !== 1 ? 's' : ''}</span>
          <span>{websites.length} website{websites.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-0">
        <button className={tabClass('users')} onClick={() => setTab('users')}>Users</button>
        <button className={tabClass('websites')} onClick={() => setTab('websites')}>Websites</button>
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <InviteUserDialog onDone={reload} />
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  {['Email', 'Name', 'Role', 'Created', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-mono uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSelf = u.id === session?.user.id
                  const role = (u as any).role as string | null
                  const banned = (u as any).banned as boolean | null
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">{u.email}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{u.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-xs font-mono">
                          {role ?? 'user'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {banned
                          ? <Badge variant="destructive" className="text-xs">Banned</Badge>
                          : <Badge variant="outline" className="text-xs text-muted-foreground">Active</Badge>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {!isSelf && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleSetRole(u.id, role === 'admin' ? 'user' : 'admin')}
                            >
                              {role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                            </Button>
                            <Button
                              size="sm"
                              variant={banned ? 'outline' : 'destructive'}
                              className="h-7 text-xs"
                              onClick={() => handleBan(u.id, !!banned)}
                            >
                              {banned ? 'Unban' : 'Ban'}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Websites tab */}
      {tab === 'websites' && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                {['Website', 'Owner', 'Perf', 'A11y', 'BP', 'SEO', 'Runs', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-mono uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {websites.map(ws => {
                const latest = ws.runs[0]
                const owner = (ws as any).user as { id: string; email: string; name: string } | undefined
                return (
                  <tr key={ws.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <Link
                          to="/websites/$websiteId"
                          params={{ websiteId: ws.id }}
                          className="text-sm font-medium hover:underline"
                        >
                          {ws.name}
                        </Link>
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{ws.url}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{owner?.email ?? '—'}</td>
                    <td className="px-4 py-3"><ScoreCell score={latest?.performanceScore ?? null} /></td>
                    <td className="px-4 py-3"><ScoreCell score={latest?.accessibilityScore ?? null} /></td>
                    <td className="px-4 py-3"><ScoreCell score={latest?.bestPracticesScore ?? null} /></td>
                    <td className="px-4 py-3"><ScoreCell score={latest?.seoScore ?? null} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {ws.runs.length}
                      {latest && (
                        <span className="ml-1">
                          <RunStatusBadge status={latest.status as 'pending' | 'running' | 'completed' | 'failed'} />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <ReassignDialog website={ws} users={users} onDone={reload} />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => handleDeleteWebsite(ws.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
