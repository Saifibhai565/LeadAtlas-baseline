"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge, Panel } from "@/components/ui/panel";
import { formatNumber } from "@/lib/utils";

type Tpl = { id: string; authorName: string; official: boolean; name: string; category: string; channel: string; language: string; subject: string | null; body: string; uses: number };

const CHANNEL_LABEL: Record<string, string> = { WHATSAPP: "WhatsApp", EMAIL: "Email", SMS: "SMS", SEQUENCE: "Email sequence" };
const LANG_LABEL: Record<string, string> = { english: "English", urdu: "Urdu", roman_urdu: "Roman Urdu" };

export function MarketplaceView() {
  const [data, setData] = useState<{ templates: Tpl[]; categories: string[] } | null>(null);
  const [f, setF] = useState({ q: "", channel: "", category: "", language: "" });
  const [added, setAdded] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
    fetch(`/api/marketplace?${p}`)
      .then((r) => r.json())
      .then(setData);
  }, [f]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function add(t: Tpl) {
    const res = await fetch(`/api/marketplace/${t.id}`, { method: "POST" });
    if (!res.ok) return toast.error("Couldn't add it.");
    setAdded((s) => new Set(s).add(t.id));
    toast.success(t.channel === "SEQUENCE" ? "Added to your sequences (Email outreach)." : "Added to your templates.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search templates" className="pl-9" />
        </div>
        <Select value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })} className="w-auto">
          <option value="">All types</option>
          {Object.entries(CHANNEL_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} className="w-auto">
          <option value="">All languages</option>
          {Object.entries(LANG_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        {data && data.categories.length > 0 && (
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="w-auto">
            <option value="">All categories</option>
            {data.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        )}
      </div>

      {!data ? (
        <div className="h-64 animate-pulse rounded-panel bg-surface" />
      ) : data.templates.length === 0 ? (
        <Panel className="p-10 text-center text-sm text-muted">No templates match.</Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.templates.map((t) => (
            <Panel key={t.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {t.name} {t.official && <Badge tone="pin">Official</Badge>}
                  </p>
                  <p className="text-[12px] text-muted">
                    {CHANNEL_LABEL[t.channel]} · {LANG_LABEL[t.language] ?? t.language} · {t.category} · by {t.authorName}
                  </p>
                </div>
                <span className="tabular shrink-0 text-[12px] text-muted">{formatNumber(t.uses)} uses</span>
              </div>
              {t.subject && <p className="mt-2 text-[13px] font-medium">Subject: {t.subject}</p>}
              <p className="mt-2 line-clamp-5 whitespace-pre-line rounded-control bg-night/40 p-3 text-[13px] text-muted" dir="auto">
                {t.channel === "SEQUENCE" ? "Multi-step email sequence" : t.body}
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => add(t)} disabled={added.has(t.id)}>
                  {added.has(t.id) ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden /> Added
                    </>
                  ) : (
                    "Use this"
                  )}
                </Button>
                {t.channel !== "SEQUENCE" && (
                  <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(t.body).then(() => toast.success("Copied."))}>
                    <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
                  </Button>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Panel className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-muted">
          <Sparkles className="mr-1.5 inline h-4 w-4 text-pin" aria-hidden />
          Have a message that works well? Submit it from the Templates page and we'll review it for the marketplace.
        </p>
        <a href="/templates" className="text-[13px] font-medium text-pin hover:underline">
          Go to Templates
        </a>
      </Panel>
    </div>
  );
}
