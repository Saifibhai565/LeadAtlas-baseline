"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Textarea } from "@/components/ui/field";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { renderTemplate, VARIABLES, type Me } from "@/lib/template";
import { cn } from "@/lib/utils";

type Template = { id: string; name: string; channel: string; subject: string | null; body: string };

const SAMPLE = {
  title: "Al-Shifa Dental Clinic",
  category: "Dental clinic",
  address: "12 Main Boulevard, Gulberg, Lahore",
  website: "alshifadental.pk",
  rating: 4.6,
  reviewCount: 87,
  auditIssues: "NOT_MOBILE,SLOW",
};

export function TemplatesView() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [me, setMe] = useState<Me>({ name: "You" });
  const [current, setCurrent] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([fetch("/api/templates").then((r) => r.json()), fetch("/api/settings").then((r) => r.json())]).then(([t, s]) => {
      setTemplates(t.templates ?? []);
      if (s.me) setMe(s.me);
      if (t.templates?.[0]) setCurrent(t.templates[0]);
    });
  }, []);

  function blank(): Template {
    return { id: "", name: "", channel: "WHATSAPP", subject: "", body: "" };
  }

  function insertVar(key: string) {
    if (!current) return;
    const el = bodyRef.current;
    const token = `{{${key}}}`;
    if (!el) return setCurrent({ ...current, body: current.body + token });
    const start = el.selectionStart ?? current.body.length;
    const end = el.selectionEnd ?? start;
    const body = current.body.slice(0, start) + token + current.body.slice(end);
    setCurrent({ ...current, body });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function save() {
    if (!current) return;
    setSaving(true);
    const isNew = !current.id;
    const res = await fetch(isNew ? "/api/templates" : `/api/templates/${current.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(current),
    });
    const b = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't save the template.");
    if (isNew) {
      setTemplates((ts) => [...(ts ?? []), b.template]);
      setCurrent(b.template);
    } else {
      setTemplates((ts) => ts?.map((t) => (t.id === current.id ? current : t)) ?? null);
    }
    toast.success("Template saved.");
  }

  async function remove(t: Template) {
    if (!confirm(`Delete “${t.name}”?`)) return;
    const res = await fetch(`/api/templates/${t.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Couldn't delete the template.");
    const rest = (templates ?? []).filter((x) => x.id !== t.id);
    setTemplates(rest);
    setCurrent(rest[0] ?? null);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
      <Panel>
        <PanelHeader
          title="Templates"
          action={
            <Button size="sm" variant="secondary" onClick={() => setCurrent(blank())}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New
            </Button>
          }
        />
        <ul className="p-2">
          {templates?.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setCurrent(t)}
                className={cn(
                  "w-full rounded-control px-3 py-2 text-left text-sm",
                  current?.id === t.id ? "bg-raised text-ink" : "text-muted hover:bg-raised/50 hover:text-ink",
                )}
              >
                <span className="block truncate">{t.name}</span>
                <span className="text-[12px] text-muted">{t.channel === "EMAIL" ? "Email" : "WhatsApp"}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      {current ? (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <Panel className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div>
                <Label htmlFor="tname">Name</Label>
                <Input id="tname" value={current.name} onChange={(e) => setCurrent({ ...current, name: e.target.value })} placeholder="Website pitch" />
              </div>
              <div>
                <Label htmlFor="tchannel">For</Label>
                <select
                  id="tchannel"
                  value={current.channel}
                  onChange={(e) => setCurrent({ ...current, channel: e.target.value })}
                  className="h-10 rounded-control border border-line bg-raised px-3 text-sm focus:border-pin focus:outline-none"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>
            </div>
            {current.channel === "EMAIL" && (
              <div>
                <Label htmlFor="tsubject">Subject</Label>
                <Input id="tsubject" value={current.subject ?? ""} onChange={(e) => setCurrent({ ...current, subject: e.target.value })} />
              </div>
            )}
            <div>
              <Label htmlFor="tbody">Message</Label>
              <Textarea
                id="tbody"
                ref={bodyRef}
                rows={10}
                value={current.body}
                onChange={(e) => setCurrent({ ...current, body: e.target.value })}
                dir="auto"
              />
              <Hint>Click a detail below to insert it where your cursor is. It fills in for each lead.</Hint>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVar(v.key)}
                    className="rounded-full border border-line px-2.5 py-1 text-[12px] text-muted hover:border-pin/50 hover:text-pin"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} loading={saving}>
                Save template
              </Button>
              {current.id && (
                <>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const category = prompt("Category for the marketplace (e.g. Web design, SEO, General)?", "General");
                      if (category === null) return;
                      const res = await fetch("/api/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: current.id, category }) });
                      if (res.ok) toast.success("Submitted. We'll review it for the marketplace.");
                      else toast.error("Couldn't submit.");
                    }}
                  >
                    Submit to marketplace
                  </Button>
                  <Button variant="ghost" onClick={() => remove(current)}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-[13px] font-medium text-muted">Preview with a sample lead</h2>
            <div className="mt-3 rounded-panel bg-[#0B2A24] p-4 text-[14px] leading-6 text-[#E6F4EF]">
              {current.channel === "EMAIL" && current.subject && (
                <p className="mb-2 font-semibold">{renderTemplate(current.subject, SAMPLE, me)}</p>
              )}
              <p className="whitespace-pre-line" dir="auto">
                {renderTemplate(current.body, SAMPLE, me) || "Your message preview appears here."}
              </p>
            </div>
            <p className="mt-3 text-[12px] text-muted">
              Your name and business come from Settings. Add what you sell there too, so the AI writer can use it.
            </p>
          </Panel>
        </div>
      ) : (
        <Panel className="p-10 text-center text-sm text-muted">Pick a template, or create a new one.</Panel>
      )}
    </div>
  );
}
