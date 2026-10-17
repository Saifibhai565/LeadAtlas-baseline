"use client";

import { useEffect, useState } from "react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { cn, formatNumber } from "@/lib/utils";

type Data = {
  funnel: { stage: string; count: number }[];
  leaderboard: { name: string; sent: number; opened: number; openRate: number }[];
  sentiment: { positive: number; neutral: number; negative: number };
  heat: number[][];
  roi: { leadsUsed: number; wonCount: number; wonValue: number; spent: number; winRate: number; valuePerLead: number };
  daily: { date: string; count: number }[];
  totalReplies: number;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function heatColor(v: number, max: number) {
  if (v === 0 || max === 0) return "rgb(var(--raised))";
  const t = Math.min(1, v / max);
  return `rgb(var(--pin) / ${0.12 + t * 0.88})`;
}

export function AnalyticsView({ isAdmin }: { isAdmin: boolean }) {
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    setD(null);
    fetch(`/api/analytics${scope === "all" ? "?scope=all" : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setD)
      .catch(() => undefined);
  }, [scope]);

  if (!d) return <div className="h-96 animate-pulse rounded-panel bg-surface" />;

  const topFunnel = d.funnel[0].count || 1;
  const maxDaily = Math.max(1, ...d.daily.map((x) => x.count));
  const maxHeat = Math.max(1, ...d.heat.flat());
  const sTotal = d.sentiment.positive + d.sentiment.neutral + d.sentiment.negative || 1;

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex rounded-control border border-line p-0.5 text-[12px] w-max">
          {(["mine", "all"] as const).map((x) => (
            <button key={x} onClick={() => setScope(x)} className={cn("rounded px-3 py-1", scope === x ? "bg-raised font-medium" : "text-muted")}>
              {x === "mine" ? "My data" : "All customers"}
            </button>
          ))}
        </div>
      )}

      {/* ROI tiles */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-panel bg-line sm:grid-cols-4">
        {[
          ["Win rate", `${d.roi.winRate}%`, "of contacted leads"],
          ["Deals won", formatNumber(d.roi.wonCount), "marked Won"],
          ["Value of won deals", formatNumber(d.roi.wonValue), "from deal values you set"],
          ["Spent on the tool", formatNumber(d.roi.spent), "approved payments"],
        ].map(([l, v, s]) => (
          <div key={l} className="bg-surface p-5">
            <p className="text-[12px] text-muted">{l}</p>
            <p className="tabular mt-1 text-[26px] font-semibold leading-none">{v}</p>
            <p className="mt-1 text-[12px] text-muted">{s}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Funnel */}
        <Panel className="p-5">
          <PanelHeader title="Conversion funnel" description="From every lead found to a closed deal." />
          <div className="mt-2 space-y-2">
            {d.funnel.map((f, i) => {
              const pct = Math.round((f.count / topFunnel) * 100);
              const prev = i > 0 ? d.funnel[i - 1].count : f.count;
              const drop = prev ? Math.round((f.count / prev) * 100) : 100;
              return (
                <div key={f.stage}>
                  <div className="flex justify-between text-[13px]">
                    <span>{f.stage}</span>
                    <span className="tabular text-muted">
                      {formatNumber(f.count)}
                      {i > 0 && <span className="ml-2">({drop}%)</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-6 overflow-hidden rounded-control bg-raised">
                    <div className="flex h-full items-center rounded-control bg-pin px-2 text-[11px] font-medium text-pin-ink" style={{ width: `${Math.max(pct, 3)}%` }}>
                      {pct}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Reply sentiment */}
        <Panel className="p-5">
          <PanelHeader title="Reply sentiment" description={`From ${formatNumber(d.totalReplies)} replies you noted.`} />
          {d.totalReplies === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No replies recorded yet. Use “They replied?” in the lead panel.</p>
          ) : (
            <>
              <div className="mt-3 flex h-6 overflow-hidden rounded-control">
                <div className="bg-ok" style={{ width: `${(d.sentiment.positive / sTotal) * 100}%` }} />
                <div className="bg-muted/40" style={{ width: `${(d.sentiment.neutral / sTotal) * 100}%` }} />
                <div className="bg-danger" style={{ width: `${(d.sentiment.negative / sTotal) * 100}%` }} />
              </div>
              <div className="mt-3 flex justify-between text-[13px]">
                <span className="text-ok">Positive {d.sentiment.positive}</span>
                <span className="text-muted">Neutral {d.sentiment.neutral}</span>
                <span className="text-danger">Negative {d.sentiment.negative}</span>
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* Leads per day */}
      <Panel className="p-5">
        <PanelHeader title="Leads added, last 30 days" />
        <div className="mt-3 flex h-40 items-end gap-1">
          {d.daily.map((x) => (
            <div key={x.date} className="group relative flex-1" title={`${x.date}: ${x.count}`}>
              <div className="w-full rounded-t bg-pin/80 transition-colors group-hover:bg-pin" style={{ height: `${(x.count / maxDaily) * 100}%`, minHeight: x.count ? "2px" : "0" }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>{d.daily[0]?.date.slice(5)}</span>
          <span>{d.daily[d.daily.length - 1]?.date.slice(5)}</span>
        </div>
      </Panel>

      {/* Sender leaderboard */}
      {d.leaderboard.length > 0 && (
        <Panel>
          <PanelHeader title="Mailbox performance" description="Which sending address gets the most opens." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[13px] text-muted">
                  <th className="px-5 py-2.5 font-medium">Mailbox</th>
                  <th className="px-3 py-2.5 text-right font-medium">Sent</th>
                  <th className="px-3 py-2.5 text-right font-medium">Opened</th>
                  <th className="px-5 py-2.5 text-right font-medium">Open rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.leaderboard.map((m) => (
                  <tr key={m.name}>
                    <td className="px-5 py-2.5">{m.name}</td>
                    <td className="tabular px-3 py-2.5 text-right">{formatNumber(m.sent)}</td>
                    <td className="tabular px-3 py-2.5 text-right">{formatNumber(m.opened)}</td>
                    <td className="tabular px-5 py-2.5 text-right font-semibold">{m.openRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Open heatmap */}
      <Panel className="p-5">
        <PanelHeader title="Best time to reach people" description="When your emails get opened. Darker is busier." />
        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="flex">
              <div className="w-10 shrink-0" />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center text-[10px] text-muted">
                  {h % 3 === 0 ? h : ""}
                </div>
              ))}
            </div>
            {d.heat.map((row, day) => (
              <div key={day} className="flex items-center">
                <div className="w-10 shrink-0 text-[11px] text-muted">{DAYS[day]}</div>
                {row.map((v, h) => (
                  <div key={h} className="aspect-square flex-1 rounded-sm" style={{ background: heatColor(v, maxHeat), margin: "1px" }} title={`${DAYS[day]} ${h}:00 — ${v} opens`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <WeeklyReportToggle />

      <div className="flex justify-end">
        <a href="/api/analytics/report" className="inline-flex h-10 items-center rounded-control border border-line bg-raised px-4 text-sm hover:border-muted/50">
          Download report (print or save as PDF)
        </a>
      </div>
    </div>
  );
}

function WeeklyReportToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    fetch("/api/analytics/report-settings")
      .then((r) => r.json())
      .then((b) => {
        setOn(Boolean(b.weeklyReport));
        setIsOwner(Boolean(b.isOwner));
      });
  }, []);
  if (on === null || !isOwner) return null;
  return (
    <div className="flex items-center justify-between rounded-panel border border-line bg-surface p-4 text-sm">
      <span>
        <span className="font-medium">Email me this report every Monday</span>
        <span className="block text-muted">A short summary with a link to the full report.</span>
      </span>
      <button
        onClick={async () => {
          const next = !on;
          setOn(next);
          await fetch("/api/analytics/report-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weeklyReport: next }) });
        }}
        className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-pin" : "bg-raised"}`}
        role="switch"
        aria-checked={on}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );
}
