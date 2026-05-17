import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getPublicWebsiteOverview } from '@/services/public'
import { WebsiteDetailView } from '@/components/WebsiteDetailView'

export const Route = createFileRoute('/p/$websiteId/')({
  loader: async ({ params }) => {
    const data = await getPublicWebsiteOverview({ data: { websiteId: params.websiteId } })
    if (!data) throw notFound()
    return data
  },
  notFoundComponent: PublicNotFound,
  component: PublicWebsiteComponent,
})

function PublicNotFound() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold mb-2">Not available</h1>
      <p className="text-muted-foreground">This page is not public or does not exist.</p>
    </div>
  )
}

function PublicWebsiteComponent() {
  const { site, runs } = Route.useLoaderData()
  const { websiteId } = Route.useParams()

  const siteWithRuns = { ...site, cronExpression: null, runs }

  return (
    <WebsiteDetailView
      site={siteWithRuns}
      viewModeKey={`public-${websiteId}`}
      backSlot={null}
      renderRunLink={(run, children) => (
        <Link to="/p/$websiteId/runs/$runId" params={{ websiteId, runId: run.id }}>
          {children}
        </Link>
      )}
    />
  )
}
