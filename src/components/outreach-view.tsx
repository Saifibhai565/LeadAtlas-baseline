"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Select, Textarea, Toggle } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { VARIABLES } from "@/lib/template";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) {
    toast.error(b.error ?? "Something went wrong.");
    return null;
  }
  return b as T;
}

const TABS = ["Mailboxes", "Sequences", "Outbox", "Do not email"] as const;
type Tab = (typeof TABS)[number];

// ---------- Mailboxes ----------
type Mailbox = {
  id: string;
  label: string;
  fromName: string;
  fromEmail: string;
  host: string;
  port: number;
  dailyLimit: number;
  gapSeconds: number;
  trackOpens: boolean;
  active: boolean;
  lastError: string | null;
  lastSentAt: string | null;
  sentToday: number;
  queued: number;
};

const PRESETS: Record<string, { host: string; port: number; help: string }> = {
  gmail: { host: "smtp.gmail.com", port: 587, help: "Turn on 2-Step Verification, then create an App Password in your Google account and use it here." },
  outlook: { host: "smtp.office365.com", port: 587, help: "Use your Outlook or Microsoft 365 email and password (or an app password if you use 2-step sign-in)." },
  zoho: { host: "smtp.zoho.com", port: 587, help: "Use your Zoho Mail address and password, or an app-specific password." },
  hostinger: { host: "smtp.hostinger.com", port: 465, help: "Use the email account you created in Hostinger." },
  other: { host: "", port: 587, help: "Your email provider's SMTP settings are usually in its help pages." },
};

function Mailboxes() {
  const [boxes, setBoxes] = useState<Mailbox[] | null>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [adding, setAdding] = useState(false);
  const [preset, setPreset] = useState("gmail");
  const [form, setForm] = useState({ fromEmail: "", fromName: "", password: "", host: PRESETS.gmail.host, port: "587", dailyLimit: "40" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<{ mailboxes: Mailbox[]; isOwner: boolean }>("/api/outreach/mailboxes").then((b) => {
      if (!b) return;
      setBoxes(b.mailboxes);
      setIsOwner(b.isOwner);
    });
  }, []);
  useEffect(load, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const b = await api("/api/outreach/mailboxes", {
      method: "POST",
      body: JSON.stringify({ ...form, port: Number(form.port), dailyLimit: Number(form.dailyLimit) }),
    });
    setSaving(false);
    if (b) {
      toast.success("Mailbox connected.");
      setAdding(false);
      setForm({ ...form, fromEmail: "", password: "" });
      load();
    }
  }

  async function patch(m: Mailbox, body: Record<string, unknown>, msg: string) {
    if (await api(`/api/outreach/mailboxes/${m.id}`, { method: "PATCH", body: JSON.stringify(body) })) {
      toast.success(msg);
      load();
    }
  }

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Connected mailboxes"
          description="Emails go out from your own address, a few at a time, so they reach the inbox."
          action={
            isOwner && !adding ? (
              <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Connect mailbox
              </Button>
            ) : undefined
          }
        />
        {boxes?.length === 0 && !adding && (
          <p className="px-5 py-10 text-center text-sm text-muted">No mailbox yet. Connect the email address you want to send from.</p>
        )}
        <ul className="divide-y divide-line">
          {boxes?.map((m) => (
            <li key={m.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {m.fromName} <span className="font-normal text-muted">&lt;{m.fromEmail}&gt;</span>{" "}
                    {!m.active && <Badge tone="danger">Paused</Badge>}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    <span className="tabular">
                      {m.sentToday} of {m.dailyLimit}
                    </span>{" "}
                    sent in the last 24 hours, {m.queued} waiting, one email every {Math.round(m.gapSeconds / 60)} min
                    {m.lastSentAt ? `, last ${timeAgo(m.lastSentAt)}` : ""}
                  </p>
                  {m.lastError && <p className="mt-1 text-[13px] text-danger">{m.lastError}</p>}
                </div>
                {isOwner && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const b = await api<{ to: string }>(`/api/outreach/mailboxes/${m.id}/test`, { method: "POST" });
                        if (b) toast.success(`Test email sent to ${b.to}.`);
                      }}
                    >
                      Send test
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => patch(m, { active: !m.active }, m.active ? "Paused." : "Switched on.")}>
                      {m.active ? "Pause" : "Switch on"}
                    </Button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Disconnect ${m.fromEmail}? Its queued emails are deleted.`)) return;
                        if (await api(`/api/outreach/mailboxes/${m.id}`, { method: "DELETE" })) load();
                      }}
                      className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-danger"
                      aria-label={`Disconnect ${m.fromEmail}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {isOwner && (
                <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px]">
                  <label className="inline-flex items-center gap-2 text-muted">
                    Daily limit
                    <select
                      defaultValue={m.dailyLimit}
                      onChange={(e) => patch(m, { dailyLimit: Number(e.target.value) }, "Daily limit saved.")}
                      className="rounded-control border border-line bg-raised px-2 py-1 text-ink"
                    >
                      {[10, 20, 30, 40, 60, 80, 100, 150].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="inline-flex items-center gap-2 text-muted">
                    Wait between emails
                    <select
                      defaultValue={m.gapSeconds}
                      onChange={(e) => patch(m, { gapSeconds: Number(e.target.value) }, "Saved.")}
                      className="rounded-control border border-line bg-raised px-2 py-1 text-ink"
                    >
                      {[60, 120, 300, 600].map((n) => (
                        <option key={n} value={n}>
                          {n / 60} min
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="inline-flex items-center gap-2 text-muted">
                    <input
                      type="checkbox"
                      defaultChecked={m.trackOpens}
                      onChange={(e) => patch(m, { trackOpens: e.target.checked }, "Saved.")}
                      className="accent-[rgb(var(--pin))]"
                    />
                    Track opens
                  </label>
                </div>
              )}
            </li>
          ))}
        </ul>

        {adding && (
          <form onSubmit={add} className="space-y-4 border-t border-line p-5">
            <div>
              <Label htmlFor="mb-provider">Email provider</Label>
              <Select
                id="mb-provider"
                value={preset}
                onChange={(e) => {
                  setPreset(e.target.value);
                  const p = PRESETS[e.target.value];
                  setForm({ ...form, host: p.host, port: String(p.port) });
                }}
              >
                <option value="gmail">Gmail / Google Workspace</option>
                <option value="outlook">Outlook / Microsoft 365</option>
                <option value="zoho">Zoho Mail</option>
                <option value="hostinger">Hostinger</option>
                <option value="other">Other</option>
              </Select>
              <Hint>{PRESETS[preset].help}</Hint>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="mb-email">Your email</Label>
                <Input id="mb-email" type="email" value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="mb-name">Name people see</Label>
                <Input id="mb-name" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} placeholder="Ali from Bright Web Studio" />
              </div>
            </div>
            <div>
              <Label htmlFor="mb-pass">{preset === "gmail" ? "App password" : "Password"}</Label>
              <Input id="mb-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="off" />
              <Hint>Stored encrypted. Used only to send the emails you queue.</Hint>
            </div>
            {preset === "other" && (
              <div className="grid grid-cols-[1fr_120px] gap-4">
                <div>
                  <Label htmlFor="mb-host">SMTP server</Label>
                  <Input id="mb-host" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="smtp.example.com" required />
                </div>
                <div>
                  <Label htmlFor="mb-port">Port</Label>
                  <Input id="mb-port" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="mb-limit">Emails per day</Label>
              <Select id="mb-limit" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })}>
                {[20, 30, 40, 60].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              <Hint>New addresses should start at 20 to 40 a day. Sending too many too soon gets mailboxes blocked.</Hint>
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>
                Check and connect
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Panel>
      <p className="text-[13px] text-muted">
        Every email gets an unsubscribe link, unsubscribed and bounced addresses are never emailed again, and a sequence stops as soon as the lead
        replies or you move them to Interested, Won or Lost.
      </p>
    </div>
  );
}

// ---------- Sequences ----------
type Step = { delayDays: number; subject: string; body: string };
type Sequence = { id: string; name: string; steps: Step[]; active: boolean; counts: Record<string, number>; sent: number; opened: number };

const STARTER: Step[] = [
  {
    delayDays: 0,
    subject: "Quick question about {{name}}",
    body: "Hi {{name}} team,\n\nI found you on Google Maps while looking at {{category}} businesses in {{city}}. I noticed one thing: {{problem}}.\n\nI help businesses like yours fix exactly this. Would it be useful if I sent you two or three specific ideas?\n\n{{signature}}",
  },
  {
    delayDays: 3,
    subject: "",
    body: "Hi again,\n\nJust bringing this back to the top of your inbox. Happy to send those ideas over, no charge and no obligation.\n\n{{signature}}",
  },
  {
    delayDays: 5,
    subject: "",
    body: "Hi,\n\nI'll leave it here so I don't fill your inbox. If improving your online presence becomes a priority, just reply to this email and I'll get back to you.\n\nAll the best,\n{{signature}}",
  },
];

function SequenceEditor({ initial, onSaved, onCancel }: { initial: Sequence | null; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [steps, setSteps] = useState<Step[]>(initial?.steps ?? STARTER);
  const [saving, setSaving] = useState(false);

  const setStep = (i: number, s: Partial<Step>) => setSteps((all) => all.map((x, j) => (j === i ? { ...x, ...s } : x)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const b = await api(initial ? `/api/outreach/sequences/${initial.id}` : "/api/outreach/sequences", {
      method: initial ? "PATCH" : "POST",
      body: JSON.stringify({ name, steps }),
    });
    setSaving(false);
    if (b) {
      toast.success("Sequence saved.");
      onSaved();
    }
  }

  return (
    <Panel>
      <form onSubmit={save} className="space-y-5 p-5">
        <div>
          <Label htmlFor="sq-name">Sequence name</Label>
          <Input id="sq-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Clinics without a website" required />
        </div>
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="rounded-control border border-line p-4">
              <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium">Email {i + 1}</span>
                {i === 0 ? (
                  <span className="text-muted">sent first</span>
                ) : (
                  <label className="inline-flex items-center gap-2 text-muted">
                    if no reply after
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={s.delayDays}
                      onChange={(e) => setStep(i, { delayDays: Number(e.target.value) })}
                      className="tabular w-16 rounded-control border border-line bg-raised px-2 py-1 text-ink"
                    />
                    days
                  </label>
                )}
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => setSteps((all) => all.filter((_, j) => j !== i))}
                    className="ml-auto text-[13px] text-muted hover:text-danger"
                  >
                    Remove
                  </button>
                )}
              </div>
              <Input
                value={s.subject}
                onChange={(e) => setStep(i, { subject: e.target.value })}
                placeholder={i === 0 ? "Subject" : "Subject (empty = reply in the same thread)"}
                className="mb-2 text-[13px]"
                required={i === 0}
              />
              <Textarea rows={6} value={s.body} onChange={(e) => setStep(i, { body: e.target.value })} className="text-[13px]" dir="auto" required />
            </li>
          ))}
        </ol>
        {steps.length < 6 && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setSteps((all) => [...all, { delayDays: 4, subject: "", body: "" }])}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add a follow-up
          </Button>
        )}
        <Hint>
          Details that fill in for each lead: {VARIABLES.map((v) => `{{${v.key}}}`).join(", ")}. An unsubscribe line is added to every email automatically.
        </Hint>
        <div className="flex gap-2">
          <Button type="submit" loading={saving}>
            Save sequence
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function Sequences() {
  const [list, setList] = useState<Sequence[] | null>(null);
  const [editing, setEditing] = useState<Sequence | "new" | null>(null);
  const load = useCallback(() => {
    api<{ sequences: Sequence[] }>("/api/outreach/sequences").then((b) => b && setList(b.sequences));
  }, []);
  useEffect(load, [load]);

  if (editing) {
    return (
      <SequenceEditor
        initial={editing === "new" ? null : editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <Panel>
      <PanelHeader
        title="Sequences"
        description="A first email plus follow-ups that stop when the lead replies. Add leads from the Leads page."
        action={
          <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New sequence
          </Button>
        }
      />
      {list?.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">No sequences yet. Start with the ready-made 3-email one.</p>}
      <ul className="divide-y divide-line">
        {list?.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <p className="font-medium">
                {s.name} {!s.active && <Badge>Paused</Badge>}
              </p>
              <p className="mt-0.5 text-[13px] text-muted">
                {s.steps.length} email{s.steps.length > 1 ? "s" : ""} · {formatNumber(s.counts.ACTIVE ?? 0)} running ·{" "}
                {formatNumber(s.counts.REPLIED ?? 0)} replied · {formatNumber(s.counts.FINISHED ?? 0)} finished · {formatNumber(s.sent)} sent
                {s.opened ? ` · ${formatNumber(s.opened)} opened` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  if (await api(`/api/outreach/sequences/${s.id}`, { method: "PATCH", body: JSON.stringify({ active: !s.active }) })) load();
                }}
              >
                {s.active ? "Pause" : "Resume"}
              </Button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete “${s.name}”? Its waiting emails are cancelled.`)) return;
                  if (await api(`/api/outreach/sequences/${s.id}`, { method: "DELETE" })) load();
                }}
                className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-danger"
                aria-label={`Delete ${s.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------- Outbox ----------
type Msg = {
  id: string;
  toEmail: string;
  subject: string;
  status: string;
  error: string | null;
  step: number | null;
  createdAt: string;
  sentAt: string | null;
  openedAt: string | null;
  lead: { id: string; title: string } | null;
  mailbox: { label: string };
};

const STATUS_TONE: Record<string, "ok" | "info" | "danger" | "neutral" | "pin"> = {
  SENT: "ok",
  QUEUED: "info",
  SENDING: "info",
  FAILED: "danger",
  CANCELLED: "neutral",
  SKIPPED: "neutral",
};

function Outbox() {
  const [status, setStatus] = useState("ALL");
  const [data, setData] = useState<{ messages: Msg[]; counts: Record<string, number> } | null>(null);
  const load = useCallback(() => {
    api<{ messages: Msg[]; counts: Record<string, number> }>(`/api/outreach/outbox?status=${status}`).then((b) => b && setData(b));
  }, [status]);
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function act(id: string, action: "cancel" | "retry") {
    if (await api("/api/outreach/outbox", { method: "POST", body: JSON.stringify({ id, action }) })) load();
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
        {[
          ["ALL", "All"],
          ["QUEUED", `Waiting ${data ? `(${formatNumber(data.counts.queued)})` : ""}`],
          ["SENT", `Sent ${data ? `(${formatNumber(data.counts.sent)})` : ""}`],
          ["FAILED", `Failed ${data ? `(${formatNumber(data.counts.failed)})` : ""}`],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setStatus(k)}
            className={cn(
              "h-8 rounded-full border px-3 text-[13px]",
              status === k ? "border-pin/50 bg-pin/10 text-pin" : "border-line text-muted hover:text-ink",
            )}
          >
            {l}
          </button>
        ))}
        {data && data.counts.opened > 0 && <span className="ml-auto text-[13px] text-muted">{formatNumber(data.counts.opened)} opened</span>}
      </div>
      {data?.messages.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">Nothing here yet.</p>}
      <ul className="divide-y divide-line">
        {data?.messages.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{m.subject}</p>
              <p className="truncate text-[13px] text-muted">
                To {m.lead ? `${m.lead.title} ` : ""}&lt;{m.toEmail}&gt; from {m.mailbox.label}
                {m.step != null ? `, sequence email ${m.step + 1}` : ""}, {timeAgo(m.sentAt ?? m.createdAt)}
                {m.openedAt ? ", opened" : ""}
              </p>
              {m.error && <p className="text-[13px] text-danger">{m.error}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={STATUS_TONE[m.status] ?? "neutral"}>{m.status === "QUEUED" ? "Waiting" : m.status.toLowerCase()}</Badge>
              {m.status === "QUEUED" && (
                <Button size="sm" variant="ghost" onClick={() => act(m.id, "cancel")}>
                  Cancel
                </Button>
              )}
              {m.status === "FAILED" && (
                <Button size="sm" variant="ghost" onClick={() => act(m.id, "retry")}>
                  Retry
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------- Do not email ----------
function Suppressions() {
  const [list, setList] = useState<{ id: string; email: string; reason: string; createdAt: string }[] | null>(null);
  const [email, setEmail] = useState("");
  const load = useCallback(() => {
    api<{ list: { id: string; email: string; reason: string; createdAt: string }[] }>("/api/outreach/suppressions").then((b) => b && setList(b.list));
  }, []);
  useEffect(load, [load]);

  return (
    <Panel>
      <PanelHeader title="Do not email" description="These addresses are never emailed. Unsubscribes and bounces are added automatically." />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await api("/api/outreach/suppressions", { method: "POST", body: JSON.stringify({ email }) })) {
            setEmail("");
            load();
          }
        }}
        className="flex gap-2 border-b border-line p-4"
      >
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" type="email" className="h-9 text-[13px]" required />
        <Button size="sm" className="h-9 shrink-0" type="submit">
          Add
        </Button>
      </form>
      {list?.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Nobody yet.</p>}
      <ul className="divide-y divide-line">
        {list?.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
            <span className="truncate">{s.email}</span>
            <span className="flex items-center gap-2">
              <Badge tone={s.reason === "UNSUBSCRIBED" ? "pin" : s.reason === "BOUNCED" ? "danger" : "neutral"}>{s.reason.toLowerCase()}</Badge>
              {s.reason !== "UNSUBSCRIBED" && (
                <button
                  onClick={async () => {
                    if (await api("/api/outreach/suppressions", { method: "DELETE", body: JSON.stringify({ email: s.email }) })) load();
                  }}
                  className="text-[13px] text-muted hover:text-ink"
                >
                  Remove
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function OutreachView() {
  const [tab, setTab] = useState<Tab>("Mailboxes");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/outreach/mailboxes")
      .then((r) => r.json())
      .then((b) => setAllowed(b.allowed !== false))
      .catch(() => setAllowed(true));
  }, []);

  if (allowed === false) {
    return (
      <Panel className="max-w-2xl p-6">
        <h2 className="text-[15px] font-semibold">Email outreach is part of Pro and Agency</h2>
        <p className="mt-1 text-sm text-muted">Send emails and automatic follow-ups from your own inbox, with safe daily limits and unsubscribe handling.</p>
        <Link href="/billing" className="mt-4 inline-flex h-10 items-center rounded-control bg-pin px-4 text-sm font-semibold text-pin-ink">
          See plans
        </Link>
      </Panel>
    );
  }

  return (
    <>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm", tab === t ? "border-pin font-medium text-ink" : "border-transparent text-muted hover:text-ink")}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Mailboxes" && <Mailboxes />}
      {tab === "Sequences" && <Sequences />}
      {tab === "Outbox" && <Outbox />}
      {tab === "Do not email" && <Suppressions />}
    </>
  );
}
