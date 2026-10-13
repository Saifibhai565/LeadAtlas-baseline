"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { renderTemplate, type Me, type TemplateLead } from "@/lib/template";
import { cn, whatsappNumber } from "@/lib/utils";

type Template = { id: string; name: string; channel: string; subject: string | null; body: string };

// Shared across drawers in one page view so we don't refetch every time
let cache: {
  templates: Template[];
  me: Me;
  ai: boolean;
  aiLocked: boolean;
  mailboxes: { id: string; label: string; active: boolean }[];
  waConnected: boolean;
} | null = null;

async function loadContext() {
  if (cache) return cache;
  const [t, s, a, m] = await Promise.all([
    fetch("/api/templates").then((r) => r.json()),
    fetch("/api/settings").then((r) => r.json()),
    fetch("/api/ai/message").then((r) => r.json()),
    fetch("/api/outreach/mailboxes")
      .then((r) => r.json())
      .catch(() => ({})),
  ]);
  const wa = await fetch("/api/whatsapp")
    .then((r) => r.json())
    .catch(() => ({}));
  cache = { templates: t.templates ?? [], me: s.me ?? { name: "" }, ai: Boolean(a.enabled), aiLocked: Boolean(a.configured) && a.allowed === false,
    mailboxes: m.allowed === false ? [] : (m.mailboxes ?? []).filter((x: { active: boolean }) => x.active),
    waConnected: Boolean(wa.connected),
  };
  return cache;
}

export function MessageComposer({
  leadId,
  lead,
  phones,
  email,
  onSent,
  initialBody,
  optIn = false,
}: {
  initialBody?: string | null;
  optIn?: boolean;
  leadId: string;
  lead: TemplateLead;
  phones: string[];
  email: string | null;
  onSent: () => void;
}) {
  const [ctx, setCtx] = useState<typeof cache>(cache);
  const [channel, setChannel] = useState<"WHATSAPP" | "SMS" | "EMAIL">(phones.length ? "WHATSAPP" : "EMAIL");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(() => {
    if (!initialBody) return "";
    // Bulk-written emails are stored as "subject\n\nbody"; WhatsApp ones as plain text
    return initialBody;
  });
  const [language, setLanguage] = useState("roman_urdu");
  const [tone, setTone] = useState("friendly");
  const [writing, setWriting] = useState(false);
  const [phone, setPhone] = useState(phones[0] ?? "");
  const [mailboxId, setMailboxId] = useState("");
  const [queueing, setQueueing] = useState(false);
  const mailboxes = ctx?.mailboxes ?? [];

  async function sendOfficial(kind: "wa" | "sms") {
    if (!body.trim()) return toast.error("Write or pick a message first.");
    setQueueing(true);
    const res =
      kind === "wa"
        ? await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadId, text: body }),
          })
        : await fetch(`/api/leads/${leadId}/sms`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          });
    const b = await res.json().catch(() => ({}));
    setQueueing(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't send.");
    toast.success(kind === "wa" ? "Sent from your WhatsApp Business number." : "SMS queued with your provider.");
    onSent();
  }

  async function sendFromMailbox() {
    if (!body.trim() || !subject.trim()) return toast.error("Add a subject and a message.");
    if (!email) return toast.error("This lead has no email address.");
    setQueueing(true);
    const res = await fetch("/api/outreach/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, mailboxId: mailboxId || mailboxes[0]?.id, subject, body }),
    });
    const b = await res.json().catch(() => ({}));
    setQueueing(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't queue the email.");
    toast.success("Email queued. It goes out within a few minutes from your mailbox.");
    onSent();
  }

  useEffect(() => {
    loadContext().then(setCtx).catch(() => undefined);
  }, []);

  const templates = (ctx?.templates ?? []).filter((t) => t.channel === (channel === "SMS" ? "WHATSAPP" : channel));

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = ctx?.templates.find((x) => x.id === id);
    if (!t || !ctx) return;
    setBody(renderTemplate(t.body, lead, ctx.me));
    setSubject(t.subject ? renderTemplate(t.subject, lead, ctx.me) : "");
  }

  async function aiWrite() {
    setWriting(true);
    try {
      const res = await fetch("/api/ai/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, channel, language, tone }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) return void toast.error(b.error ?? "The AI writer failed.");
      setBody(b.body ?? "");
      if (b.subject) setSubject(b.subject);
      setTemplateId("");
    } finally {
      setWriting(false);
    }
  }

  async function record() {
    await fetch(`/api/leads/${leadId}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "MESSAGE",
        channel: channel === "SMS" ? "SMS" : channel,
        body: channel === "EMAIL" && subject ? `${subject}\n\n${body}` : body,
      }),
    });
    onSent();
  }

  async function send() {
    if (!body.trim()) return toast.error("Write or pick a message first.");
    if (channel === "SMS") {
      if (!phone) return toast.error("This lead has no phone number.");
      window.location.href = `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(body)}`;
    } else if (channel === "WHATSAPP") {
      const wa = whatsappNumber(phone);
      if (!wa) return toast.error("This lead has no phone number for WhatsApp.");
      window.open(`https://wa.me/${wa}?text=${encodeURIComponent(body)}`, "_blank", "noopener");
    } else {
      if (!email) return toast.error("This lead has no email address.");
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    await record();
    toast.success("Opened. The message is saved in this lead's history.");
  }

  return (
    <div className="space-y-3">
      <div className="flex rounded-control border border-line p-0.5 text-[13px]" role="tablist" aria-label="Channel">
        {(["WHATSAPP", "SMS", "EMAIL"] as const).map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={channel === c}
            onClick={() => {
              setChannel(c);
              setTemplateId("");
            }}
            className={cn("h-7 flex-1 rounded-[7px]", channel === c ? "bg-raised text-ink" : "text-muted hover:text-ink")}
          >
            {c === "WHATSAPP" ? "WhatsApp" : c === "SMS" ? "SMS" : "Email"}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Select value={templateId} onChange={(e) => applyTemplate(e.target.value)} className="h-9 flex-1 text-[13px]" aria-label="Template">
          <option value="">Start from a template…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Link href="/templates" className="inline-flex h-9 items-center px-2 text-[13px] text-muted hover:text-ink">
          Edit
        </Link>
      </div>

      {ctx?.ai && (
        <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-night/40 p-2">
          <Select value={language} onChange={(e) => setLanguage(e.target.value)} className="h-8 w-auto text-[13px]" aria-label="Language">
            <option value="roman_urdu">Roman Urdu</option>
            <option value="urdu">Urdu</option>
            <option value="english">English</option>
          </Select>
          <Select value={tone} onChange={(e) => setTone(e.target.value)} className="h-8 w-auto text-[13px]" aria-label="Tone">
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
            <option value="short">Very short</option>
          </Select>
          <Button size="sm" variant="secondary" onClick={aiWrite} loading={writing} className="ml-auto">
            <Sparkles className="h-3.5 w-3.5 text-pin" aria-hidden />
            Write with AI
          </Button>
        </div>
      )}

      {ctx?.aiLocked && (
        <p className="text-[12px] text-muted">
          <Link href="/billing" className="text-pin hover:underline">
            Upgrade to Pro
          </Link>{" "}
          to write each message with AI.
        </p>
      )}

      {channel === "EMAIL" && (
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="h-9 text-[13px]" aria-label="Subject" />
      )}
      <Textarea
        rows={7}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Pick a template, write with AI, or type your own message."
        className="text-[13px]"
        dir="auto"
        aria-label="Message"
      />

      {channel !== "EMAIL" && phones.length > 1 && (
        <Select value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 text-[13px]" aria-label="Send to">
          {phones.map((p) => (
            <option key={p} value={p}>
              Send to {p}
            </option>
          ))}
        </Select>
      )}

      {channel === "WHATSAPP" && ctx?.waConnected && (
        <Button size="sm" variant="secondary" className="w-full" onClick={() => sendOfficial("wa")} loading={queueing}>
          Send from WhatsApp Business (only within 24 h of their last message)
        </Button>
      )}
      {channel === "SMS" && optIn && (
        <Button size="sm" variant="secondary" className="w-full" onClick={() => sendOfficial("sms")} loading={queueing}>
          Send through SMS provider
        </Button>
      )}

      {channel === "EMAIL" && mailboxes.length > 0 && (
        <div className="flex gap-2">
          {mailboxes.length > 1 && (
            <Select value={mailboxId || mailboxes[0].id} onChange={(e) => setMailboxId(e.target.value)} className="h-9 text-[13px]" aria-label="Send from">
              {mailboxes.map((m) => (
                <option key={m.id} value={m.id}>
                  From {m.label}
                </option>
              ))}
            </Select>
          )}
          <Button size="sm" className="flex-1" onClick={sendFromMailbox} loading={queueing}>
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Send from {mailboxes.length === 1 ? mailboxes[0].label : "mailbox"}
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" className="flex-1" variant={channel === "EMAIL" && mailboxes.length > 0 ? "secondary" : "primary"} onClick={send}>
          {channel === "WHATSAPP" ? "Open in WhatsApp" : channel === "SMS" ? "Open SMS" : (
            <>
              <Mail className="h-3.5 w-3.5" aria-hidden />
              Open in email app
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigator.clipboard.writeText(body).then(() => toast.success("Copied."))}
          aria-label="Copy message"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-[12px] text-muted">
        You send each message yourself. That keeps your WhatsApp number safe and replies personal.
      </p>
    </div>
  );
}
