import { useState, type ReactNode } from 'react'
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
import { scorePillClass, dotClass, scoreColorVar } from '@/lib/score'
import { ScoreCell } from '@/components/ScoreCell'
import { cn } from '@/lib/utils'

const chartConfig = {
  performance:   { label: 'Performance',    color: '#3b82f6' },
  accessibility: { label: 'Accessibility',  color: '#22c55e' },
  bestPractices: { label: 'Best Practices', color: '#a855f7' },
  seo:           { label: 'SEO',            color: '#f97316' },
} satisfies ChartConfig

type RunStatus = 'pending' | 'running' | 'completed' | 'failed'
type ViewMode = 'list' | 'grid' | 'calendar'

export type WebsiteRun = {
  id: string
  status: string
  performanceScore: number | null
  accessibilityScore: number | null
  bestPracticesScore: number | null
  seoScore: number | null
  thumbnailDataUrl: string | null
  createdAt: string | Date
}

export type WebsiteRecord = {
  id: string
  name: string
  url: string
  faviconUrl: string | null
  ogImageUrl: string | null
  formFactor: 'mobile' | 'desktop'
  cronExpression: string | null
  runs: WebsiteRun[]
}

type RunLinkRenderer = (run: WebsiteRun, children: ReactNode) => ReactNode

function scoreLabel(score: number | null): string {
  if (score === null) return '—'
  if (score >= 90) return 'Good'
  if (score >= 50) return 'Needs Improvement'
  return 'Poor'
}

// ─── List View ──────────────────────────────────────────────────────────────

function RunHistoryList({ runs, renderRunLink }: { runs: WebsiteRun[]; renderRunLink: RunLinkRenderer }) {
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
              <TableCell><ScoreCell score={r.performanceScore} /></TableCell>
              <TableCell><ScoreCell score={r.accessibilityScore} /></TableCell>
              <TableCell><ScoreCell score={r.bestPracticesScore} /></TableCell>
              <TableCell><ScoreCell score={r.seoScore} /></TableCell>
              <TableCell>
                {r.status === 'completed' && renderRunLink(
                  r,
                  <Button variant="ghost" size="sm">View</Button>,
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

function RunHistoryGrid({ runs, renderRunLink }: { runs: WebsiteRun[]; renderRunLink: RunLinkRenderer }) {
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

        return <div key={r.id} className="block">{renderRunLink(r, inner)}</div>
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

function RunHistoryCalendar({ runs, renderRunLink }: { runs: WebsiteRun[]; renderRunLink: RunLinkRenderer }) {
  const mostRecentRun = runs[0]
  const initialDate = mostRecentRun ? new Date(mostRecentRun.createdAt) : new Date()
  const [calendarDate, setCalendarDate] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  )

  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()

  const runsByDay = new Map<number, WebsiteRun[]>()
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
                          {r.status === 'completed' ? renderRunLink(r, dot) : dot}
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

// ─── Main View ────────────────────────────────────────────────────────────────

export function WebsiteDetailView({
  site,
  backSlot,
  actionsSlot,
  renderRunLink,
  viewModeKey,
}: {
  site: WebsiteRecord
  backSlot: ReactNode
  actionsSlot?: ReactNode
  renderRunLink: RunLinkRenderer
  viewModeKey: string
}) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(`lhci-run-view-${viewModeKey}`) as ViewMode) ?? 'list' }
    catch { return 'list' }
  })
  const setAndPersistViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    try { localStorage.setItem(`lhci-run-view-${viewModeKey}`, mode) } catch {}
  }

  const completedRuns = site.runs.filter(r => r.status === 'completed')
  const latestCompleted = completedRuns[0]
  const prevCompleted = completedRuns[1]

  const chartData = site.runs
    .filter(r => r.status === 'completed' && r.performanceScore !== null)
    .slice()
    .reverse()
    .map(r => ({
      date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      performance: r.performanceScore,
      accessibility: r.accessibilityScore,
      bestPractices: r.bestPracticesScore,
      seo: r.seoScore,
    }))

  const scoreCards = [
    { key: 'performance',   label: 'Performance',    value: latestCompleted?.performanceScore ?? null,   prev: prevCompleted?.performanceScore ?? null },
    { key: 'accessibility', label: 'Accessibility',  value: latestCompleted?.accessibilityScore ?? null, prev: prevCompleted?.accessibilityScore ?? null },
    { key: 'bestPractices', label: 'Best Practices', value: latestCompleted?.bestPracticesScore ?? null, prev: prevCompleted?.bestPracticesScore ?? null },
    { key: 'seo',           label: 'SEO',            value: latestCompleted?.seoScore ?? null,           prev: prevCompleted?.seoScore ?? null },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-4">{backSlot}</div>

        <div className="flex flex-col gap-3">
          {site.ogImageUrl && (
            <div
              className="relative overflow-hidden bg-muted rounded-xl w-full h-52"
              style={{ viewTransitionName: `website-og-${site.id}` }}
            >
              <img src={site.ogImageUrl} alt="" className="w-full h-full object-cover" />
              {site.faviconUrl && (
                <img
                  src={site.faviconUrl}
                  alt=""
                  className="absolute bottom-3 left-3 size-10 rounded-lg shadow-lg ring-2 ring-background"
                  style={{ viewTransitionName: `website-favicon-${site.id}` }}
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
                  style={{ viewTransitionName: `website-favicon-${site.id}` }}
                />
              )}
              <div>
                <h1 className="text-2xl font-semibold">{site.name}</h1>
                <p className="text-sm text-muted-foreground">{site.url}</p>
              </div>
            </div>
            {actionsSlot}
          </div>
        </div>

        {latestCompleted && (
          <div className="grid grid-cols-2 border rounded-lg overflow-hidden">
            {scoreCards.map(({ key, label, value, prev }, i) => {
              const delta = value !== null && prev !== null ? value - prev : null
              const color = scoreColorVar(value)
              return (
                <div
                  key={key}
                  className={cn('p-4 flex flex-col gap-2', i % 2 === 0 && 'border-r', i < 2 && 'border-b')}
                >
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))' }}>
                    {label}
                  </span>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 48, fontWeight: 300, color, lineHeight: 1 }}>
                    {value ?? '—'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{scoreLabel(value)}</span>
                    {delta !== null && (
                      <span className={`text-xs font-medium tabular-nums ${delta > 0 ? 'text-green-600 dark:text-green-400' : delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {chartData.length >= 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="section-label">Score Trends</CardTitle>
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
            <p className="section-label">Run History</p>
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
            <p className="text-muted-foreground text-sm">No runs yet.</p>
          ) : viewMode === 'list' ? (
            <RunHistoryList runs={site.runs} renderRunLink={renderRunLink} />
          ) : viewMode === 'grid' ? (
            <RunHistoryGrid runs={site.runs} renderRunLink={renderRunLink} />
          ) : (
            <RunHistoryCalendar runs={site.runs} renderRunLink={renderRunLink} />
          )}
        </div>
      </div>
    </div>
  )
}
