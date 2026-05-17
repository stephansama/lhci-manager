import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getPublicRunDetail } from '@/services/public'
import { Button } from '@/components/ui/button'
import { RunDetailView } from '@/components/RunDetailView'

export const Route = createFileRoute('/p/$websiteId/runs/$runId')({
  loader: async ({ params }) => {
    const data = await getPublicRunDetail({
      data: { websiteId: params.websiteId, runId: params.runId },
    })
    if (!data) throw notFound()
    return data
  },
  notFoundComponent: () => (
    <div className="max-w-6xl mx-auto px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold mb-2">Not available</h1>
      <p className="text-muted-foreground">This run is not public or does not exist.</p>
    </div>
  ),
  component: PublicRunDetailComponent,
})

function PublicRunDetailComponent() {
  const runRecord = Route.useLoaderData()
  const { websiteId } = Route.useParams()
  const siteName = runRecord?.website?.name ?? 'Website'

  const back = (
    <Link to="/p/$websiteId" params={{ websiteId }}>
      <Button variant="ghost" size="sm">
        ← {siteName}
      </Button>
    </Link>
  )

  return <RunDetailView runRecord={runRecord} back={back} />
}
