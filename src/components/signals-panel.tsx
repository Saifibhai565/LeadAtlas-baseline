"use client";

import { SIGNAL_INFO } from "@/lib/signals";

export function SignalsPanel({
  lead,
}: {
  lead: {
    signals: string | null;
    bestTime: string | null;
    ownerName: string | null;
    builtBy: string | null;
    domainExpiresAt: string | null;
    branches: number | null;
  };
}) {
  const list = (lead.signals ?? "").split(",").filter((s) => SIGNAL_INFO[s]);
  const facts = [
    lead.ownerName && ["Owner or doctor", lead.ownerName],
    lead.bestTime && ["Best time to contact", lead.bestTime],
    lead.builtBy && ["Website made by", lead.builtBy],
    lead.domainExpiresAt && ["Domain expires", new Date(lead.domainExpiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
    (lead.branches ?? 0) >= 2 && ["Locations in your leads", String(lead.branches)],
  ].filter(Boolean) as [string, string][];

  if (list.length === 0 && facts.length === 0) {
    return <p className="text-[13px] text-muted">No signals yet. Website checks and repeat searches add them.</p>;
  }
  return (
    <div className="space-y-3 text-[13px]">
      {list.length > 0 && (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s}>
              <span className={["RATING_DROP", "BAD_REVIEW"].includes(s) ? "font-medium text-danger" : "font-medium text-pin"}>{SIGNAL_INFO[s].label}</span>
              <span className="block text-muted">{SIGNAL_INFO[s].tip}</span>
            </li>
          ))}
        </ul>
      )}
      {facts.length > 0 && (
        <dl className="space-y-1">
          {facts.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-40 shrink-0 text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
