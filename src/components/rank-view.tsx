"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Select } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { cn, timeAgo } from "@/lib/utils";

const RankMap = dynamic(() => import("./rank-map").then((m) => m.RankMap), { ssr: false, loading: () => <div className="h-[480px] animate-pulse rounded-panel bg-raised/40" /> });

type Point = { lat: number; lng: number; status: string; rank: number | null };
type Check = { id: string; keyword: string; targetName: string; size: number; spacingKm: number; status: string; avgRank: number | null; createdAt: string; centerLat: number; centerLng: number; points: Point[] };

export function RankView() {
  const params = useSearchParams();
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(params.get("id"));
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<{ id: string; title: string; category: string | null }[]>([]);
  const [lead, setLead] = useState<{ id: string; title: string; category: string | null } | null>(null);
  const [keyword, setKeyword] = useState("");
  const [size, setSize] = useState("3");
  const [spacing, setSpacing] = useState("1");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/rank", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setChecks(b.checks ?? []));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    if (!checks?.some((c) => c.status === "RUNNING")) return;
    const t = setInterval(() => {
      checks.filter((c) => c.status === "RUNNING").forEach((c) => fetch(`/api/rank/${c.id}`));
      load();
    }, 8000);
    return () => clearInterval(t);
  }, [checks, load]);

  useEffect(() => {
    if (q.trim().length < 2) return setOptions([]);
    const t = setTimeout(() => {
      fetch(`/api/leads?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((b) => setOptions((b.items ?? []).slice(0, 8)));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return toast.error("Choose a business.");
    setBusy(true);
    const res = await fetch("/api/rank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, keyword, size: Number(size), spacingKm: Number(spacing) }),
    });
    const b = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't start the check.");
    toast.success("Check started. It runs one search per grid point, so give it a few minutes.");
    setOpenId(b.id);
    load();
  }

  const open = checks?.find((c) => c.id === openId) ?? null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-6">
        <Panel>
          <PanelHeader title="New rank check" description="Where does a business show up on Google Maps, across its area?" />
          <form onSubmit={start} className="space-y-4 p-5">
            <div className="relative">
              <Label htmlFor="rk-lead">Business</Label>
              {lead ? (
                <div className="flex items-center justify-between rounded-control border border-line bg-raised px-3 py-2 text-sm">
                  <span className="truncate">{lead.title}</span>
                  <button type="button" onClick={() => setLead(null)} className="text-[13px] text-muted hover:text-ink">
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <Input id="rk-lead" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name from your leads" autoComplete="off" />
                  {options.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-control border border-line bg-surface shadow-lg">
                      {options.map((o) => (
                        <li key={o.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setLead(o);
                              setKeyword((k) => k || (o.category ?? "").toLowerCase());
                              setOptions([]);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-raised"
                          >
                            {o.title} <span className="text-muted">{o.category}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
            <div>
              <Label htmlFor="rk-kw">Search people type</Label>
              <Input id="rk-kw" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="dentist" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rk-size">Grid</Label>
                <Select id="rk-size" value={size} onChange={(e) => setSize(e.target.value)}>
                  <option value="3">3 x 3 (9 credits)</option>
                  <option value="5">5 x 5 (25 credits)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="rk-sp">Spacing</Label>
                <Select id="rk-sp" value={spacing} onChange={(e) => setSpacing(e.target.value)}>
                  <option value="0.5">0.5 km</option>
                  <option value="1">1 km</option>
                  <option value="2">2 km</option>
                  <option value="3">3 km</option>
                </Select>
              </div>
            </div>
            <Button type="submit" loading={busy} className="w-full">
              Check rankings
            </Button>
            <Hint>Each point is a real Google Maps search from that spot. Positions are the order Google lists results there.</Hint>
          </form>
        </Panel>

        <Panel>
          <PanelHeader title="Past checks" />
          {checks?.length === 0 && <p className="px-5 py-6 text-sm text-muted">No checks yet.</p>}
          <ul className="divide-y divide-line">
            {checks?.map((c) => (
              <li key={c.id} className={cn("flex items-center justify-between gap-2 px-4 py-3", openId === c.id && "bg-raised/50")}>
                <button onClick={() => setOpenId(c.id)} className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium">{c.targetName}</p>
                  <p className="text-[12px] text-muted">
                    “{c.keyword}” · {c.size}x{c.size} · {timeAgo(c.createdAt)}
                  </p>
                </button>
                <span className="flex items-center gap-2">
                  {c.status === "RUNNING" ? <Badge tone="info">Running</Badge> : c.avgRank != null && <Badge tone={c.avgRank <= 3 ? "ok" : c.avgRank <= 10 ? "pin" : "danger"}>avg {c.avgRank}</Badge>}
                  <button
                    onClick={async () => {
                      await fetch(`/api/rank/${c.id}`, { method: "DELETE" });
                      if (openId === c.id) setOpenId(null);
                      load();
                    }}
                    className="text-muted hover:text-danger"
                    aria-label="Delete check"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div>
        {open ? (
          <Panel className="space-y-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {open.targetName} <span className="font-normal text-muted">for “{open.keyword}”</span>
              </h2>
              <span className="text-sm text-muted">
                {open.status === "RUNNING"
                  ? `${open.points.filter((p) => p.status !== "pending").length} of ${open.points.length} points done`
                  : `Top 3 at ${open.points.filter((p) => p.rank && p.rank <= 3).length} of ${open.points.length} points`}
              </span>
            </div>
            <RankMap points={open.points} center={{ lat: open.centerLat, lng: open.centerLng }} />
            <div className="flex flex-wrap gap-4 text-[12px] text-muted">
              {[
                ["#047857", "1 to 3"],
                ["#B7791F", "4 to 10"],
                ["#C2410C", "11 to 20"],
                ["#C83232", "not in top 20"],
                ["#8B9AB2", "still checking"],
              ].map(([c, l]) => (
                <span key={l} className="inline-flex items-center gap-1.5">
                  <i className="inline-block h-3 w-3 rounded-full" style={{ background: c }} />
                  {l}
                </span>
              ))}
            </div>
          </Panel>
        ) : (
          <Panel className="p-10 text-center text-sm text-muted">Start a check or pick one from the list to see the map.</Panel>
        )}
      </div>
    </div>
  );
}
