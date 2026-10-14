"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, Send, Server, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Select, Textarea, Toggle } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { formatNumber, timeAgo } from "@/lib/utils";

type Mailbox = { id: string; label: string; fromName: string; fromEmail: string; replyTo: string | null; platform: boolean; active: boolean; lastError: string | null; dailyLimit: number; gapSeconds: number; sentToday: number };
type Batch = { id: string; name: string; subject: string; status: string; total: number; sent: number; failed: number; skipped: number; queued: number; createdAt: string; mailboxId: string };
type Data = { mailboxes: Mailbox[]; batches: Batch[]; allowed: boolean; platform: { domains: string[]; defaultFrom: string; dailyLimit: number } | null };

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

async function call<T>(url: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) {
    toast.error(b.error ?? "Something went wrong.");
    return null;
  }
  return b as T;
}

function duration(sec: number) {
  if (sec < 60) return `${Math.max(1, Math.round(sec))} sec`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

function ServerSettings() {
  const [s, setS] = useState<{ enabled: boolean; host: string; port: number; user: string; domains: string; defaultFrom: string; dailyLimit: number; gapSeconds: number; pass: string; hasPassword: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    fetch("/api/admin/sending-server")
      .then((r) => r.json())
      .then((b) => {
        const v = b.server;
        setS({
          enabled: Boolean(v?.enabled),
          host: v?.host ?? "",
          port: v?.port ?? 587,
          user: v?.user ?? "",
          domains: (v?.domains ?? []).join(", "),
          defaultFrom: v?.defaultFrom ?? "",
          dailyLimit: v?.dailyLimit ?? 1000,
          gapSeconds: v?.gapSeconds ?? 5,
          pass: "",
          hasPassword: Boolean(v?.hasPassword),
        });
      });
  }, []);
  if (!s) return null;
  return (
    <Panel>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="flex items-center gap-2 font-semibold">
          <Server className="h-4 w-4 text-pin" aria-hidden />
          Shared sending server (Super Admin only)
          <Badge tone={s.enabled ? "ok" : "neutral"}>{s.enabled ? "On" : "Off"}</Badge>
        </span>
        <span className="text-[13px] text-muted">{open ? "Hide" : "Set up"}</span>
      </button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call("/api/admin/sending-server", { method: "PATCH", body: JSON.stringify(s) })) toast.success("Saved. Customers can now add a sender name.");
          }}
          className="space-y-4 border-t border-line p-5"
        >
          <p className="text-[13px] text-muted">
            Set the SMTP once (for example Amazon SES, Brevo, Mailgun or your own mail server). Customers then only enter their name and their reply email. Emails go
            out from an address on your domain, and replies go straight to the customer.
          </p>
          <Toggle checked={s.enabled} onChange={(v) => setS({ ...s, enabled: v })} label="Let customers send through this server" />
          <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
            <div>
              <Label htmlFor="ss-host">SMTP server</Label>
              <Input id="ss-host" value={s.host} onChange={(e) => setS({ ...s, host: e.target.value })} placeholder="email-smtp.eu-west-1.amazonaws.com" />
            </div>
            <div>
              <Label htmlFor="ss-port">Port</Label>
              <Input id="ss-port" type="number" value={s.port} onChange={(e) => setS({ ...s, port: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ss-user">User name</Label>
              <Input id="ss-user" value={s.user} onChange={(e) => setS({ ...s, user: e.target.value })} autoComplete="off" />
            </div>
            <div>
              <Label htmlFor="ss-pass">Password</Label>
              <Input id="ss-pass" type="password" value={s.pass} onChange={(e) => setS({ ...s, pass: e.target.value })} placeholder={s.hasPassword ? "Saved (leave empty to keep)" : ""} autoComplete="off" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ss-dom">Sending domains</Label>
              <Input id="ss-dom" value={s.domains} onChange={(e) => setS({ ...s, domains: e.target.value })} placeholder="mail.yourdomain.com" />
              <Hint>Domains set up with SPF and DKIM on this server.</Hint>
            </div>
            <div>
              <Label htmlFor="ss-from">Default sending address</Label>
              <Input id="ss-from" value={s.defaultFrom} onChange={(e) => setS({ ...s, defaultFrom: e.target.value })} placeholder="hello@mail.yourdomain.com" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ss-lim">Most emails per customer per day</Label>
              <Input id="ss-lim" type="number" min={1} value={s.dailyLimit} onChange={(e) => setS({ ...s, dailyLimit: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="ss-gap">Seconds between emails (per customer)</Label>
              <Input id="ss-gap" type="number" min={1} value={s.gapSeconds} onChange={(e) => setS({ ...s, gapSeconds: Number(e.target.value) })} />
            </div>
          </div>
          <Button type="submit">Check and save</Button>
        </form>
      )}
    </Panel>
  );
}

export function BulkEmailView({ isAdmin }: { isAdmin: boolean }) {
  const [d, setD] = useState<Data | null>(null);
  const [f, setF] = useState({ mailboxId: "", name: "", fromName: "", replyTo: "", subject: "", body: "" });
  const [list, setList] = useState("");
  const [sending, setSending] = useState(false);
  const [sender, setSender] = useState({ fromName: "", local: "", domain: "", replyTo: "" });

  const load = useCallback(() => {
    fetch("/api/bulk-email", { cache: "no-store" })
      .then((r) => r.json())
      .then((b: Data) => {
        setD(b);
        setF((x) => ({ ...x, mailboxId: x.mailboxId || b.mailboxes.find((m) => m.active)?.id || "" }));
        if (b.platform) setSender((x) => ({ ...x, domain: x.domain || b.platform!.domains[0] }));
      });
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  const emails = useMemo(() => Array.from(new Set((list.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase()))), [list]);
  const mb = d?.mailboxes.find((m) => m.id === f.mailboxId) ?? null;

  if (!d) return <div className="h-72 animate-pulse rounded-panel bg-surface" />;
  if (!d.allowed) {
    return (
      <Panel className="max-w-xl p-6">
        <h2 className="text-[15px] font-semibold">Bulk email is part of Pro and Agency</h2>
        <Link href="/billing" className="mt-4 inline-flex h-10 items-center rounded-control bg-pin px-4 text-sm font-semibold text-pin-ink">
          See plans
        </Link>
      </Panel>
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (emails.length > 1000 && !confirm(`Send to ${formatNumber(emails.length)} addresses? Sending this many from one mailbox can get it blocked.`)) return;
    setSending(true);
    const b = await call<{ queued: number; skipped: number }>("/api/bulk-email", { method: "POST", body: JSON.stringify({ ...f, list }) });
    setSending(false);
    if (b) {
      toast.success(`Queued ${formatNumber(b.queued)} emails${b.skipped ? `, ${b.skipped} skipped (unsubscribed or bounced)` : ""}. Sending has started.`);
      setList("");
      load();
    }
  }

  return (
    <div className="space-y-6">
      {isAdmin && <ServerSettings />}

      {/* Senders */}
      <Panel>
        <PanelHeader title="Send from" description="Your connected mailboxes and sender names. Set any daily limit you need." />
        {d.mailboxes.length === 0 && (
          <p className="px-5 py-4 text-sm text-muted">
            No sender yet. {d.platform ? "Add a sender name below." : ""}{" "}
            <Link href="/outreach" className="text-pin hover:underline">
              Or connect your own mailbox
            </Link>
            .
          </p>
        )}
        <ul className="divide-y divide-line">
          {d.mailboxes.map((m) => {
            const pct = Math.min(100, Math.round((m.sentToday / Math.max(1, m.dailyLimit)) * 100));
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-4 px-5 py-3 text-sm">
                <div className="min-w-[220px] flex-1">
                  <p className="font-medium">
                    {m.fromName} <span className="font-normal text-muted">&lt;{m.fromEmail}&gt;</span> {m.platform && <Badge tone="info">our server</Badge>}{" "}
                    {!m.active && <Badge tone="danger">Paused</Badge>}
                  </p>
                  {m.replyTo && <p className="text-[12px] text-muted">Replies go to {m.replyTo}</p>}
                  {m.lastError && <p className="text-[12px] text-danger">{m.lastError}</p>}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-raised">
                      <div className="h-full bg-pin" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="tabular text-[12px] text-muted">
                      {formatNumber(m.sentToday)} / {formatNumber(m.dailyLimit)} today
                    </span>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[13px] text-muted">
                  Daily limit
                  <Input
                    type="number"
                    min={1}
                    defaultValue={m.dailyLimit}
                    key={`l${m.dailyLimit}`}
                    onBlur={async (e) => {
                      const n = Number(e.target.value);
                      if (n !== m.dailyLimit && (await call(`/api/bulk-email/mailbox/${m.id}`, { method: "PATCH", body: JSON.stringify({ dailyLimit: n }) }))) {
                        toast.success("Daily limit saved.");
                        load();
                      }
                    }}
                    className="tabular h-8 w-24 text-[13px]"
                  />
                </label>
                <label className="flex items-center gap-2 text-[13px] text-muted">
                  Every
                  <Input
                    type="number"
                    min={1}
                    defaultValue={m.gapSeconds}
                    key={`g${m.gapSeconds}`}
                    onBlur={async (e) => {
                      const n = Number(e.target.value);
                      if (n !== m.gapSeconds && (await call(`/api/bulk-email/mailbox/${m.id}`, { method: "PATCH", body: JSON.stringify({ gapSeconds: n }) }))) load();
                    }}
                    className="tabular h-8 w-20 text-[13px]"
                  />
                  sec
                </label>
              </li>
            );
          })}
        </ul>
        {d.platform && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fromEmail = sender.local ? `${sender.local}@${sender.domain}` : "";
              const b = await call<{ id: string; fromEmail: string }>("/api/bulk-email/mailbox", {
                method: "POST",
                body: JSON.stringify({ fromName: sender.fromName, fromEmail, replyTo: sender.replyTo }),
              });
              if (b) {
                toast.success(`Sender added. Emails go out from ${b.fromEmail}, replies come to you.`);
                setSender({ ...sender, fromName: "", local: "" });
                load();
              }
            }}
            className="grid gap-3 border-t border-line p-5 sm:grid-cols-[1fr_1.2fr_1fr_auto] sm:items-end"
          >
            <div>
              <Label htmlFor="sn">Sender name</Label>
              <Input id="sn" value={sender.fromName} onChange={(e) => setSender({ ...sender, fromName: e.target.value })} placeholder="Ali from Bright Web" required />
            </div>
            <div>
              <Label htmlFor="sl">Sending address (optional)</Label>
              <div className="flex items-center gap-1">
                <Input id="sl" value={sender.local} onChange={(e) => setSender({ ...sender, local: e.target.value.replace(/[^a-z0-9._-]/gi, "") })} placeholder="ali" className="min-w-0" />
                <span className="text-muted">@</span>
                <Select value={sender.domain} onChange={(e) => setSender({ ...sender, domain: e.target.value })} className="w-auto" aria-label="Domain">
                  {d.platform.domains.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="sr">Your email for replies</Label>
              <Input id="sr" type="email" value={sender.replyTo} onChange={(e) => setSender({ ...sender, replyTo: e.target.value })} placeholder="ali@gmail.com" required />
            </div>
            <Button type="submit" variant="secondary">
              Add sender
            </Button>
          </form>
        )}
      </Panel>

      {/* Compose + list */}
      <form onSubmit={send} className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel className="space-y-4 p-5">
          <h2 className="text-[15px] font-semibold">New bulk email</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="bm">Send from</Label>
              <Select id="bm" value={f.mailboxId} onChange={(e) => setF({ ...f, mailboxId: e.target.value })} required>
                <option value="">Choose…</option>
                {d.mailboxes
                  .filter((m) => m.active)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fromName} &lt;{m.fromEmail}&gt;
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="bn">Name (for you)</Label>
              <Input id="bn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="October offer" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="bfn">From name (optional)</Label>
              <Input id="bfn" value={f.fromName} onChange={(e) => setF({ ...f, fromName: e.target.value })} placeholder={mb?.fromName ?? "Your name or company"} />
            </div>
            <div>
              <Label htmlFor="brt">Reply-to email (optional)</Label>
              <Input id="brt" type="email" value={f.replyTo} onChange={(e) => setF({ ...f, replyTo: e.target.value })} placeholder={mb?.replyTo ?? mb?.fromEmail ?? ""} />
            </div>
          </div>
          <div>
            <Label htmlFor="bs">Subject</Label>
            <Input id="bs" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="bb">Message</Label>
            <Textarea id="bb" rows={11} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} dir="auto" required placeholder={"Hi {{first_name}},\n\n…"} />
            <Hint>
              Fill-ins: {"{{name}}"}, {"{{first_name}}"}, {"{{email}}"}. An unsubscribe link is added to every email.
            </Hint>
          </div>
        </Panel>

        <Panel className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="bl" className="mb-0">
              Email addresses
            </Label>
            <span className="tabular text-[13px] text-pin">{formatNumber(emails.length)} unique</span>
          </div>
          <Textarea
            id="bl"
            rows={16}
            value={list}
            onChange={(e) => setList(e.target.value)}
            placeholder={"Paste one per line, or with a name:\nali@example.com\nSara Khan <sara@example.com>\nbilal@example.com, Bilal"}
            className="mt-2 font-mono text-[12px]"
          />
          <Hint>Paste from Excel or any list. Duplicates are removed. People who unsubscribed or bounced before are skipped.</Hint>
          {mb && emails.length > 0 && (
            <p className="mt-3 text-[13px] text-muted">
              At one email every {mb.gapSeconds} sec, this takes about <span className="text-ink">{duration(emails.length * mb.gapSeconds)}</span>
              {emails.length > mb.dailyLimit - mb.sentToday && (
                <>
                  , and continues tomorrow after {formatNumber(Math.max(0, mb.dailyLimit - mb.sentToday))} today (daily limit)
                </>
              )}
              .
            </p>
          )}
          <Button type="submit" className="mt-4" loading={sending} disabled={!emails.length || !f.mailboxId}>
            <Send className="h-4 w-4" aria-hidden />
            Send to {formatNumber(emails.length)}
          </Button>
        </Panel>
      </form>

      {/* Progress */}
      <Panel>
        <PanelHeader title="Sends" description="Live. Counts update every few seconds." />
        {d.batches.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Nothing sent yet.</p>}
        <ul className="divide-y divide-line">
          {d.batches.map((b) => {
            const done = b.sent + b.failed + b.skipped;
            const pct = b.total ? Math.round((done / b.total) * 100) : 0;
            const bm = d.mailboxes.find((m) => m.id === b.mailboxId);
            const eta = bm && b.queued ? b.queued * bm.gapSeconds : 0;
            return (
              <li key={b.id} className="space-y-2 px-5 py-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {b.name}{" "}
                      <Badge tone={b.status === "ACTIVE" ? "info" : b.status === "DONE" ? "ok" : b.status === "PAUSED" ? "pin" : "neutral"}>
                        {b.status === "ACTIVE" ? "Sending" : b.status.toLowerCase()}
                      </Badge>
                    </p>
                    <p className="text-[12px] text-muted">
                      {b.subject} · {timeAgo(b.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {b.status === "ACTIVE" && (
                      <Button size="sm" variant="secondary" onClick={async () => (await call(`/api/bulk-email/${b.id}`, { method: "PATCH", body: JSON.stringify({ action: "pause" }) })) && load()}>
                        <Pause className="h-3.5 w-3.5" aria-hidden />
                        Pause
                      </Button>
                    )}
                    {b.status === "PAUSED" && (
                      <Button size="sm" variant="secondary" onClick={async () => (await call(`/api/bulk-email/${b.id}`, { method: "PATCH", body: JSON.stringify({ action: "resume" }) })) && load()}>
                        <Play className="h-3.5 w-3.5" aria-hidden />
                        Resume
                      </Button>
                    )}
                    {(b.status === "ACTIVE" || b.status === "PAUSED") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => confirm("Cancel the emails that haven't gone yet?") && (await call(`/api/bulk-email/${b.id}`, { method: "PATCH", body: JSON.stringify({ action: "cancel" }) })) && load()}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-raised">
                  <div className="h-full bg-ok transition-[width] duration-700" style={{ width: `${pct}%` }} />
                </div>
                <p className="tabular flex flex-wrap gap-x-5 text-[13px]">
                  <span>
                    <span className="font-semibold text-ok">{formatNumber(b.sent)}</span> sent
                  </span>
                  <span>
                    <span className="font-semibold">{formatNumber(b.queued)}</span> left
                  </span>
                  {b.failed > 0 && (
                    <span className="text-danger">
                      <span className="font-semibold">{formatNumber(b.failed)}</span> failed
                    </span>
                  )}
                  {b.skipped > 0 && <span className="text-muted">{formatNumber(b.skipped)} skipped</span>}
                  <span className="text-muted">of {formatNumber(b.total)}</span>
                  {b.status === "ACTIVE" && b.queued > 0 && <span className="text-muted">about {duration(eta)} to go</span>}
                </p>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
