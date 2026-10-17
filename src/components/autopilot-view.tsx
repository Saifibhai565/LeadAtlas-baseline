"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Textarea, Toggle } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { formatNumber, timeAgo } from "@/lib/utils";

type Settings = { autopilot: boolean; autopilotWhat: string | null; autopilotCities: string | null; autopilotDaily: number; autopilotAutoAdd: boolean; autopilotRunAt: string | null; suggestedCount: number; isOwner: boolean; aiOn: boolean };
type Suggestion = { id: string; title: string; category: string | null; phone: string | null; website: string | null; address: string | null; rating: number | null; reviewCount: number | null; createdAt: string };

export function AutopilotView() {
  const [s, setS] = useState<Settings | null>(null);
  const [f, setF] = useState({ what: "", cities: "", daily: "20", autoAdd: false });
  const [sug, setSug] = useState<Suggestion[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    fetch("/api/autopilot")
      .then((r) => r.json())
      .then((b: Settings) => {
        setS(b);
        setF({ what: b.autopilotWhat ?? "", cities: b.autopilotCities ?? "", daily: String(b.autopilotDaily ?? 20), autoAdd: b.autopilotAutoAdd });
      });
  }, []);
  const loadSug = useCallback(() => {
    fetch("/api/autopilot/suggestions")
      .then((r) => r.json())
      .then((b) => setSug(b.leads ?? []));
  }, []);
  useEffect(() => {
    load();
    loadSug();
  }, [load, loadSug]);

  if (!s) return <div className="h-64 animate-pulse rounded-panel bg-surface" />;
  if (!s.isOwner) return <Panel className="p-6 text-sm text-muted">Ask the account owner to set up Autopilot.</Panel>;

  async function save(patch: Record<string, unknown>) {
    const res = await fetch("/api/autopilot", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (res.ok) load();
    else toast.error("Couldn't save.");
  }

  async function act(action: "accept" | "dismiss", all = false) {
    const ids = Array.from(sel);
    if (!all && ids.length === 0) return toast.error("Select some leads first.");
    const res = await fetch("/api/autopilot/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, all, ids }) });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(b.error ?? "Couldn't do that.");
    toast.success(action === "accept" ? `Added ${formatNumber(b.added)} leads${b.skipped ? `, ${b.skipped} skipped (not enough credits)` : ""}.` : `Removed ${formatNumber(b.removed)}.`);
    setSel(new Set());
    loadSug();
    load();
  }

  return (
    <div className="space-y-6">
      <Panel className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Sparkles className="h-4 w-4 text-pin" aria-hidden /> AI finds leads for you, every day
            </h2>
            <p className="mt-1 text-sm text-muted">Tell it who you want. Each day it searches on its own and brings you fresh leads.</p>
          </div>
          <Toggle checked={s.autopilot} onChange={(v) => save({ autopilot: v })} label={s.autopilot ? "On" : "Off"} />
        </div>
        {!s.aiOn && <p className="rounded-control border border-pin/30 bg-pin/5 p-2 text-[13px] text-pin">Autopilot works best with AI (Pro/Agency). Without it, it uses your words directly as the search.</p>}
        <div>
          <Label htmlFor="what">Who do you want as customers?</Label>
          <Textarea id="what" value={f.what} onChange={(e) => setF({ ...f, what: e.target.value })} onBlur={() => save({ what: f.what })} rows={2} placeholder="I sell websites and Google ranking to clinics, salons and restaurants" dir="auto" />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
          <div>
            <Label htmlFor="cities">Cities</Label>
            <Input id="cities" value={f.cities} onChange={(e) => setF({ ...f, cities: e.target.value })} onBlur={() => save({ cities: f.cities })} placeholder="Lahore, Faisalabad" />
          </div>
          <div>
            <Label htmlFor="daily">New leads a day</Label>
            <Input id="daily" type="number" min={5} max={200} value={f.daily} onChange={(e) => setF({ ...f, daily: e.target.value })} onBlur={() => save({ daily: Number(f.daily) })} />
          </div>
        </div>
        <Toggle
          checked={f.autoAdd}
          onChange={(v) => {
            setF({ ...f, autoAdd: v });
            save({ autoAdd: v });
          }}
          label="Add leads automatically"
          description={f.autoAdd ? "New leads go straight into your list and 1 credit is used per lead." : "New leads wait here as suggestions. You pick which to add (credits used only then)."}
        />
        {s.autopilotRunAt && <p className="text-[12px] text-muted">Last run {timeAgo(s.autopilotRunAt)}. Runs about once a day while the app is online.</p>}
      </Panel>

      {sug && sug.length > 0 && (
        <Panel>
          <PanelHeader
            title={`Suggested leads (${formatNumber(sug.length)})`}
            description="Found by Autopilot, not added yet. Accepting uses 1 credit each."
            action={
              <div className="flex gap-2">
                <Button size="sm" onClick={() => act("accept", true)}>
                  Add all
                </Button>
                <Button size="sm" variant="ghost" onClick={() => act("dismiss", true)}>
                  Dismiss all
                </Button>
              </div>
            }
          />
          {sel.size > 0 && (
            <div className="flex items-center gap-3 border-b border-line bg-raised/30 px-5 py-2 text-sm">
              <span className="font-medium text-pin">{sel.size} selected</span>
              <Button size="sm" onClick={() => act("accept")}>
                Add selected
              </Button>
              <Button size="sm" variant="ghost" onClick={() => act("dismiss")}>
                Dismiss selected
              </Button>
            </div>
          )}
          <ul className="divide-y divide-line">
            {sug.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={sel.has(l.id)}
                  onChange={() =>
                    setSel((x) => {
                      const n = new Set(x);
                      n.has(l.id) ? n.delete(l.id) : n.add(l.id);
                      return n;
                    })
                  }
                  className="accent-[rgb(var(--pin))]"
                  aria-label={`Select ${l.title}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {l.title} {!l.website && <Badge tone="pin">no website</Badge>}
                  </p>
                  <p className="text-[12px] text-muted">
                    {[l.category, l.phone, l.rating != null ? `★ ${l.rating} (${l.reviewCount ?? 0})` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="shrink-0 text-[12px] text-muted">{timeAgo(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {sug && sug.length === 0 && s.autopilot && !s.autopilotAutoAdd && (
        <Panel className="p-8 text-center text-sm text-muted">No suggestions yet. The first batch arrives within a day of turning Autopilot on.</Panel>
      )}
    </div>
  );
}
