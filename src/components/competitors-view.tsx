"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Select } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { timeAgo } from "@/lib/utils";

type Change = { summary: string; offers: string[]; at: string };
type Watch = { id: string; name: string; url: string; everyDays: number; active: boolean; lastChange: Change | null; createdAt: string; lastHash: string | null };

export function CompetitorsView() {
  const [watches, setWatches] = useState<Watch[] | null>(null);
  const [f, setF] = useState({ name: "", url: "", everyDays: "7" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/competitors", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setWatches(b.watches ?? []));
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/competitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const b = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't add it.");
    toast.success("Added. We'll take a first snapshot shortly, then watch for changes.");
    setF({ name: "", url: "", everyDays: "7" });
    load();
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
      <Panel>
        <PanelHeader title="Watch a competitor" description="We check their page on a schedule and tell you when offers, prices or services change." />
        <form onSubmit={add} className="space-y-3 p-5">
          <div>
            <Label htmlFor="cn">Name</Label>
            <Input id="cn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Rival Agency" required />
          </div>
          <div>
            <Label htmlFor="cu">Page to watch</Label>
            <Input id="cu" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="rivalagency.com/pricing" required />
            <Hint>Their pricing, services or offers page works best. Pages behind a login can't be watched.</Hint>
          </div>
          <div>
            <Label htmlFor="ce">Check every</Label>
            <Select id="ce" value={f.everyDays} onChange={(e) => setF({ ...f, everyDays: e.target.value })}>
              <option value="1">Day</option>
              <option value="3">3 days</option>
              <option value="7">Week</option>
              <option value="14">2 weeks</option>
            </Select>
          </div>
          <Button type="submit" loading={busy} className="w-full">
            <Plus className="h-4 w-4" aria-hidden />
            Watch this page
          </Button>
        </form>
      </Panel>

      <Panel>
        <PanelHeader title="Your competitor watches" />
        {watches?.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">Nothing watched yet.</p>}
        <ul className="divide-y divide-line">
          {watches?.map((w) => (
            <li key={w.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {w.name} {!w.active && <Badge>Paused</Badge>} {!w.lastHash && w.active && <Badge tone="info">First check soon</Badge>}
                  </p>
                  <a href={w.url} target="_blank" rel="noreferrer" className="block max-w-xs truncate text-[13px] text-pin hover:underline">
                    {w.url.replace(/^https?:\/\//, "")}
                  </a>
                  <p className="text-[12px] text-muted">Every {w.everyDays === 1 ? "day" : `${w.everyDays} days`}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await fetch(`/api/competitors/${w.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !w.active }) });
                      load();
                    }}
                  >
                    {w.active ? "Pause" : "Resume"}
                  </Button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Stop watching ${w.name}?`)) return;
                      await fetch(`/api/competitors/${w.id}`, { method: "DELETE" });
                      load();
                    }}
                    className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-danger"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {w.lastChange && (
                <div className="mt-3 rounded-control border border-pin/30 bg-pin/5 p-3 text-[13px]">
                  <p className="font-medium text-pin">Latest change · {timeAgo(w.lastChange.at)}</p>
                  <p className="mt-1">{w.lastChange.summary}</p>
                  {w.lastChange.offers?.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-muted">
                      {w.lastChange.offers.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
