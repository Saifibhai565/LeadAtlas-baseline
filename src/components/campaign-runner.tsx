"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, MessageSquare, SkipForward, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { formatNumber, whatsappNumber } from "@/lib/utils";

type Data = {
  campaign: { id: string; name: string; channel: string; templates: string[]; status: string };
  next: {
    id: string;
    phone: string;
    templateIndex: number;
    message: string;
    lead: { id: string; title: string; category: string | null; address: string | null; rating: number | null; reviewCount: number | null; website: string | null };
  } | null;
  counts: { pending: number; sent: number; skipped: number };
  sentToday: number;
  perTemplate: { sent: number; replied: number }[];
};

const DAILY_SAFE = 40;

export function CampaignRunner({ id }: { id: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${id}`, { cache: "no-store" });
    if (!res.ok) return;
    const b = (await res.json()) as Data;
    setD(b);
    setMessage(b.next?.message ?? "");
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  async function mark(action: "sent" | "skip") {
    if (!d?.next) return;
    setBusy(true);
    await fetch(`/api/campaigns/${id}/items/${d.next.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, message }),
    });
    setBusy(false);
    load();
  }

  function openAndMark() {
    if (!d?.next) return;
    if (d.campaign.channel === "SMS") {
      const num = d.next.phone.replace(/[^\d+]/g, "");
      window.location.href = `sms:${num}?&body=${encodeURIComponent(message)}`;
    } else {
      const wa = whatsappNumber(d.next.phone);
      if (!wa) return toast.error("This phone number doesn't look right. Skip it.");
      window.open(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    }
    mark("sent");
  }

  if (!d) return <div className="h-64 animate-pulse rounded-panel bg-surface" />;
  const total = d.counts.pending + d.counts.sent + d.counts.skipped;
  const done = total - d.counts.pending;
  const isSms = d.campaign.channel.startsWith("SMS");
  const automatic = d.campaign.channel.endsWith("_API");

  return (
    <div className="space-y-6">
      <Link href="/campaigns" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        All campaigns
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-[24px] font-semibold tracking-[-0.015em]">{d.campaign.name}</h1>
        <Badge tone={isSms ? "info" : "ok"}>{isSms ? "SMS" : "WhatsApp"}</Badge>
        <span className="tabular text-sm text-muted">
          {formatNumber(done)} of {formatNumber(total)} done
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div className="h-full bg-pin transition-[width]" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>

      {automatic && (
        <Panel className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
          <p>
            {d.campaign.status === "DONE"
              ? "Finished. Every opted-in lead was sent the message."
              : d.campaign.status === "PAUSED"
                ? "Paused. Nothing is being sent."
                : "Sending automatically through the official channel, a few messages every minute while the app runs."}
          </p>
          {d.campaign.status !== "DONE" && (
            <Button
              variant="secondary"
              onClick={async () => {
                await fetch(`/api/campaigns/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: d.campaign.status === "PAUSED" ? "ACTIVE" : "PAUSED" }),
                });
                load();
              }}
            >
              {d.campaign.status === "PAUSED" ? "Resume" : "Pause"}
            </Button>
          )}
        </Panel>
      )}

      {!automatic && d.sentToday >= DAILY_SAFE && (
        <p className="flex items-start gap-2 rounded-panel border border-pin/40 bg-pin/10 px-4 py-3 text-sm text-pin">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          You've sent {d.sentToday} campaign messages in the last 24 hours. Messaging many new people in a day is the main reason WhatsApp numbers get
          blocked. Consider continuing tomorrow.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          {automatic ? (
            <p className="p-6 text-sm text-muted">
              {d.counts.pending} waiting, {d.counts.sent} sent, {d.counts.skipped} skipped (not opted in, or the channel refused it; see each lead's history).
            </p>
          ) : d.next ? (
            <div className="space-y-4 p-6">
              <div>
                <p className="text-[13px] text-muted">
                  Next · version {String.fromCharCode(65 + d.next.templateIndex)}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{d.next.lead.title}</h2>
                <p className="text-[13px] text-muted">
                  {[d.next.lead.category, d.next.lead.rating != null ? `★ ${d.next.lead.rating} (${d.next.lead.reviewCount ?? 0})` : null, d.next.lead.website ? null : "no website"]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="tabular mt-1 text-sm">{d.next.phone}</p>
              </div>
              <Textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} className="text-[14px]" dir="auto" aria-label="Message" />
              <div className="flex flex-wrap gap-2">
                <Button onClick={openAndMark} loading={busy} className="flex-1">
                  <MessageSquare className="h-4 w-4" aria-hidden />
                  {isSms ? "Open SMS and go to next" : "Open WhatsApp and go to next"}
                </Button>
                <Button variant="secondary" onClick={() => mark("skip")} disabled={busy}>
                  <SkipForward className="h-4 w-4" aria-hidden />
                  Skip
                </Button>
              </div>
              <p className="text-[12px] text-muted">
                {isSms
                  ? "Opens the messages app with the text ready. Works best on your phone: open this page there."
                  : "Opens WhatsApp with the message ready. Press send there, then come back here for the next one."}
              </p>
            </div>
          ) : (
            <div className="p-10 text-center">
              <p className="text-lg font-semibold">All done</p>
              <p className="mt-1 text-sm text-muted">Every lead in this campaign was messaged or skipped. Replies go into each lead's history as you note them.</p>
              <Link href="/pipeline" className="mt-4 inline-flex h-10 items-center rounded-control bg-pin px-4 text-sm font-semibold text-pin-ink">
                Go to pipeline
              </Link>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Which message works best" description="A reply counts when you move the lead to Interested or Won." />
          <ul className="divide-y divide-line">
            {d.campaign.templates.map((t, i) => {
              const s = d.perTemplate[i] ?? { sent: 0, replied: 0 };
              const rate = s.sent ? Math.round((s.replied / s.sent) * 100) : 0;
              return (
                <li key={i} className="px-5 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">Version {String.fromCharCode(65 + i)}</span>
                    <span className="tabular text-muted">
                      {s.sent} sent, {s.replied} replied {s.sent > 0 && <span className="text-ink">({rate}%)</span>}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted" dir="auto">
                    {t}
                  </p>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
