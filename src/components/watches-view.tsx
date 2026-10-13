"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Pause, Play, RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Select, Textarea, Toggle } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { formatNumber, timeAgo } from "@/lib/utils";

type Watch = {
  id: string;
  name: string;
  keywords: string[];
  depth: number;
  everyDays: number;
  active: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  lastNewCount: number | null;
};

const EVERY: Record<number, string> = { 1: "Every day", 3: "Every 3 days", 7: "Every week", 14: "Every 2 weeks", 30: "Every month" };

function when(iso: string) {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff <= 60_000) return "any minute now";
  const h = Math.round(diff / 3600_000);
  if (h < 24) return `in ${Math.max(1, h)} h`;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function WatchesView() {
  const [watches, setWatches] = useState<Watch[] | null>(null);
  const [form, setForm] = useState({ name: "", keywords: "", everyDays: "7", depth: "2", autoCheck: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/watches", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setWatches(b.watches ?? []));
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/watches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, everyDays: Number(form.everyDays), depth: Number(form.depth) }),
    });
    const b = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't create the watch.");
    toast.success("Watch created. The first run starts within a minute.");
    setForm({ ...form, name: "", keywords: "" });
    load();
  }

  async function patch(w: Watch, body: Record<string, unknown>, msg: string) {
    const res = await fetch(`/api/watches/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return toast.error("Couldn't update the watch.");
    toast.success(msg);
    load();
  }

  async function remove(w: Watch) {
    if (!confirm(`Delete the watch “${w.name}”? Leads it found stay saved.`)) return;
    const res = await fetch(`/api/watches/${w.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
      <Panel>
        <PanelHeader title="New watch" description="Repeats a search on a schedule and tells you about new businesses." />
        <form onSubmit={create} className="space-y-4 p-5">
          <div>
            <Label htmlFor="wk">Searches to repeat</Label>
            <Textarea
              id="wk"
              rows={4}
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              placeholder={"restaurant in DHA Lahore\ncafe in Gulberg Lahore"}
              required
            />
            <Hint>Only businesses you don't already have are saved, so each run costs credits only for new ones.</Hint>
          </div>
          <div>
            <Label htmlFor="wn">Name (optional)</Label>
            <Input id="wn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="New places in Lahore" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="we">How often</Label>
              <Select id="we" value={form.everyDays} onChange={(e) => setForm({ ...form, everyDays: e.target.value })}>
                {Object.entries(EVERY).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="wd">Depth</Label>
              <Select id="wd" value={form.depth} onChange={(e) => setForm({ ...form, depth: e.target.value })}>
                {[1, 2, 3, 5, 8].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <Toggle
            checked={form.autoCheck}
            onChange={(v) => setForm({ ...form, autoCheck: v })}
            label="Check their websites"
            description="Scores each new business's website automatically."
          />
          <Button type="submit" loading={saving} className="w-full">
            Create watch
          </Button>
          <Hint>
            Watches run while the app and the scraping engine are running. On a server, the cron job keeps them going around the clock.
          </Hint>
        </form>
      </Panel>

      <Panel>
        <PanelHeader title="Your watches" />
        {watches == null ? (
          <div className="h-24 animate-pulse" />
        ) : watches.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            No watches yet. A business that just opened is often the most open to offers. Watches find them for you.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {watches.map((w) => (
              <li key={w.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {w.name} {!w.active && <Badge>Paused</Badge>}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {EVERY[w.everyDays] ?? `Every ${w.everyDays} days`}, {w.keywords.length} search{w.keywords.length > 1 ? "es" : ""}, depth {w.depth}
                    </p>
                    <p className="mt-1 text-[13px]">
                      {w.lastRunAt ? (
                        <>
                          Last run {timeAgo(w.lastRunAt)}
                          {w.lastNewCount != null && (
                            <>
                              , <span className="tabular font-medium text-pin">{formatNumber(w.lastNewCount)} new</span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">Hasn't run yet</span>
                      )}
                      {w.active && <span className="text-muted">. Next {when(w.nextRunAt)}</span>}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => patch(w, { runNow: true }, "Running now.")}
                      className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-ink"
                      aria-label={`Run ${w.name} now`}
                      title="Run now"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => patch(w, { active: !w.active }, w.active ? "Watch paused." : "Watch resumed.")}
                      className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-ink"
                      aria-label={w.active ? `Pause ${w.name}` : `Resume ${w.name}`}
                      title={w.active ? "Pause" : "Resume"}
                    >
                      {w.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => remove(w)}
                      className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-danger"
                      aria-label={`Delete ${w.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-line px-5 py-3 text-[13px] text-muted">
          Results from each run show up in{" "}
          <Link href="/searches" className="text-pin hover:underline">
            Searches
          </Link>{" "}
          with “(watch)” in the name.
        </p>
      </Panel>
    </div>
  );
}
