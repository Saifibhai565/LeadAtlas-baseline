"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { gbpAudit, type GbpLead } from "@/lib/gbp";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

function copyLink(path: string, what: string) {
  const url = `${window.location.origin}${path}`;
  navigator.clipboard.writeText(url).catch(() => undefined);
  toast.success(`${what} link copied. Paste it into your message.`, {
    action: { label: "Open", onClick: () => window.open(url, "_blank", "noopener") },
  });
}

/** AI website demo + AI proposal for one lead. */
export function SalesTools({
  lead,
  ai,
  onChanged,
}: {
  lead: {
    id: string;
    website: string | null;
    demoToken: string | null;
    demoAt: string | null;
    demoViewedAt: string | null;
    proposalToken: string | null;
    proposalAt: string | null;
    proposalViewedAt: string | null;
    proposalAcceptedAt: string | null;
  };
  ai: boolean;
  onChanged: () => void;
}) {
  const [making, setMaking] = useState<"demo" | "proposal" | null>(null);
  const [price, setPrice] = useState("");
  const [timeline, setTimeline] = useState("");
  const [language, setLanguage] = useState("english");

  async function demo() {
    setMaking("demo");
    const res = await fetch("/api/ai/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id }) });
    const b = await res.json().catch(() => ({}));
    setMaking(null);
    if (!res.ok) return toast.error(b.error ?? "Couldn't make the demo.");
    copyLink(b.path, "Demo");
    onChanged();
  }

  async function proposal() {
    setMaking("proposal");
    const res = await fetch("/api/ai/proposal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, price, timeline, language }),
    });
    const b = await res.json().catch(() => ({}));
    setMaking(null);
    if (!res.ok) return toast.error(b.error ?? "Couldn't write the proposal.");
    copyLink(b.path, "Proposal");
    onChanged();
  }

  if (!ai) return <p className="text-[13px] text-muted">Website demos and proposals use AI, which is part of the Pro and Agency plans.</p>;

  return (
    <div className="space-y-5 text-[13px]">
      <div>
        <p className="font-medium">Website demo</p>
        <p className="text-muted">
          {lead.website ? "A fresh homepage idea to show them what a better site looks like." : "They have no website. Show them what theirs could look like."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={demo} loading={making === "demo"}>
            <Sparkles className="h-3.5 w-3.5 text-pin" aria-hidden />
            {lead.demoToken ? "Make a new demo" : "Make a demo"}
          </Button>
          {lead.demoToken && (
            <>
              <button onClick={() => copyLink(`/d/${lead.demoToken}`, "Demo")} className="text-pin hover:underline">
                Copy link
              </button>
              <a href={`/d/${lead.demoToken}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-ink">
                Open <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
              <button
                onClick={async () => {
                  const res = await fetch("/api/sites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id }) });
                  const b = await res.json().catch(() => ({}));
                  if (!res.ok) return toast.error(b.error ?? "Couldn't create the website.");
                  window.location.href = `/sites?id=${b.id}`;
                }}
                className="font-medium text-pin hover:underline"
              >
                Publish as a website
              </button>
            </>
          )}
        </div>
        {lead.demoAt && (
          <p className="mt-1 text-[12px] text-muted">
            Made {timeAgo(lead.demoAt)}. {lead.demoViewedAt ? <span className="text-ok">They opened it {timeAgo(lead.demoViewedAt)}.</span> : "Not opened yet."}
          </p>
        )}
        {making === "demo" && <p className="mt-1 text-[12px] text-muted">Designing the page. This takes 20 to 60 seconds.</p>}
      </div>

      <div>
        <p className="font-medium">Proposal</p>
        <p className="text-muted">A one-page proposal with an Accept button. When they accept, the lead moves to Won.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price, e.g. Rs 45,000" className="h-9 text-[13px]" />
          <Input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="Timeline, e.g. 10 days" className="h-9 text-[13px]" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Select value={language} onChange={(e) => setLanguage(e.target.value)} className="h-8 w-auto text-[13px]" aria-label="Language">
            <option value="english">English</option>
            <option value="roman_urdu">Roman Urdu</option>
            <option value="urdu">Urdu</option>
          </Select>
          <Button size="sm" variant="secondary" onClick={proposal} loading={making === "proposal"}>
            <Sparkles className="h-3.5 w-3.5 text-pin" aria-hidden />
            {lead.proposalToken ? "Write a new proposal" : "Write a proposal"}
          </Button>
          {lead.proposalToken && (
            <>
              <button onClick={() => copyLink(`/p/${lead.proposalToken}`, "Proposal")} className="text-pin hover:underline">
                Copy link
              </button>
              <a href={`/p/${lead.proposalToken}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-ink">
                Open <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </>
          )}
        </div>
        {lead.proposalAt && (
          <p className="mt-1 text-[12px] text-muted">
            Written {timeAgo(lead.proposalAt)}.{" "}
            {lead.proposalAcceptedAt ? (
              <span className="font-medium text-ok">Accepted {timeAgo(lead.proposalAcceptedAt)}.</span>
            ) : lead.proposalViewedAt ? (
              <span className="text-info">Opened {timeAgo(lead.proposalViewedAt)}, not accepted yet.</span>
            ) : (
              "Not opened yet."
            )}
          </p>
        )}
      </div>
    </div>
  );
}

type Competitor = { id: string; title: string; rating: number | null; reviewCount: number | null; website: string | null; distanceKm: number };

export function Competitors({ leadId, title }: { leadId: string; title: string }) {
  const [data, setData] = useState<{ competitors: Competitor[]; me?: { rating: number | null; reviewCount: number | null }; reason?: string } | null>(null);
  useEffect(() => {
    fetch(`/api/leads/${leadId}/competitors`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ competitors: [] }));
  }, [leadId]);

  if (!data) return <p className="text-[13px] text-muted">Looking nearby…</p>;
  if (data.reason === "no-location") return <p className="text-[13px] text-muted">No map location or category saved for this lead.</p>;
  if (data.competitors.length === 0) return <p className="text-[13px] text-muted">No rated businesses of the same kind within 5 km in your leads yet. Search the area to compare.</p>;

  const top = data.competitors[0];
  const line =
    data.me?.rating != null && top.rating != null && top.rating > data.me.rating
      ? `${title} has ${data.me.rating}★ from ${data.me.reviewCount ?? 0} reviews, while ${top.title}, ${top.distanceKm} km away, has ${top.rating}★ from ${top.reviewCount ?? 0}.`
      : null;

  return (
    <div className="space-y-2 text-[13px]">
      <ul className="divide-y divide-line rounded-control border border-line">
        {data.competitors.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 truncate">{c.title}</span>
            <span className="tabular shrink-0 text-muted">
              ★ {c.rating} ({formatNumber(c.reviewCount ?? 0)}) · {c.distanceKm} km · {c.website ? "website" : <span className="text-pin">no website</span>}
            </span>
          </li>
        ))}
      </ul>
      {line && (
        <p className="text-muted">
          {line}{" "}
          <button onClick={() => navigator.clipboard.writeText(line).then(() => toast.success("Copied."))} className="text-pin hover:underline">
            Copy for a message
          </button>
        </p>
      )}
    </div>
  );
}

export function GbpCheck({ lead }: { lead: GbpLead }) {
  const { score, items } = gbpAudit(lead);
  return (
    <div className="space-y-2 text-[13px]">
      <p>
        <span className={cn("tabular font-semibold", score >= 75 ? "text-ok" : score >= 50 ? "text-pin" : "text-danger")}>{score}/100</span>
        <span className="text-muted"> profile strength on Google Maps</span>
      </p>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li key={i.label} className="flex gap-2">
            {i.ok ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" aria-hidden /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />}
            <span>
              {i.label}
              {!i.ok && <span className="block text-muted">{i.tip}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
