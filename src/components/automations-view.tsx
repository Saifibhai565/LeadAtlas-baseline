"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Select } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";

type Automation = { id: string; name: string; trigger: string; action: string; value: string; active: boolean; runs: number };
type Data = { automations: Automation[]; sequences: { id: string; name: string }[]; members: { id: string; name: string }[] };

const STAGES = [
  ["status:NEW", "New"],
  ["status:CONTACTED", "Contacted"],
  ["status:INTERESTED", "Interested"],
  ["status:WON", "Won"],
  ["status:LOST", "Lost"],
];
const ACTIONS = [
  ["tag", "Add a tag"],
  ["followup", "Set a follow-up"],
  ["sequence", "Start an email sequence"],
  ["assign", "Assign to a team member"],
  ["note", "Add a note"],
];

export function AutomationsView() {
  const [d, setD] = useState<Data | null>(null);
  const [f, setF] = useState({ name: "", trigger: "status:INTERESTED", action: "tag", value: "" });

  const load = useCallback(() => {
    fetch("/api/automations")
      .then((r) => r.json())
      .then(setD);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (!d) return <div className="h-64 animate-pulse rounded-panel bg-surface" />;

  const describe = (a: Automation) => {
    const stage = STAGES.find(([k]) => k === a.trigger)?.[1] ?? a.trigger;
    const act =
      a.action === "tag"
        ? `add the tag “${a.value}”`
        : a.action === "followup"
          ? `set a follow-up in ${a.value} day(s)`
          : a.action === "assign"
            ? `assign it to ${d.members.find((m) => m.id === a.value)?.name ?? "a team member"}`
            : a.action === "sequence"
              ? `start the sequence “${d.sequences.find((s) => s.id === a.value)?.name ?? "?"}”`
              : `add a note`;
    return `When a lead is moved to ${stage}, ${act}.`;
  };

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(b.error ?? "Couldn't create it.");
    toast.success("Automation created.");
    setF({ ...f, name: "", value: "" });
    load();
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_1fr]">
      <Panel>
        <PanelHeader title="New automation" description="Do something automatically when a lead reaches a stage." />
        <form onSubmit={create} className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-raised/40 p-3 text-sm">
            <span>When a lead is moved to</span>
            <Select value={f.trigger} onChange={(e) => setF({ ...f, trigger: e.target.value })} className="h-8 w-auto text-[13px]">
              {STAGES.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
            <span>then</span>
            <Select value={f.action} onChange={(e) => setF({ ...f, action: e.target.value, value: "" })} className="h-8 w-auto text-[13px]">
              {ACTIONS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </div>

          {f.action === "tag" && (
            <div>
              <Label htmlFor="v">Tag</Label>
              <Input id="v" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder="hot" required />
            </div>
          )}
          {f.action === "followup" && (
            <div>
              <Label htmlFor="v">Follow up in</Label>
              <Select id="v" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} required>
                <option value="">Choose…</option>
                {[1, 2, 3, 7, 14, 30].map((n) => (
                  <option key={n} value={n}>
                    {n} day{n > 1 ? "s" : ""}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {f.action === "sequence" && (
            <div>
              <Label htmlFor="v">Sequence</Label>
              <Select id="v" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} required>
                <option value="">Choose…</option>
                {d.sequences.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              {d.sequences.length === 0 && <Hint>Create a sequence in Email outreach first.</Hint>}
            </div>
          )}
          {f.action === "assign" && (
            <div>
              <Label htmlFor="v">Team member</Label>
              <Select id="v" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} required>
                <option value="">Choose…</option>
                {d.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
              {d.members.length === 0 && <Hint>Invite team members first.</Hint>}
            </div>
          )}
          {f.action === "note" && (
            <div>
              <Label htmlFor="v">Note to add</Label>
              <Input id="v" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder="Send the proposal" required />
            </div>
          )}
          <div>
            <Label htmlFor="n">Name (optional)</Label>
            <Input id="n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Tag interested leads as hot" />
          </div>
          <Button type="submit">
            <Plus className="h-4 w-4" aria-hidden />
            Create automation
          </Button>
        </form>
      </Panel>

      <Panel>
        <PanelHeader title="Your automations" />
        {d.automations.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">None yet. A good first one: when a lead is Interested, start your intro email sequence.</p>}
        <ul className="divide-y divide-line">
          {d.automations.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="font-medium">
                  {a.name} {!a.active && <Badge>Off</Badge>}
                </p>
                <p className="text-[13px] text-muted">{describe(a)}</p>
                <p className="text-[12px] text-muted">Ran {a.runs} time{a.runs === 1 ? "" : "s"}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await fetch(`/api/automations/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !a.active }) });
                    load();
                  }}
                >
                  {a.active ? "Turn off" : "Turn on"}
                </Button>
                <button
                  onClick={async () => {
                    if (!confirm("Delete this automation?")) return;
                    await fetch(`/api/automations/${a.id}`, { method: "DELETE" });
                    load();
                  }}
                  className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-danger"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
