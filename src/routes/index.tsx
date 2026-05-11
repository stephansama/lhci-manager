import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { getWebsites, deleteWebsite, triggerAudit, getSession, updateWebsite, fetchMetadataForUrl } from '../services/websites'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import IconPencil from '~icons/lucide/pencil'
import IconRefreshCw from '~icons/lucide/refresh-cw'
import IconLayoutList from '~icons/lucide/layout-list'
import IconLayoutGrid from '~icons/lucide/layout-grid'
import IconPlay from '~icons/lucide/play'
import IconTrash2 from '~icons/lucide/trash-2'
import { Header } from '@/components/Header'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import { scorePillClass } from '@/lib/score'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/login' })
  },
  loader: () => getWebsites(),
  component: DashboardComponent,
})

type Website = Awaited<ReturnType<typeof getWebsites>>[number]

function EditWebsiteDialog({ website, onSaved }: { website: Website; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(website.name)
  const [url, setUrl] = useState(website.url)
  const [faviconUrl, setFaviconUrl] = useState(website.faviconUrl ?? '')
  const [ogImageUrl, setOgImageUrl] = useState(website.ogImageUrl ?? '')
  const [formFactor, setFormFactor] = useState<'mobile' | 'desktop'>(website.formFactor ?? 'mobile')
  const [regenerating, setRegenerating] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(website.name)
      setUrl(website.url)
      setFaviconUrl(website.faviconUrl ?? '')
      setOgImageUrl(website.ogImageUrl ?? '')
      setFormFactor(website.formFactor ?? 'mobile')
    }
    setOpen(next)
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const meta = await fetchMetadataForUrl({ data: { url } })
      setFaviconUrl(meta.faviconUrl ?? '')
      setOgImageUrl(meta.ogImageUrl ?? '')
    } finally {
      setRegenerating(false)
    }
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await updateWebsite({
      data: {
        websiteId: website.id,
        name,
        url,
        faviconUrl: faviconUrl || null,
        ogImageUrl: ogImageUrl || null,
        formFactor,
      },
    })
    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="icon-sm" variant="ghost" />}>
        <IconPencil className="size-3.5" />
        <span className="sr-only">Edit</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Website</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-url">URL</Label>
            <Input
              id="edit-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-favicon">Favicon URL</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="h-6 text-xs px-2"
              >
                <IconRefreshCw className={`size-3 ${regenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {faviconUrl && (
                <img src={faviconUrl} alt="" className="w-5 h-5 object-contain shrink-0" />
              )}
              <Input
                id="edit-favicon"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="https://example.com/favicon.ico"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-og">OG Image URL</Label>
            <Input
              id="edit-og"
              value={ogImageUrl}
              onChange={(e) => setOgImageUrl(e.target.value)}
              placeholder="https://example.com/og.png"
            />
            {ogImageUrl && (
              <img src={ogImageUrl} alt="" className="w-full h-24 object-cover rounded-md" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Form Factor</Label>
            <div className="flex gap-2">
              {(['mobile', 'desktop'] as const).map((ff) => (
                <Button
                  key={ff}
                  type="button"
                  variant={formFactor === ff ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 capitalize"
                  onClick={() => setFormFactor(ff)}
                >
                  {ff}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type RunStatus = 'pending' | 'running' | 'completed' | 'failed'

type WebsiteViewProps = {
  websites: Website[]
  onTrigger: (id: string) => void
  onDelete: (id: string) => void
  onSaved: () => void
}

function WebsiteListView({ websites, onTrigger, onDelete, onSaved }: WebsiteViewProps) {
  return (
    <div className="flex flex-col gap-3">
      {websites.map((ws) => {
        const latest = ws.runs[0]
        return (
          <Card key={ws.id} className="overflow-hidden">
            <CardContent className="p-0 flex flex-col sm:flex-row">
              {ws.ogImageUrl ? (
                <Link
                  to="/websites/$websiteId"
                  params={{ websiteId: ws.id }}
                  viewTransition
                  className="sm:w-48 sm:shrink-0 h-32 sm:h-auto bg-muted overflow-hidden block shrink-0"
                  style={{ viewTransitionName: `website-og-${ws.id}` }}
                >
                  <img src={ws.ogImageUrl} alt={ws.name} className="w-full h-full object-cover" />
                </Link>
              ) : (
                <div className="hidden sm:block sm:w-48 sm:shrink-0 bg-muted" />
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-1 gap-2 p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    {ws.faviconUrl && (
                      <img
                        src={ws.faviconUrl}
                        alt=""
                        className="w-4 h-4 object-contain shrink-0"
                        style={{ viewTransitionName: `website-favicon-${ws.id}` }}
                      />
                    )}
                    <Link
                      to="/websites/$websiteId"
                      params={{ websiteId: ws.id }}
                      viewTransition
                      className="font-medium hover:underline"
                    >
                      {ws.name}
                    </Link>
                  </div>
                  <span className="text-sm text-muted-foreground">{ws.url}</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Latest:
                    {latest ? (
                      <RunStatusBadge status={latest.status as RunStatus} />
                    ) : (
                      ' No runs yet'
                    )}
                  </div>
                  {latest?.status === 'completed' && (
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Perf', value: latest.performanceScore },
                        { label: 'A11y', value: latest.accessibilityScore },
                        { label: 'BP',   value: latest.bestPracticesScore },
                        { label: 'SEO',  value: latest.seoScore },
                      ].map(({ label, value }) => (
                        <span
                          key={label}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${scorePillClass(value)}`}
                        >
                          {label} {value ?? '—'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <EditWebsiteDialog website={ws} onSaved={onSaved} />
                  <Button size="sm" onClick={() => onTrigger(ws.id)}>
                    Run Lighthouse
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(ws.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function WebsiteGridView({ websites, onTrigger, onDelete, onSaved }: WebsiteViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {websites.map((ws) => {
        const latest = ws.runs[0]
        return (
          <Card key={ws.id} className="overflow-hidden flex flex-col">
            <Link to="/websites/$websiteId" params={{ websiteId: ws.id }} className="block">
              <div className="aspect-video bg-muted overflow-hidden">
                {ws.ogImageUrl ? (
                  <img src={ws.ogImageUrl} alt={ws.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {ws.faviconUrl ? (
                      <img src={ws.faviconUrl} alt="" className="w-8 h-8 object-contain opacity-50" />
                    ) : (
                      <span className="text-2xl text-muted-foreground/40 font-bold select-none">
                        {ws.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
            <CardContent className="p-2 flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-1">
                {ws.faviconUrl && (
                  <img src={ws.faviconUrl} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                )}
                <Link
                  to="/websites/$websiteId"
                  params={{ websiteId: ws.id }}
                  className="text-sm font-medium truncate hover:underline"
                >
                  {ws.name}
                </Link>
              </div>
              <span className="text-[11px] text-muted-foreground truncate">{ws.url}</span>
              {latest && <RunStatusBadge status={latest.status as RunStatus} />}
              {latest?.status === 'completed' && (
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: 'P', value: latest.performanceScore },
                    { label: 'A', value: latest.accessibilityScore },
                    { label: 'B', value: latest.bestPracticesScore },
                    { label: 'S', value: latest.seoScore },
                  ].map(({ label, value }) => (
                    <span
                      key={label}
                      className={`text-[10px] px-1.5 py-0 rounded-full font-medium ${scorePillClass(value)}`}
                    >
                      {label} {value ?? '—'}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-1 mt-auto pt-1">
                <EditWebsiteDialog website={ws} onSaved={onSaved} />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  title="Run Lighthouse"
                  onClick={() => onTrigger(ws.id)}
                >
                  <IconPlay className="size-3" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  title="Delete"
                  onClick={() => onDelete(ws.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <IconTrash2 className="size-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function DashboardComponent() {
  const websites = Route.useLoaderData()
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    try { return (localStorage.getItem('lhci-dashboard-view') as 'list' | 'grid') ?? 'list' }
    catch { return 'list' }
  })
  const setAndPersistViewMode = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    try { localStorage.setItem('lhci-dashboard-view', mode) } catch {}
  }

  const handleDelete = async (websiteId: string) => {
    if (!confirm('Delete this website and all its runs?')) return
    await deleteWebsite({ data: { websiteId } })
    router.invalidate()
  }

  const handleTrigger = async (websiteId: string) => {
    await triggerAudit({ data: { websiteId } })
    router.invalidate()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Your Websites</h2>
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => setAndPersistViewMode('list')}
                title="List view"
              >
                <IconLayoutList className="size-3.5" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => setAndPersistViewMode('grid')}
                title="Grid view"
              >
                <IconLayoutGrid className="size-3.5" />
              </Button>
            </div>
          </div>
          {websites.length === 0 ? (
            <p className="text-muted-foreground text-sm">No websites yet. Click "+ Add Website" to get started.</p>
          ) : viewMode === 'list' ? (
            <WebsiteListView
              websites={websites}
              onTrigger={handleTrigger}
              onDelete={handleDelete}
              onSaved={() => router.invalidate()}
            />
          ) : (
            <WebsiteGridView
              websites={websites}
              onTrigger={handleTrigger}
              onDelete={handleDelete}
              onSaved={() => router.invalidate()}
            />
          )}
        </section>
      </main>
    </div>
  )
}
