"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { cn, timeAgo } from "@/lib/utils";

type MB = { id: string; label: string; fromEmail: string; active: boolean; warmup: boolean; warmupStage: number; reputation: number; dnsSpf: boolean | null; dnsDkim: boolean | null; dnsDmarc: boolean | null; dnsCheckedAt: string | null };

function Light({ ok, label }: { ok: boolean | null; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]">
      <span className={cn("h-2 w-2 rounded-full", ok === true ? "bg-ok" : ok === false ? "bg-danger" : "bg-muted")} aria-hidden />
      {label}
    </span>
  );
}

export function DeliverabilityView() {
  const [boxes, setBoxes] = useState<MB[] | null>(null);
  const [dns, setDns] = useState({ domain: "", result: null as null | { score: number; result: Record<string, { ok: boolean; note?: string; record?: string; policy?: string; selector?: string }> } });
  const [ip, setIp] = useState({ value: "", result: null as null | { listed: string[]; checked: number; note?: string } });
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/deliverability")
      .then((r) => r.json())
      .then((b) => setBoxes(b.mailboxes ?? []));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/deliverability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(b.error ?? "Check failed.");
      return null;
    }
    return b;
  }

  return (
    <div className="space-y-6">
      {/* Mailbox health + warmup */}
      <Panel>
        <PanelHeader title="Mailbox health and warmup" description="Warmup sends friendly emails between your mailboxes and replies to them, building trust so your real emails reach the inbox." />
        {boxes?.length === 0 && <p className="px-5 py-6 text-sm text-muted">Connect a mailbox under Email outreach first.</p>}
        <ul className="divide-y divide-line">
          {boxes?.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-4 px-5 py-4 text-sm">
              <div className="min-w-[220px] flex-1">
                <p className="font-medium">
                  {m.fromEmail} {!m.active && <Badge tone="danger">Paused</Badge>}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-3">
                  <Light ok={m.dnsSpf} label="SPF" />
                  <Light ok={m.dnsDkim} label="DKIM" />
                  <Light ok={m.dnsDmarc} label="DMARC" />
                  <span className="text-[12px] text-muted">
                    Reputation <span className={cn("font-semibold", m.reputation >= 80 ? "text-ok" : m.reputation >= 50 ? "text-pin" : "text-danger")}>{m.reputation}</span>
                  </span>
                  {m.dnsCheckedAt && <span className="text-[12px] text-muted">checked {timeAgo(m.dnsCheckedAt)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={busy === `dns-${m.id}`}
                  onClick={async () => {
                    setBusy(`dns-${m.id}`);
                    await fetch("/api/outreach/warmup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mailboxId: m.id, checkDns: true }) });
                    setBusy(null);
                    load();
                  }}
                >
                  Check DNS
                </Button>
                <Button
                  size="sm"
                  variant={m.warmup ? "secondary" : "primary"}
                  onClick={async () => {
                    const res = await fetch("/api/outreach/warmup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mailboxId: m.id, on: !m.warmup }) });
                    if (res.ok) {
                      toast.success(m.warmup ? "Warmup stopped." : "Warmup started. It ramps up over the next few weeks.");
                      load();
                    }
                  }}
                >
                  {m.warmup ? `Warming up (day stage ${m.warmupStage + 1})` : "Start warmup"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-5 py-3 text-[12px] text-muted">Warmup needs at least two connected mailboxes so they can email each other.</p>
      </Panel>

      {/* DNS checker */}
      <Panel className="p-5">
        <h2 className="text-[15px] font-semibold">Domain setup check (SPF, DKIM, DMARC)</h2>
        <p className="mt-1 text-sm text-muted">These three DNS records tell Gmail and Outlook your mail is really from you. Without them, cold emails usually go to spam.</p>
        <div className="mt-3 flex gap-2">
          <Input value={dns.domain} onChange={(e) => setDns({ ...dns, domain: e.target.value })} placeholder="mail.yourbusiness.com" />
          <Button
            loading={busy === "dns"}
            onClick={async () => {
              setBusy("dns");
              const b = await post({ action: "dns", domain: dns.domain });
              setBusy(null);
              if (b) setDns({ ...dns, result: b });
            }}
          >
            Check
          </Button>
        </div>
        {dns.result && (
          <div className="mt-4 space-y-2 text-[13px]">
            <p className="font-medium">
              Score: <span className={dns.result.score >= 66 ? "text-ok" : dns.result.score >= 33 ? "text-pin" : "text-danger"}>{dns.result.score}/100</span>
            </p>
            {(["spf", "dkim", "dmarc"] as const).map((k) => {
              const r = dns.result!.result[k];
              return (
                <div key={k} className="rounded-control border border-line p-3">
                  <p className="font-medium">
                    {k.toUpperCase()} {r.ok ? <Badge tone="ok">Found</Badge> : <Badge tone="danger">Missing</Badge>}
                    {r.policy && <span className="text-muted"> · policy: {r.policy}</span>}
                  </p>
                  {r.note && <p className="mt-1 text-muted">{r.note}</p>}
                  {r.record && <p className="mt-1 break-all font-mono text-[11px] text-muted">{r.record}</p>}
                </div>
              );
            })}
            <p className="text-[12px] text-muted">Add missing records in your domain's DNS settings. Your email provider (Google Workspace, Zoho, etc.) gives you the exact values.</p>
          </div>
        )}
      </Panel>

      {/* Blacklist checker */}
      <Panel className="p-5">
        <h2 className="text-[15px] font-semibold">Blacklist check</h2>
        <p className="mt-1 text-sm text-muted">Check if your sending server's IP is on a spam blacklist. Find the IP in a sent email's headers, or ask your provider.</p>
        <div className="mt-3 flex gap-2">
          <Input value={ip.value} onChange={(e) => setIp({ ...ip, value: e.target.value })} placeholder="e.g. 203.0.113.5" className="font-mono" />
          <Button
            loading={busy === "bl"}
            onClick={async () => {
              setBusy("bl");
              const b = await post({ action: "blacklist", ip: ip.value });
              setBusy(null);
              if (b) setIp({ ...ip, result: b });
            }}
          >
            Check
          </Button>
        </div>
        {ip.result && (
          <p className="mt-3 text-[13px]">
            {ip.result.note ? (
              <span className="text-muted">{ip.result.note}</span>
            ) : ip.result.listed.length === 0 ? (
              <span className="text-ok">Clean. Not on any of the {ip.result.checked} blacklists we check.</span>
            ) : (
              <span className="text-danger">Listed on: {ip.result.listed.join(", ")}. Ask your provider to help with removal.</span>
            )}
          </p>
        )}
      </Panel>
    </div>
  );
}
