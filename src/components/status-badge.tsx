import { Badge } from "@/components/ui/panel";

const MAP: Record<string, { label: string; tone: "neutral" | "pin" | "ok" | "info" | "danger"; live?: boolean }> = {
  PENDING: { label: "Queued", tone: "neutral", live: true },
  RUNNING: { label: "Searching", tone: "info", live: true },
  IMPORTING: { label: "Saving leads", tone: "info", live: true },
  DONE: { label: "Done", tone: "ok" },
  FAILED: { label: "Failed", tone: "danger" },
};

export function JobStatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Badge tone={s.tone}>
      {s.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden />}
      {s.label}
    </Badge>
  );
}
