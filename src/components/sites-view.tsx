"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Textarea, Toggle } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

type SiteRow = { id: string; name: string; slug: string; customDomain: string | null; published: boolean; views: number; updatedAt: string };
type Site = SiteRow & { html: string };

export function SitesView() {
  const params = useSearchParams();
  const [list, setList] = useState<SiteRow[] | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(params.get("id"));
  const [site, setSite] = useState<Site | null>(null);
  const [instruction, setInstruction] = useState("");
  const [working, setWorking] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const [html, setHtml] = useState("");
  const [origin, setOrigin] = useState("");

  const loadList = useCallback(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((b) => {
        setList(b.sites ?? []);
        setTarget(b.target ?? null);
        if (!openId && b.sites?.[0]) setOpenId(b.sites[0].id);
      });
  }, [openId]);
  const loadSite = useCallback(() => {
    if (!openId) return;
    fetch(`/api/sites/${openId}`)
      .then((r) => r.json())
      .then((b) => {
        setSite(b.site);
        setHtml(b.site?.html ?? "");
      });
  }, [openId]);
  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(loadList, [loadList]);
  useEffect(loadSite, [loadSite]);

  async function patch(body: Record<string, unknown>, msg: string) {
    const res = await fetch(`/api/sites/${openId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(b.error ?? "Couldn't save.");
    toast.success(msg);
    loadSite();
    loadList();
  }

  async function aiChange() {
    setWorking(true);
    const res = await fetch(`/api/sites/${openId}/ai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruction }) });
    const b = await res.json().catch(() => ({}));
    setWorking(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't change it.");
    setInstruction("");
    toast.success("Updated.");
    loadSite();
  }

  if (list && list.length === 0) {
    return (
      <Panel className="max-w-2xl p-6 text-sm">
        <h2 className="text-[15px] font-semibold">No websites yet</h2>
        <p className="mt-1 text-muted">
          Open a lead, make a website demo under “Win this deal”, then press “Publish as a website”. When the business agrees, publish it and connect their
          domain. You charge them for the site and hosting.
        </p>
        <Link href="/leads?website=0&sort=score" className="mt-4 inline-flex h-10 items-center rounded-control bg-pin px-4 font-semibold text-pin-ink">
          Find leads without a website
        </Link>
      </Panel>
    );
  }

  const url = site ? `${origin}/s/${site.slug}` : "";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
      <Panel>
        <PanelHeader title="Websites" />
        <ul className="divide-y divide-line">
          {list?.map((s) => (
            <li key={s.id}>
              <button onClick={() => setOpenId(s.id)} className={cn("block w-full px-4 py-3 text-left hover:bg-raised/40", openId === s.id && "bg-raised")}>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{s.name}</span>
                  <Badge tone={s.published ? "ok" : "neutral"}>{s.published ? "Live" : "Draft"}</Badge>
                </span>
                <span className="text-[12px] text-muted">
                  {formatNumber(s.views)} visits · {timeAgo(s.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      {site && (
        <div className="space-y-6">
          <Panel className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Input defaultValue={site.name} key={site.name} onBlur={(e) => e.target.value !== site.name && patch({ name: e.target.value }, "Renamed.")} className="max-w-xs font-semibold" aria-label="Website name" />
              <div className="flex items-center gap-3">
                <Toggle checked={site.published} onChange={(v) => patch({ published: v }, v ? "Website is live." : "Website taken offline.")} label={site.published ? "Live" : "Draft"} />
                {site.published && (
                  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-pin hover:underline">
                    Open <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="slug">Address</Label>
                <div className="flex items-center gap-1 text-[13px]">
                  <span className="shrink-0 text-muted">{origin}/s/</span>
                  <Input id="slug" defaultValue={site.slug} key={site.slug} onBlur={(e) => e.target.value !== site.slug && patch({ slug: e.target.value }, "Address changed.")} className="h-9 text-[13px]" />
                </div>
              </div>
              <div>
                <Label htmlFor="dom">Their own domain</Label>
                <Input
                  id="dom"
                  defaultValue={site.customDomain ?? ""}
                  key={site.customDomain ?? ""}
                  onBlur={(e) => e.target.value !== (site.customDomain ?? "") && patch({ customDomain: e.target.value }, "Domain saved.")}
                  placeholder="www.business.com"
                  className="h-9 font-mono text-[13px]"
                />
                <Hint>
                  In their domain's DNS, add a CNAME to <span className="font-mono">{target ?? "your app's domain"}</span>. Works once the app is live.
                </Hint>
              </div>
            </div>
          </Panel>

          <Panel className="space-y-3 p-5">
            <div className="flex flex-wrap gap-2">
              <Input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Ask AI to change something: “make the colours blue”, “add Sunday 10am to 4pm”"
                className="flex-1"
                dir="auto"
              />
              <Button onClick={aiChange} loading={working} disabled={instruction.trim().length < 3}>
                <Sparkles className="h-4 w-4" aria-hidden />
                Change
              </Button>
            </div>
            <div className="overflow-hidden rounded-panel border border-line bg-white">
              <iframe title="Website preview" srcDoc={site.html} sandbox="" className="h-[560px] w-full" />
            </div>
            <div className="flex flex-wrap gap-3 text-[13px]">
              <button onClick={() => setShowHtml((v) => !v)} className="text-muted hover:text-ink">
                {showHtml ? "Hide HTML" : "Edit HTML yourself"}
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete “${site.name}”? If it's live, it goes offline.`)) return;
                  await fetch(`/api/sites/${site.id}`, { method: "DELETE" });
                  setSite(null);
                  setOpenId(null);
                  loadList();
                }}
                className="text-danger hover:underline"
              >
                Delete website
              </button>
            </div>
            {showHtml && (
              <div className="space-y-2">
                <Textarea rows={14} value={html} onChange={(e) => setHtml(e.target.value)} className="font-mono text-[12px]" />
                <Button size="sm" variant="secondary" onClick={() => patch({ html }, "Saved.")}>
                  Save HTML
                </Button>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
