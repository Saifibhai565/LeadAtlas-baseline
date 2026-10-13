"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

type Campaign = { id: string; name: string; channel: string; status: string; createdAt: string; templates: string[]; counts: Record<string, number> };
type Template = { id: string; name: string; channel: string; body: string };

export function CampaignsView() {
  const router = useRouter();
  const params = useSearchParams();
  const presetQuery = params.get("query") ?? "";
  const [list, setList] = useState<Campaign[] | null>(null);
  const [creating, setCreating] = useState(Boolean(presetQuery));
  const [templates, setTemplates] = useState<Template[]>([]);
  const [cats, setCats] = useState<{ name: string; count: number }[]>([]);
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);
  const [form, setForm] = useState({ name: "", channel: "WHATSAPP", status: "NEW", category: "", tag: "", minScore: "", website: "" });
  const [messages, setMessages] = useState<string[]>([""]);
  const [waConnected, setWaConnected] = useState(false);
  const [smsReady, setSmsReady] = useState(false);
  const [waTpls, setWaTpls] = useState<{ name: string; language: string; body: string; params: number }[]>([]);
  const [waTpl, setWaTpl] = useState("");
  const [waParams, setWaParams] = useState<string[]>([]);
  const automatic = form.channel.endsWith("_API");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((b) => setList(b.campaigns ?? []));
    fetch("/api/templates")
      .then((r) => r.json())
      .then((b) => setTemplates((b.templates ?? []).filter((t: Template) => t.channel === "WHATSAPP")));
    fetch("/api/whatsapp")
      .then((r) => r.json())
      .then((b) => {
        setWaConnected(Boolean(b.connected));
        if (b.connected)
          fetch("/api/whatsapp/templates")
            .then((r) => r.json())
            .then((t) => setWaTpls(t.templates ?? []))
            .catch(() => undefined);
      })
      .catch(() => undefined);
    fetch("/api/integrations/sms")
      .then((r) => r.json())
      .then((b) => setSmsReady(Boolean(b.smsUrl)))
      .catch(() => undefined);
    fetch("/api/leads/facets")
      .then((r) => r.json())
      .then((b) => {
        setCats(b.categories ?? []);
        setTags(b.tags ?? []);
      });
  }, []);

  function query() {
    if (presetQuery) return presetQuery;
    const p = new URLSearchParams();
    if (form.status) p.set("status", form.status);
    if (form.category) p.set("category", form.category);
    if (form.tag) p.set("tag", form.tag);
    if (form.minScore) p.set("minScore", form.minScore);
    if (form.website) p.set("website", form.website);
    return p.toString();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        channel: form.channel,
        templates: form.channel === "WHATSAPP_API" ? ["template"] : messages,
        query: query(),
        waTemplate:
          form.channel === "WHATSAPP_API"
            ? (() => {
                const t = waTpls.find((x) => `${x.name}|${x.language}` === waTpl);
                return t ? { name: t.name, language: t.language, params: waParams } : null;
              })()
            : undefined,
      }),
    });
    const b = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't create the campaign.");
    toast.success(`Campaign ready with ${formatNumber(b.people)} people.`);
    router.push(`/campaigns/${b.campaign.id}`);
  }

  return (
    <div className="space-y-6">
      {!creating ? (
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          New campaign
        </Button>
      ) : (
        <Panel>
          <PanelHeader title="New campaign" description="Pick who to message and up to 5 versions of your message. You send each one yourself, one tap at a time." />
          <form onSubmit={create} className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cn">Name</Label>
                <Input id="cn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Lahore clinics, October" required />
              </div>
              <div>
                <Label htmlFor="cc">Send by</Label>
                <Select id="cc" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                  <option value="WHATSAPP">WhatsApp (opens your WhatsApp)</option>
                  <option value="SMS">SMS (opens your phone's messages)</option>
                  {waConnected && <option value="WHATSAPP_API">WhatsApp Business, automatic (opted-in only)</option>}
                  {smsReady && <option value="SMS_API">SMS provider, automatic (opted-in only)</option>}
                </Select>
              </div>
            </div>

            {presetQuery ? (
              <p className="rounded-control border border-line bg-night/40 px-3 py-2 text-[13px] text-muted">
                Using the leads you chose on the Leads page (only those with a phone number).{" "}
                <Link href="/campaigns" className="text-pin hover:underline">
                  Choose differently
                </Link>
              </p>
            ) : (
              <div>
                <p className="mb-1.5 text-[13px] font-medium">Who to message (leads with a phone number)</p>
                <div className="flex flex-wrap gap-2">
                  <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-9 w-auto text-[13px]" aria-label="Status">
                    <option value="NEW">Not contacted yet</option>
                    <option value="CONTACTED">Contacted (follow-up)</option>
                    <option value="">Any status</option>
                  </Select>
                  <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-9 w-auto max-w-[200px] text-[13px]" aria-label="Category">
                    <option value="">All categories</option>
                    {cats.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.count})
                      </option>
                    ))}
                  </Select>
                  {tags.length > 0 && (
                    <Select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} className="h-9 w-auto text-[13px]" aria-label="Tag">
                      <option value="">Any tag</option>
                      {tags.map((t) => (
                        <option key={t.name} value={t.name}>
                          #{t.name}
                        </option>
                      ))}
                    </Select>
                  )}
                  <Select value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="h-9 w-auto text-[13px]" aria-label="Website">
                    <option value="">With or without website</option>
                    <option value="0">No website</option>
                    <option value="1">Has a website</option>
                  </Select>
                  <Select value={form.minScore} onChange={(e) => setForm({ ...form, minScore: e.target.value })} className="h-9 w-auto text-[13px]" aria-label="Score">
                    <option value="">Any score</option>
                    <option value="45">Warm and hot (45+)</option>
                    <option value="70">Hot only (70+)</option>
                  </Select>
                </div>
              </div>
            )}

            {automatic && (
              <p className="rounded-control border border-info/30 bg-info/5 px-3 py-2 text-[13px] text-info">
                Automatic campaigns only go to leads marked as agreed to receive messages (in the lead panel, or people who messaged your WhatsApp Business
                number). Others are left out.
              </p>
            )}

            {form.channel === "WHATSAPP_API" ? (
              <div className="space-y-2">
                <p className="text-[13px] font-medium">Approved template</p>
                <Select
                  value={waTpl}
                  onChange={(e) => {
                    setWaTpl(e.target.value);
                    const t = waTpls.find((x) => `${x.name}|${x.language}` === e.target.value);
                    setWaParams(Array.from({ length: t?.params ?? 0 }, (_, i) => (i === 0 ? "{{name}}" : "")));
                  }}
                  required
                >
                  <option value="">{waTpls.length ? "Choose a template" : "No approved templates in your Meta account"}</option>
                  {waTpls.map((t) => (
                    <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>
                      {t.name} ({t.language})
                    </option>
                  ))}
                </Select>
                {waTpls.find((x) => `${x.name}|${x.language}` === waTpl)?.body && (
                  <p className="text-[13px] text-muted">{waTpls.find((x) => `${x.name}|${x.language}` === waTpl)?.body}</p>
                )}
                {waParams.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-12 text-[13px] text-muted">{`{{${i + 1}}}`}</span>
                    <Input value={p} onChange={(e) => setWaParams((all) => all.map((x, j) => (j === i ? e.target.value : x)))} placeholder="{{name}}, {{city}} or text" className="h-9 text-[13px]" />
                  </div>
                ))}
              </div>
            ) : (
            <div className="space-y-3">
              <p className="text-[13px] font-medium">Messages</p>
              {messages.map((m, i) => (
                <div key={i} className="rounded-control border border-line p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-medium">Version {String.fromCharCode(65 + i)}</span>
                    {templates.length > 0 && (
                      <Select
                        value=""
                        onChange={(e) => {
                          const t = templates.find((x) => x.id === e.target.value);
                          if (t) setMessages((all) => all.map((x, j) => (j === i ? t.body : x)));
                        }}
                        className="h-8 w-auto text-[13px]"
                        aria-label="Start from a template"
                      >
                        <option value="">Start from a template…</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </Select>
                    )}
                    {messages.length > 1 && (
                      <button type="button" onClick={() => setMessages((all) => all.filter((_, j) => j !== i))} className="ml-auto text-muted hover:text-danger">
                        Remove
                      </button>
                    )}
                  </div>
                  <Textarea
                    rows={4}
                    value={m}
                    onChange={(e) => setMessages((all) => all.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder="Assalam o Alaikum! {{name}} ko Google Maps par dekha…"
                    className="text-[13px]"
                    dir="auto"
                    required
                  />
                </div>
              ))}
              {messages.length < 5 && (
                <Button type="button" size="sm" variant="secondary" onClick={() => setMessages((all) => [...all, ""])}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Add another version
                </Button>
              )}
              <Hint>
                Versions take turns (A, B, C…), and the campaign shows which one gets the most replies. Details like {"{{name}}"} and {"{{city}}"} fill in for each lead.
              </Hint>
            </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" loading={saving}>
                Create campaign
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Your campaigns" />
        {list?.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">No campaigns yet.</p>}
        <ul className="divide-y divide-line">
          {list?.map((c) => {
            const total = (c.counts.PENDING ?? 0) + (c.counts.SENT ?? 0) + (c.counts.SKIPPED ?? 0);
            const done = total - (c.counts.PENDING ?? 0);
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <Link href={`/campaigns/${c.id}`} className="min-w-0 hover:text-pin">
                  <p className="font-medium">
                    {c.name}{" "}
                    <Badge tone={c.channel.startsWith("SMS") ? "info" : "ok"}>
                      {c.channel.startsWith("SMS") ? "SMS" : "WhatsApp"}
                      {c.channel.endsWith("_API") ? ", automatic" : ""}
                    </Badge>{" "}
                    {c.status === "DONE" && <Badge>Done</Badge>}
                  </p>
                  <p className="tabular mt-0.5 text-[13px] text-muted">
                    {formatNumber(c.counts.SENT ?? 0)} sent of {formatNumber(total)}, {c.templates.length} version{c.templates.length > 1 ? "s" : ""}, {timeAgo(c.createdAt)}
                  </p>
                  <div className="mt-2 h-1 w-48 overflow-hidden rounded-full bg-raised">
                    <div className="h-full bg-pin" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <Link href={`/campaigns/${c.id}`} className={cn("inline-flex h-8 items-center rounded-control px-3 text-[13px]", c.status === "DONE" ? "border border-line" : "bg-pin font-semibold text-pin-ink")}>
                    {c.status === "DONE" ? "See results" : "Continue"}
                  </Link>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete “${c.name}”? Messages already sent stay in each lead's history.`)) return;
                      const res = await fetch(`/api/campaigns/${c.id}`, { method: "DELETE" });
                      if (res.ok) setList((l) => l?.filter((x) => x.id !== c.id) ?? null);
                    }}
                    className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-danger"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
