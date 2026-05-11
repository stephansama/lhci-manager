import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { getWebsiteRuns, getSession, triggerAudit } from '@/services/websites'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LayoutList, LayoutGrid, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { scorePillClass, scoreClass, dotClass } from '@/lib/score'

export const Route = createFileRoute('/websites/$websiteId/')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/login' })
  },
  loader: ({ params }) => getWebsiteRuns({ data: { websiteId: params.websiteId } }),
  component: WebsiteDetailComponent,
})

const chartConfig = {
  performance:   { label: 'Performance',    color: '#3b82f6' },
  accessibility: { label: 'Accessibility',  color: '#22c55e' },
  bestPractices: { label: 'Best Practices', color: '#a855f7' },
  seo:           { label: 'SEO',            color: '#f97316' },
} satisfies ChartConfig

type RunStatus = 'pending' | 'running' | 'completed' | 'failed'
type ViewMode = 'list' | 'grid' | 'calendar'

type Run = NonNullable<Awaited<ReturnType<typeof getWebsiteRuns>>>['runs'][number]

function scoreLabel(score: number | null): string {
  if (score === null) return '—'
  if (score >= 90) return 'Good'
  if (score >= 50) return 'Needs Improvement'
  return 'Poor'
}

// ─── List View ──────────────────────────────────────────────────────────────

function RunHistoryList({ runs, websiteId }: { runs: Run[]; websiteId: string }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Perf</TableHead>
            <TableHead>A11y</TableHead>
            <TableHead>Best Practices</TableHead>
            <TableHead>SEO</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {new Date(r.createdAt).toLocaleString()}
              </TableCell>
              <TableCell>
                <RunStatusBadge status={r.status as RunStatus} />
              </TableCell>
              <TableCell className={scoreClass(r.performanceScore)}>
                {r.performanceScore ?? '—'}
              </TableCell>
              <TableCell className={scoreClass(r.accessibilityScore)}>
                {r.accessibilityScore ?? '—'}
              </TableCell>
              <TableCell className={scoreClass(r.bestPracticesScore)}>
                {r.bestPracticesScore ?? '—'}
              </TableCell>
              <TableCell className={scoreClass(r.seoScore)}>
                {r.seoScore ?? '—'}
              </TableCell>
              <TableCell>
                {r.status === 'completed' && (
                  <Link
                    to="/websites/$websiteId/runs/$runId"
                    params={{ websiteId, runId: r.id }}
                  >
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Grid View ───────────────────────────────────────────────────────────────

function RunHistoryGrid({ runs, websiteId }: { runs: Run[]; websiteId: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {runs.map((r) => {
        const inner = (
          <Card className="overflow-hidden h-full transition-shadow hover:shadow-md">
            <div className="aspect-video bg-muted overflow-hidden">
              {r.thumbnailDataUrl ? (
                <img
                  src={r.thumbnailDataUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <RunStatusBadge status={r.status as RunStatus} />
                </div>
              )}
            </div>
            <CardContent className="p-2 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <RunStatusBadge status={r.status as RunStatus} />
                <span className="text-[10px] text-muted-foreground truncate">
                  {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              {r.status === 'completed' && (
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: 'P', value: r.performanceScore },
                    { label: 'A', value: r.accessibilityScore },
                    { label: 'B', value: r.bestPracticesScore },
                    { label: 'S', value: r.seoScore },
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
            </CardContent>
          </Card>
        )

        if (r.status !== 'completed') {
          return <div key={r.id}>{inner}</div>
        }

        return (
          <Link
            key={r.id}
            to="/websites/$websiteId/runs/$runId"
            params={{ websiteId, runId: r.id }}
            className="block"
          >
            {inner}
          </Link>
        )
      })}
    </div>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function calendarDays(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function RunHistoryCalendar({ runs, websiteId }: { runs: Run[]; websiteId: string }) {
  const mostRecentRun = runs[0]
  const initialDate = mostRecentRun ? new Date(mostRecentRun.createdAt) : new Date()
  const [calendarDate, setCalendarDate] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  )

  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()

  const runsByDay = new Map<number, Run[]>()
  for (const r of runs) {
    const d = new Date(r.createdAt)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      const arr = runsByDay.get(day) ?? []
      arr.push(r)
      runsByDay.set(day, arr)
    }
  }

  const cells = calendarDays(year, month)
  const monthLabel = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1))

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
            <ChevronLeft size={14} />
          </Button>
          <span className="text-sm font-medium">{monthLabel}</span>
          <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
            <ChevronRight size={14} />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-center text-[11px] text-muted-foreground font-medium py-1">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            const dayRuns = day ? (runsByDay.get(day) ?? []) : []
            return (
              <div
                key={i}
                className="min-h-[52px] rounded-md border border-transparent p-1 flex flex-col gap-0.5 data-[today=true]:border-border data-[has-runs=true]:bg-muted/40"
                data-today={day === new Date().getDate() && year === new Date().getFullYear() && month === new Date().getMonth() || undefined}
                data-has-runs={dayRuns.length > 0 || undefined}
              >
                {day && (
                  <span className="text-[11px] text-muted-foreground leading-none">{day}</span>
                )}
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dayRuns.map((r) => {
                    const time = new Date(r.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    const dot = (
                      <span
                        className={`w-2.5 h-2.5 rounded-full inline-block cursor-pointer ${dotClass(r.performanceScore)}`}
                      />
                    )
                    const tooltipContent = (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{time} — {r.status}</span>
                        {r.status === 'completed' && (
                          <span className="text-muted-foreground">
                            Perf {r.performanceScore ?? '—'} &nbsp;
                            A11y {r.accessibilityScore ?? '—'} &nbsp;
                            BP {r.bestPracticesScore ?? '—'} &nbsp;
                            SEO {r.seoScore ?? '—'}
                          </span>
                        )}
                      </div>
                    )
                    return (
                      <Tooltip key={r.id}>
                        <TooltipTrigger>
                          {r.status === 'completed' ? (
                            <Link
                              to="/websites/$websiteId/runs/$runId"
                              params={{ websiteId, runId: r.id }}
                            >
                              {dot}
                            </Link>
                          ) : (
                            dot
                          )}
                        </TooltipTrigger>
                        <TooltipContent>{tooltipContent}</TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function WebsiteDetailComponent() {
  const site = Route.useLoaderData()
  const { websiteId } = Route.useParams()
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(`lhci-run-view-${websiteId}`) as ViewMode) ?? 'list' }
    catch { return 'list' }
  })
  const setAndPersistViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    try { localStorage.setItem(`lhci-run-view-${websiteId}`, mode) } catch {}
  }

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

  const latestCompleted = site.runs.find(r => r.status === 'completed')

  const chartData = site.runs
    .filter(r => r.status === 'completed' && r.performanceScore !== null)
    .reverse()
    .map(r => ({
      date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      performance: r.performanceScore,
      accessibility: r.accessibilityScore,
      bestPractices: r.bestPracticesScore,
      seo: r.seoScore,
    }))

  const handleTrigger = async () => {
    await triggerAudit({ data: { websiteId } })
    router.invalidate()
  }

  const scoreCards = [
    { key: 'performance',   label: 'Performance',    value: latestCompleted?.performanceScore ?? null },
    { key: 'accessibility', label: 'Accessibility',  value: latestCompleted?.accessibilityScore ?? null },
    { key: 'bestPractices', label: 'Best Practices', value: latestCompleted?.bestPracticesScore ?? null },
    { key: 'seo',           label: 'SEO',            value: latestCompleted?.seoScore ?? null },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">← Dashboard</Button>
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {site.ogImageUrl && (
            <div
              className="relative overflow-hidden bg-muted rounded-xl"
              style={{ viewTransitionName: `website-og-${websiteId}` }}
            >
              <img src={site.ogImageUrl} alt="" className="w-full object-cover max-h-52" />
              {site.faviconUrl && (
                <img
                  src={site.faviconUrl}
                  alt=""
                  className="absolute bottom-3 left-3 size-10 rounded-lg shadow-lg ring-2 ring-background"
                  style={{ viewTransitionName: `website-favicon-${websiteId}` }}
                />
              )}
            </div>
          )}

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {site.faviconUrl && !site.ogImageUrl && (
                <img
                  src={site.faviconUrl}
                  alt=""
                  className="size-8 rounded-md shrink-0"
                  style={{ viewTransitionName: `website-favicon-${websiteId}` }}
                />
              )}
              <div>
                <h1 className="text-2xl font-semibold">{site.name}</h1>
                <p className="text-sm text-muted-foreground">{site.url}</p>
              </div>
            </div>
            <Button onClick={handleTrigger} className="sm:shrink-0">Run Lighthouse</Button>
          </div>
        </div>

        {latestCompleted && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {scoreCards.map(({ key, label, value }) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  <span className={`text-4xl font-bold tabular-nums ${scoreClass(value)}`}>
                    {value ?? '—'}
                  </span>
                  <span className="text-xs text-muted-foreground">{scoreLabel(value)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {chartData.length >= 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Score Trends</CardTitle>
              <CardDescription>
                {chartData.length} completed run{chartData.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={30} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line dataKey="performance"   stroke="var(--color-performance)"   dot={false} strokeWidth={2} />
                  <Line dataKey="accessibility" stroke="var(--color-accessibility)" dot={false} strokeWidth={2} />
                  <Line dataKey="bestPractices" stroke="var(--color-bestPractices)" dot={false} strokeWidth={2} />
                  <Line dataKey="seo"           stroke="var(--color-seo)"           dot={false} strokeWidth={2} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Run History</h2>
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => setAndPersistViewMode('list')}
                title="List view"
              >
                <LayoutList size={14} />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => setAndPersistViewMode('grid')}
                title="Grid view"
              >
                <LayoutGrid size={14} />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={() => setAndPersistViewMode('calendar')}
                title="Calendar view"
              >
                <CalendarDays size={14} />
              </Button>
            </div>
          </div>

          {site.runs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No runs yet. Click "Run Lighthouse" to start.
            </p>
          ) : viewMode === 'list' ? (
            <RunHistoryList runs={site.runs} websiteId={websiteId} />
          ) : viewMode === 'grid' ? (
            <RunHistoryGrid runs={site.runs} websiteId={websiteId} />
          ) : (
            <RunHistoryCalendar runs={site.runs} websiteId={websiteId} />
          )}
        </div>
      </div>
    </div>
  )
}
