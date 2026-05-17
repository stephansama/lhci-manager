import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { getWebsiteRuns, getSession, triggerAudit, setWebsiteVisibility } from '@/services/websites'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { WebsiteDetailView } from '@/components/WebsiteDetailView'
import { EditWebsiteDialog } from '@/components/EditWebsiteDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Share2, Check, Copy } from 'lucide-react'

type Visibility = 'private' | 'public_latest' | 'public_all'

const VISIBILITY_LABEL: Record<Visibility, string> = {
  private: 'Private',
  public_latest: 'Public — latest run',
  public_all: 'Public — all runs',
}

export const Route = createFileRoute('/websites/$websiteId/')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/login' })
  },
  loader: ({ params }) => getWebsiteRuns({ data: { websiteId: params.websiteId } }),
  component: WebsiteDetailComponent,
})

function SharingControl({ websiteId, visibility }: { websiteId: string; visibility: Visibility }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/p/${websiteId}` : `/p/${websiteId}`

  const setVisibility = async (next: Visibility) => {
    await setWebsiteVisibility({ data: { websiteId, visibility: next } })
    router.invalidate()
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Share2 size={14} />
        <span className="ml-1.5">Share</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {(Object.keys(VISIBILITY_LABEL) as Visibility[]).map((v) => (
          <DropdownMenuItem key={v} onSelect={() => setVisibility(v)}>
            <span className="flex-1">{VISIBILITY_LABEL[v]}</span>
            {v === visibility && <Check size={14} />}
          </DropdownMenuItem>
        ))}
        {visibility !== 'private' && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Public URL
              </span>
              <div className="flex items-center gap-1">
                <code className="text-xs flex-1 truncate bg-muted rounded px-1.5 py-1">
                  {publicUrl}
                </code>
                <Button variant="ghost" size="icon-sm" onClick={copy} title="Copy URL">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function WebsiteDetailComponent() {
  const site = Route.useLoaderData()
  const { websiteId } = Route.useParams()
  const router = useRouter()

  if (!site) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-muted-foreground mb-4">Website not found.</p>
        <Link to="/">
          <Button variant="ghost" size="sm">← Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const handleTrigger = async () => {
    await triggerAudit({ data: { websiteId } })
    router.invalidate()
  }

  return (
    <WebsiteDetailView
      site={site}
      viewModeKey={websiteId}
      backSlot={
        <Link to="/">
          <Button variant="ghost" size="sm">← Dashboard</Button>
        </Link>
      }
      actionsSlot={
        <div className="flex items-center gap-2 sm:shrink-0">
          <EditWebsiteDialog website={site} onSaved={() => router.invalidate()} />
          <SharingControl websiteId={websiteId} visibility={site.visibility as Visibility} />
          <Button onClick={handleTrigger}>Run Lighthouse</Button>
        </div>
      }
      renderRunLink={(run, children) => (
        <Link
          to="/websites/$websiteId/runs/$runId"
          params={{ websiteId, runId: run.id }}
        >
          {children}
        </Link>
      )}
    />
  )
}
