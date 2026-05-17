import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getRunDetail, getSession, setRunVisibility } from "@/services/websites";
import { Button } from "@/components/ui/button";
import { RunDetailView } from "@/components/RunDetailView";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, Check, Copy } from "lucide-react";

export const Route = createFileRoute("/websites/$websiteId/runs/$runId")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  loader: ({ params }) => getRunDetail({ data: { runId: params.runId } }),
  component: RunDetailComponent,
});

function RunSharingControl({
  runId,
  websiteId,
  isPublic,
}: {
  runId: string;
  websiteId: string;
  isPublic: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${websiteId}/runs/${runId}`
      : `/p/${websiteId}/runs/${runId}`;

  const toggle = async (next: boolean) => {
    await setRunVisibility({ data: { runId, isPublic: next } });
    router.invalidate();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Share2 size={14} />
        <span className="ml-1.5">Share</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem onSelect={() => toggle(false)}>
          <span className="flex-1">Private</span>
          {!isPublic && <Check size={14} />}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toggle(true)}>
          <span className="flex-1">Public</span>
          {isPublic && <Check size={14} />}
        </DropdownMenuItem>
        {isPublic && (
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
  );
}

function RunDetailComponent() {
  const runRecord = Route.useLoaderData();
  const { websiteId, runId } = Route.useParams();
  const siteName = runRecord?.website?.name ?? "Website";

  const back = (
    <Link to="/websites/$websiteId" params={{ websiteId }}>
      <Button variant="ghost" size="sm">
        ← {siteName}
      </Button>
    </Link>
  );

  const actionsSlot = runRecord ? (
    <RunSharingControl
      runId={runId}
      websiteId={websiteId}
      isPublic={Boolean(runRecord.isPublic)}
    />
  ) : null;

  return <RunDetailView runRecord={runRecord} back={back} actionsSlot={actionsSlot} />;
}
