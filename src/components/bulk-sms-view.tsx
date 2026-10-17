"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Textarea } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { formatNumber, timeAgo } from "@/lib/utils";

type Batch = { id: string; name: string; body: string; status: string; total: number; sent: number; failed: number; queued: number; createdAt: string };
type Data = { providerReady: boolean; batches: Batch[] };

const PHONE = /(\+?\d[\d\s().-]{7,}\d)/g;

async function call<T>(url: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) {
    toast.error(b.error ?? "Something went wrong.");
    return null;
  }
  return b as T;
}

export function BulkSmsView() {
  const [d, setD] = useState<Data | null>(null);
  const [f, setF] = useState({ name: "", body: "" });
  const [list, setList] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    fetch("/api/bulk-sms", { cache: "no-store" })
      .then((r) => r.json())
      .then(setD);
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const numbers = useMemo(() => {
    const set = new Set<string>();
    for (const line of list.split(/[\n;]+/)) {
      const m = line.match(PHONE);
      if (m) {
        const n = m[0].replace(/[^\d+]/g, "");
        if (n.replace(/\D/g, "").length >= 9) set.add(n);
      }
    }
    return set.size;
  }, [list]);

  if (!d) return <div className="h-72 animate-pulse rounded-panel bg-surface" />;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (numbers > 500 && !confirm(`Send to ${formatNumber(numbers)} numbers? Make sure these people agreed to receive messages.`)) return;
    setSending(true);
    const b = await call<{ queued: number }>("/api/bulk-sms", { method: "POST", body: JSON.stringify({ ...f, list }) });
    setSending(false);
    if (b) {
      toast.success(`Queued ${formatNumber(b.queued)} messages. Sending has started.`);
      setList("");
      load();
    }
  }

  return (
    <div className="space-y-6">
      {!d.providerReady && (
        <Panel className="p-5 text-sm">
          <p className="font-medium">First, connect an SMS provider</p>
          <p className="mt-1 text-muted">
            Bulk SMS sends through your SMS provider (a PTA-registered company or an Android SMS gateway).{" "}
            <Link href="/settings" className="text-pin hover:underline">
              Set it up in Settings
            </Link>
            .
          </p>
        </Panel>
      )}

      <form onSubmit={send} className="grid items-start gap-6 lg:grid-cols-[1fr_1fr]">
        <Panel className="space-y-4 p-5">
          <h2 className="text-[15px] font-semibold">New bulk SMS</h2>
          <div>
            <Label htmlFor="sn">Name (for you)</Label>
            <Input id="sn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="October offer" />
          </div>
          <div>
            <Label htmlFor="sb">Message</Label>
            <Textarea id="sb" rows={6} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} dir="auto" required placeholder={"Assalam o Alaikum {{name}}, …"} maxLength={1000} />
            <Hint>
              {f.body.length} characters. One SMS is about 160 letters; longer messages count as more. Use {"{{name}}"} to add each person's name.
            </Hint>
          </div>
        </Panel>

        <Panel className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="sl" className="mb-0">
              Phone numbers
            </Label>
            <span className="tabular text-[13px] text-pin">{formatNumber(numbers)} numbers</span>
          </div>
          <Textarea
            id="sl"
            rows={12}
            value={list}
            onChange={(e) => setList(e.target.value)}
            placeholder={"Paste one per line, or with a name:\n+923001234567\n0300 1234567, Ali\n+923451112223"}
            className="mt-2 font-mono text-[12px]"
          />
          <Hint>Paste from Excel or any list. Duplicates are removed. Only message people who agreed to hear from you.</Hint>
          <Button type="submit" className="mt-4" loading={sending} disabled={!numbers || !d.providerReady}>
            <Send className="h-4 w-4" aria-hidden />
            Send to {formatNumber(numbers)}
          </Button>
        </Panel>
      </form>

      <Panel>
        <PanelHeader title="Sends" description="Live. Counts update every few seconds." />
        {d.batches.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Nothing sent yet.</p>}
        <ul className="divide-y divide-line">
          {d.batches.map((b) => {
            const done = b.sent + b.failed;
            const pct = b.total ? Math.round((done / b.total) * 100) : 0;
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
                    <p className="line-clamp-1 text-[12px] text-muted">
                      {b.body} · {timeAgo(b.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {b.status === "ACTIVE" && (
                      <Button size="sm" variant="secondary" onClick={async () => (await call(`/api/bulk-sms/${b.id}`, { method: "PATCH", body: JSON.stringify({ action: "pause" }) })) && load()}>
                        <Pause className="h-3.5 w-3.5" aria-hidden /> Pause
                      </Button>
                    )}
                    {b.status === "PAUSED" && (
                      <Button size="sm" variant="secondary" onClick={async () => (await call(`/api/bulk-sms/${b.id}`, { method: "PATCH", body: JSON.stringify({ action: "resume" }) })) && load()}>
                        <Play className="h-3.5 w-3.5" aria-hidden /> Resume
                      </Button>
                    )}
                    {(b.status === "ACTIVE" || b.status === "PAUSED") && (
                      <Button size="sm" variant="ghost" onClick={async () => confirm("Cancel the messages not sent yet?") && (await call(`/api/bulk-sms/${b.id}`, { method: "PATCH", body: JSON.stringify({ action: "cancel" }) })) && load()}>
                        <X className="h-3.5 w-3.5" aria-hidden /> Cancel
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
                  <span className="text-muted">of {formatNumber(b.total)}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
