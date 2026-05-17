import { useEffect, useRef, type ReactNode } from "react";
import { AnchorProvider, ScrollProvider, TOCItem } from "fumadocs-core/toc";
import type { TOCItemType } from "fumadocs-core/toc";
import { cn } from "@/lib/utils";
import { scoreColorVar } from "@/lib/score";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RunStatusBadge } from "@/components/RunStatusBadge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FilmstripItem = { timing: number; timestamp: number; data: string };

type LHRAuditDetails = {
  type: string;
  items?: Record<string, unknown>[];
  data?: string;
  scale?: number;
  headings?: { key: string; valueType: string; label: string }[];
};

type LHRAudit = {
  id: string;
  title: string;
  description: string;
  score: number | null;
  scoreDisplayMode: string;
  displayValue?: string;
  numericValue?: number;
  details?: LHRAuditDetails;
  warnings?: string[];
};

type LHR = {
  fetchTime: string;
  finalDisplayedUrl: string;
  lighthouseVersion?: string;
  configSettings?: { formFactor?: string };
  categories: Record<
    string,
    {
      title: string;
      score: number | null;
      auditRefs: { id: string; weight: number; group?: string }[];
    }
  >;
  audits: Record<string, LHRAudit>;
};

type RunStatus = "pending" | "running" | "completed" | "failed";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RunDetailRecord = any;

function scoreLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 90) return "Good";
  if (score >= 50) return "Needs Improvement";
  return "Poor";
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}

function renderCellValue(value: unknown, valueType?: string): ReactNode {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const t = (typeof obj.type === "string" ? obj.type : undefined) ?? valueType;

    switch (t) {
      case "node": {
        const nodeLabel = typeof obj.nodeLabel === "string" ? obj.nodeLabel : undefined;
        const snippet = typeof obj.snippet === "string" ? obj.snippet : undefined;
        const selector = typeof obj.selector === "string" ? obj.selector : undefined;
        return (
          <div className="flex flex-col gap-0.5 min-w-0">
            {nodeLabel && <span className="truncate">{nodeLabel}</span>}
            {snippet && (
              <code className="text-[10px] font-mono text-muted-foreground truncate block">
                {snippet}
              </code>
            )}
            {selector && !snippet && (
              <code className="text-[10px] font-mono text-muted-foreground truncate block">
                {selector}
              </code>
            )}
          </div>
        );
      }
      case "source-location": {
        const url = typeof obj.url === "string" ? obj.url : undefined;
        const line = typeof obj.line === "number" ? obj.line : undefined;
        const column = typeof obj.column === "number" ? obj.column : undefined;
        if (!url) return null;
        const suffix = `${line != null ? `:${line + 1}` : ""}${column != null ? `:${column + 1}` : ""}`;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate inline-block max-w-full"
          >
            {url}
            {suffix}
          </a>
        );
      }
      case "url": {
        const v = typeof obj.value === "string" ? obj.value : undefined;
        if (!v) return null;
        return (
          <a
            href={v}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate inline-block max-w-full"
          >
            {v}
          </a>
        );
      }
      case "link": {
        const url = typeof obj.url === "string" ? obj.url : undefined;
        const text = typeof obj.text === "string" ? obj.text : (url ?? "");
        if (!url) return text;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {text}
          </a>
        );
      }
      case "code":
        return <code className="text-[11px] font-mono">{String(obj.value ?? "")}</code>;
      case "text":
      case "numeric":
        return String(obj.value ?? "");
      case "thumbnail": {
        const src = typeof obj.value === "string" ? obj.value : undefined;
        return src ? <img src={src} alt="" className="h-8 w-auto rounded" /> : null;
      }
      default:
        return <code className="text-[10px] font-mono text-muted-foreground">{JSON.stringify(value)}</code>;
    }
  }

  if (typeof value === "number") {
    switch (valueType) {
      case "bytes":
        return formatBytes(value);
      case "ms":
      case "timespanMs":
        return `${Math.round(value)} ms`;
      default:
        return String(value);
    }
  }

  if (typeof value === "string") {
    if (valueType === "url") {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline truncate inline-block max-w-full"
        >
          {value}
        </a>
      );
    }
    return value;
  }

  return String(value);
}

function AuditIcon({ score, mode }: { score: number | null; mode: string }) {
  const base = "w-4 text-center font-mono text-xs shrink-0 mt-0.5 select-none";
  if (
    !mode ||
    ["informative", "notApplicable", "manual"].includes(mode) ||
    score === null
  ) {
    return <span className={`${base} text-muted-foreground/40`}>–</span>;
  }
  if (score >= 0.9)
    return (
      <span className={base} style={{ color: "var(--score-good)" }}>
        ✓
      </span>
    );
  if (score >= 0.5)
    return (
      <span className={base} style={{ color: "var(--score-warn)" }}>
        !
      </span>
    );
  return (
    <span className={base} style={{ color: "var(--score-bad)" }}>
      ✕
    </span>
  );
}

function TocThumb({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const thumb = thumbRef.current;
    if (!container || !thumb) return;

    const update = () => {
      const active = container.querySelector<HTMLElement>(
        'a[data-active="true"]',
      );
      if (!active) return;
      const top = active.offsetTop;
      const containerHeight = container.scrollHeight;
      thumb.style.setProperty("--track-top", `${top}px`);
      thumb.style.setProperty(
        "--track-bottom",
        `${Math.max(0, containerHeight - top - active.offsetHeight)}px`,
      );
    };

    const observer = new MutationObserver(update);
    container.querySelectorAll("a").forEach((a) => {
      observer.observe(a, {
        attributes: true,
        attributeFilter: ["data-active"],
      });
    });
    update();
    return () => observer.disconnect();
  }, [containerRef]);

  return (
    <div
      ref={thumbRef}
      className="absolute inset-y-0 left-0 w-px bg-primary transition-[clip-path] duration-200 ease-linear"
      style={{
        clipPath: "inset(var(--track-top, 0) 0 var(--track-bottom, 100%) 0)",
      }}
    />
  );
}

const CATEGORY_ORDER = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
];

export function RunDetailView({
  runRecord,
  back,
  actionsSlot,
}: {
  runRecord: RunDetailRecord;
  back: ReactNode;
  actionsSlot?: ReactNode;
}) {
  const tocRef = useRef<HTMLDivElement>(null);

  if (!runRecord) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-muted-foreground mb-4">Run not found.</p>
        {back}
      </div>
    );
  }

  const lhr = runRecord.fullReportJson as unknown as LHR | null;

  const filmstripDetail = lhr?.audits["screenshot-thumbnails"]?.details;
  const filmstripItems: FilmstripItem[] =
    filmstripDetail?.type === "filmstrip"
      ? ((filmstripDetail.items as unknown as FilmstripItem[]) ?? [])
      : [];

  const finalScreenshotDetail = lhr?.audits["final-screenshot"]?.details;
  const finalScreenshotData =
    finalScreenshotDetail?.type === "screenshot"
      ? finalScreenshotDetail.data
      : null;

  const failedAudits = lhr
    ? Object.values(lhr.audits)
        .filter(
          (a) =>
            a.score !== null &&
            a.score < 0.9 &&
            !["informative", "notApplicable", "manual"].includes(
              a.scoreDisplayMode,
            ),
        )
        .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
    : [];

  const scoreCards = [
    { key: "performance", label: "Performance", value: runRecord.performanceScore as number | null },
    { key: "accessibility", label: "Accessibility", value: runRecord.accessibilityScore as number | null },
    { key: "bestPractices", label: "Best Practices", value: runRecord.bestPracticesScore as number | null },
    { key: "seo", label: "SEO", value: runRecord.seoScore as number | null },
  ];

  const catScoreMap: Record<string, number | null> = {};
  if (lhr) {
    for (const catId of CATEGORY_ORDER) {
      const cat = lhr.categories[catId];
      if (cat)
        catScoreMap[`#cat-${catId}`] =
          cat.score !== null ? Math.round(cat.score * 100) : null;
    }
  }

  const tocItems: TOCItemType[] = [
    ...(runRecord.status === "completed"
      ? [{ url: "#scores", title: "Scores", depth: 1 }]
      : []),
    ...(filmstripItems.length > 0
      ? [{ url: "#paint-timeline", title: "Paint Timeline", depth: 1 }]
      : []),
    ...(failedAudits.length > 0
      ? [{ url: "#needs-attention", title: "Needs Attention", depth: 1 }]
      : []),
    ...(lhr
      ? [
          { url: "#audit-breakdown", title: "Audit Breakdown", depth: 1 },
          ...CATEGORY_ORDER.filter((catId) => lhr.categories[catId]).map(
            (catId) => ({
              url: `#cat-${catId}`,
              title: lhr.categories[catId].title,
              depth: 2,
            }),
          ),
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <AnchorProvider toc={tocItems} single>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <div>{back}</div>
            {actionsSlot}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold">Run Details</h1>
              <RunStatusBadge status={runRecord.status as RunStatus} />
            </div>
            <div className="flex flex-wrap gap-5">
              {[
                {
                  key: "Timestamp",
                  value: new Date(
                    runRecord.createdAt as string,
                  ).toLocaleString(),
                },
                ...(lhr?.finalDisplayedUrl
                  ? [{ key: "URL", value: lhr.finalDisplayedUrl }]
                  : []),
                ...(lhr?.configSettings?.formFactor
                  ? [
                      {
                        key: "Device",
                        value:
                          lhr.configSettings.formFactor.charAt(0).toUpperCase() +
                          lhr.configSettings.formFactor.slice(1),
                      },
                    ]
                  : []),
                ...(lhr?.lighthouseVersion
                  ? [{ key: "Lighthouse", value: `v${lhr.lighthouseVersion}` }]
                  : []),
              ].map(({ key, value }) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <span
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    {key}
                  </span>
                  <span
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 12,
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-10 items-start">
            <div className="flex-1 min-w-0 flex flex-col gap-6">
              {runRecord.status === "completed" && (
                <>
                  <span id="scores" />
                  <section className="grid grid-cols-2 border rounded-lg overflow-hidden">
                    {scoreCards.map(({ key, label, value }, i) => {
                      const color = scoreColorVar(value);
                      return (
                        <div
                          key={key}
                          className={cn(
                            "p-4 flex flex-col gap-2",
                            i % 2 === 0 && "border-r",
                            i < 2 && "border-b",
                          )}
                        >
                          <span
                            style={{
                              fontFamily: "ui-monospace, monospace",
                              fontSize: 10,
                              fontWeight: 500,
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.08em",
                              color: "hsl(var(--muted-foreground))",
                            }}
                          >
                            {label}
                          </span>
                          <span
                            style={{
                              fontFamily: "ui-monospace, monospace",
                              fontSize: 48,
                              fontWeight: 300,
                              color,
                              lineHeight: 1,
                            }}
                          >
                            {value ?? "—"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {scoreLabel(value)}
                          </span>
                        </div>
                      );
                    })}
                  </section>
                </>
              )}

              {filmstripItems.length > 0 && (
                <>
                  <span id="paint-timeline" />
                  <section>
                    <Card>
                      <CardHeader>
                        <CardTitle className="section-label">
                          Paint Timeline
                        </CardTitle>
                        <CardDescription>
                          Screenshots captured during page load
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {filmstripItems.map((item, i) => (
                            <div
                              key={i}
                              className="flex flex-col items-center gap-1.5 shrink-0"
                            >
                              <img
                                src={item.data}
                                alt={`${item.timing}ms`}
                                className="h-28 w-auto rounded border object-contain bg-muted"
                              />
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {item.timing}ms
                              </span>
                            </div>
                          ))}
                        </div>
                        {finalScreenshotData && (
                          <div className="flex flex-col gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              Final Screenshot
                            </span>
                            <img
                              src={finalScreenshotData}
                              alt="Final page state"
                              className="max-h-80 w-auto rounded border object-contain bg-muted"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </section>
                </>
              )}

              {failedAudits.length > 0 && (
                <>
                  <span id="needs-attention" />
                  <section className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <p className="section-label">Needs Attention</p>
                      <Badge variant="secondary">{failedAudits.length}</Badge>
                    </div>
                    <Accordion multiple className="flex flex-col gap-2">
                      {failedAudits.map((audit) => (
                        <AccordionItem
                          key={audit.id}
                          value={audit.id}
                          className="rounded-lg border bg-card shadow-sm px-4"
                        >
                          <AccordionTrigger className="py-3 gap-3 hover:no-underline">
                            <span
                              className={`size-2.5 shrink-0 rounded-full ${
                                audit.score !== null && audit.score < 0.5
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                              }`}
                            />
                            <span className="flex-1 text-sm font-medium leading-snug text-left">
                              {audit.title}
                            </span>
                            {audit.displayValue && (
                              <span className="text-sm text-muted-foreground shrink-0 ml-2">
                                {audit.displayValue}
                              </span>
                            )}
                          </AccordionTrigger>
                          <AccordionContent className="flex flex-col gap-3 pb-4">
                            {audit.description && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {audit.description}
                              </p>
                            )}
                            {audit.warnings && audit.warnings.length > 0 && (
                              <div className="flex flex-col gap-1">
                                {audit.warnings.map((w, i) => (
                                  <p
                                    key={i}
                                    className="text-xs text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/40 rounded px-2 py-1"
                                  >
                                    {w}
                                  </p>
                                ))}
                              </div>
                            )}
                            {audit.details?.type === "table" &&
                              (audit.details.items?.length ?? 0) > 0 && (
                                <div className="rounded border overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        {(audit.details.headings ?? []).map(
                                          (h, i) => (
                                            <TableHead
                                              key={i}
                                              className="text-xs"
                                            >
                                              {h.label}
                                            </TableHead>
                                          ),
                                        )}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {(audit.details.items ?? [])
                                        .slice(0, 10)
                                        .map((row, ri) => (
                                          <TableRow key={ri}>
                                            {(audit.details!.headings ?? []).map(
                                              (h, ci) => (
                                                <TableCell
                                                  key={ci}
                                                  className="text-xs max-w-xs align-top"
                                                >
                                                  {renderCellValue(row[h.key], h.valueType)}
                                                </TableCell>
                                              ),
                                            )}
                                          </TableRow>
                                        ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </section>
                </>
              )}

              {lhr && (
                <>
                  <span id="audit-breakdown" />
                  <section className="flex flex-col gap-4">
                    <p className="section-label">Audit Breakdown</p>
                    <Accordion
                      multiple
                      defaultValue={CATEGORY_ORDER}
                      className="flex flex-col gap-4"
                    >
                      {CATEGORY_ORDER.map((catId) => {
                        const cat = lhr.categories[catId];
                        if (!cat) return null;
                        const catScore =
                          cat.score !== null
                            ? Math.round(cat.score * 100)
                            : null;
                        const catAudits = cat.auditRefs
                          .map((ref) => lhr.audits[ref.id])
                          .filter(Boolean);

                        return (
                          <AccordionItem
                            key={catId}
                            value={catId}
                            className="border-none gap-2"
                          >
                            <span id={`cat-${catId}`} />
                            <AccordionTrigger className="py-1 gap-3 hover:no-underline">
                              <span className="font-semibold text-sm min-w-[130px] text-left">
                                {cat.title}
                              </span>
                              <div className="flex-1 my-auto h-[3px] bg-border rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${catScore ?? 0}%`,
                                    background: scoreColorVar(catScore),
                                  }}
                                />
                              </div>
                              <span
                                className="font-mono text-sm font-medium tabular-nums min-w-[30px] text-right"
                                style={{ color: scoreColorVar(catScore) }}
                              >
                                {catScore ?? "—"}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-1">
                              <div className="rounded-lg border divide-y overflow-hidden">
                                {catAudits.map((audit) => (
                                  <div
                                    key={audit.id}
                                    className="flex items-start gap-3 px-4 py-2.5"
                                  >
                                    <AuditIcon
                                      score={audit.score}
                                      mode={audit.scoreDisplayMode}
                                    />
                                    <span className="flex-1 text-sm leading-snug">
                                      {audit.title}
                                    </span>
                                    {audit.displayValue && (
                                      <span className="text-xs text-muted-foreground shrink-0 text-right">
                                        {audit.displayValue}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </section>
                </>
              )}
            </div>

            {tocItems.length > 0 && (
              <aside className="hidden lg:block w-48 shrink-0 sticky top-8 self-start">
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                  On this page
                </p>
                <ScrollProvider containerRef={tocRef}>
                  <div
                    ref={tocRef}
                    className="relative flex flex-col overflow-auto max-h-[calc(100vh-6rem)] [scrollbar-width:none]"
                  >
                    <div
                      className="absolute inset-y-0 left-0 w-px bg-border"
                      aria-hidden
                    />
                    <TocThumb containerRef={tocRef} />
                    {tocItems.map((item) => {
                      const catScore = catScoreMap[item.url];
                      return (
                        <TOCItem
                          key={item.url}
                          href={item.url}
                          className={cn(
                            "py-1.5 text-sm transition-colors break-words flex items-center",
                            "text-muted-foreground hover:text-foreground",
                            item.depth === 1 ? "ps-3" : "ps-6 text-xs",
                            "data-[active=true]:text-primary data-[active=true]:font-medium data-[active=true]:bg-primary/5",
                          )}
                        >
                          <span className="flex-1">{item.title}</span>
                          {catScore !== undefined && catScore !== null && (
                            <span
                              className="tabular-nums shrink-0 ml-2"
                              style={{
                                fontFamily: "ui-monospace, monospace",
                                fontSize: 11,
                                color: scoreColorVar(catScore),
                              }}
                            >
                              {catScore}
                            </span>
                          )}
                        </TOCItem>
                      );
                    })}
                  </div>
                </ScrollProvider>
              </aside>
            )}
          </div>
        </div>
      </AnchorProvider>
    </div>
  );
}
