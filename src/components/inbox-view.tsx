"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { cn, timeAgo } from "@/lib/utils";

type Status = {
  connected: boolean;
  allowed: boolean;
  isOwner: boolean;
  account: { displayNumber: string | null; verifiedName: string | null } | null;
  webhook: { url: string; verifyToken: string } | null;
};
type Conv = { contact: string; lead: { id: string; title: string } | null; last: string; lastAt: string; lastDirection: string; unread: number };
type Msg = { id: string; direction: string; kind: string; body: string; status: string; error: string | null; createdAt: string };
type Tpl = { name: string; language: string; category: string; body: string; params: number };

function Connect({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ phoneNumberId: "", wabaId: "", accessToken: "", appSecret: "" });
  const [busy, setBusy] = useState(false);
  return (
    <Panel className="max-w-2xl">
      <PanelHeader title="Connect WhatsApp Business" description="Uses Meta's official WhatsApp Cloud API, so your number stays safe." />
      <div className="space-y-4 p-5 text-sm">
        <ol className="list-decimal space-y-1.5 pl-5 text-muted">
          <li>Go to developers.facebook.com, create an app of type Business, and add the WhatsApp product.</li>
          <li>Add and verify your business phone number. Copy the Phone number ID and the WhatsApp Business Account ID.</li>
          <li>In Business Settings, create a System User, give it the WhatsApp permissions, and generate a permanent access token.</li>
          <li>Paste them below. After connecting, copy the webhook address shown here into your Meta app (WhatsApp, Configuration) and subscribe to “messages”.</li>
        </ol>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const res = await fetch("/api/whatsapp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
            const b = await res.json().catch(() => ({}));
            setBusy(false);
            if (!res.ok) return toast.error(b.error ?? "Couldn't connect.");
            toast.success("Connected. Now add the webhook in your Meta app.");
            onDone();
          }}
          className="space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="pn">Phone number ID</Label>
              <Input id="pn" value={f.phoneNumberId} onChange={(e) => setF({ ...f, phoneNumberId: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="wa">WhatsApp Business Account ID</Label>
              <Input id="wa" value={f.wabaId} onChange={(e) => setF({ ...f, wabaId: e.target.value })} required />
            </div>
          </div>
          <div>
            <Label htmlFor="tk">Permanent access token</Label>
            <Input id="tk" type="password" value={f.accessToken} onChange={(e) => setF({ ...f, accessToken: e.target.value })} required autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="as">App secret (recommended)</Label>
            <Input id="as" type="password" value={f.appSecret} onChange={(e) => setF({ ...f, appSecret: e.target.value })} autoComplete="off" />
            <Hint>Lets us check that incoming messages really come from Meta.</Hint>
          </div>
          <Button type="submit" loading={busy}>
            Check and connect
          </Button>
        </form>
        <p className="text-[12px] text-muted">
          WhatsApp's rules: you can reply freely within 24 hours of someone's message. Starting a conversation needs an approved template and the person's
          permission. Meta charges a small fee per conversation.
        </p>
      </div>
    </Panel>
  );
}

export function InboxView() {
  const [st, setSt] = useState<Status | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [thread, setThread] = useState<{ messages: Msg[]; lead: { id: string; title: string; optIn: boolean } | null; windowOpen: boolean } | null>(null);
  const [text, setText] = useState("");
  const [tpls, setTpls] = useState<Tpl[] | null>(null);
  const [tpl, setTpl] = useState("");
  const [params, setParams] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [showConn, setShowConn] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const loadStatus = useCallback(() => {
    fetch("/api/whatsapp")
      .then((r) => r.json())
      .then(setSt);
  }, []);
  useEffect(loadStatus, [loadStatus]);

  const loadConvs = useCallback(() => {
    fetch("/api/whatsapp/conversations")
      .then((r) => r.json())
      .then((b) => setConvs(b.conversations ?? []));
  }, []);
  const loadThread = useCallback(() => {
    if (!active) return;
    fetch(`/api/whatsapp/conversations/${active}`)
      .then((r) => r.json())
      .then(setThread);
  }, [active]);

  useEffect(() => {
    if (!st?.connected) return;
    loadConvs();
    const t = setInterval(() => {
      loadConvs();
      loadThread();
    }, 10000);
    return () => clearInterval(t);
  }, [st?.connected, loadConvs, loadThread]);
  useEffect(loadThread, [loadThread]);
  useEffect(() => bottom.current?.scrollIntoView({ block: "end" }), [thread?.messages.length]);

  useEffect(() => {
    if (thread && !thread.windowOpen && tpls === null) {
      fetch("/api/whatsapp/templates")
        .then((r) => r.json())
        .then((b) => setTpls(b.templates ?? []))
        .catch(() => setTpls([]));
    }
  }, [thread, tpls]);

  async function send() {
    if (!active) return;
    setSending(true);
    const chosen = tpls?.find((t) => `${t.name}|${t.language}` === tpl);
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(thread?.windowOpen ? { contact: active, text } : { contact: active, template: { name: chosen?.name, language: chosen?.language, params } }),
    });
    const b = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't send.");
    setText("");
    loadThread();
    loadConvs();
  }

  if (!st) return <div className="h-64 animate-pulse rounded-panel bg-surface" />;
  if (!st.allowed) {
    return (
      <Panel className="max-w-2xl p-6">
        <h2 className="text-[15px] font-semibold">The WhatsApp inbox is part of Pro and Agency</h2>
        <Link href="/billing" className="mt-4 inline-flex h-10 items-center rounded-control bg-pin px-4 text-sm font-semibold text-pin-ink">
          See plans
        </Link>
      </Panel>
    );
  }
  if (!st.connected) return st.isOwner ? <Connect onDone={loadStatus} /> : <Panel className="p-6 text-sm text-muted">Ask the account owner to connect WhatsApp Business.</Panel>;

  const chosen = tpls?.find((t) => `${t.name}|${t.language}` === tpl);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge tone="ok">Connected</Badge>
        <span>
          {st.account?.verifiedName} {st.account?.displayNumber}
        </span>
        {st.isOwner && (
          <button onClick={() => setShowConn((v) => !v)} className="text-[13px] text-muted hover:text-ink">
            {showConn ? "Hide connection details" : "Connection details"}
          </button>
        )}
      </div>
      {showConn && st.webhook && (
        <Panel className="space-y-2 p-4 text-[13px]">
          <p className="text-muted">In your Meta app, WhatsApp, Configuration: set the callback URL and verify token below, and subscribe to “messages”.</p>
          {[
            ["Callback URL", st.webhook.url],
            ["Verify token", st.webhook.verifyToken],
          ].map(([l, v]) => (
            <div key={l} className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-muted">{l}</span>
              <code className="min-w-0 flex-1 truncate rounded bg-night/60 px-2 py-1">{v}</code>
              <button onClick={() => navigator.clipboard.writeText(v).then(() => toast.success("Copied."))} aria-label={`Copy ${l}`} className="text-muted hover:text-ink">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={async () => {
              if (!confirm("Disconnect WhatsApp? Conversations stay saved.")) return;
              await fetch("/api/whatsapp", { method: "DELETE" });
              loadStatus();
            }}
            className="text-danger hover:underline"
          >
            Disconnect
          </button>
        </Panel>
      )}

      <div className="grid h-[calc(100vh-260px)] min-h-[480px] overflow-hidden rounded-panel border border-line bg-surface md:grid-cols-[300px_1fr]">
        <ul className="overflow-y-auto border-r border-line">
          {convs.length === 0 && <li className="p-5 text-sm text-muted">No conversations yet. When a lead messages your WhatsApp Business number, it shows up here.</li>}
          {convs.map((c) => (
            <li key={c.contact}>
              <button
                onClick={() => {
                  setActive(c.contact);
                  setTpls(null);
                }}
                className={cn("block w-full border-b border-line px-4 py-3 text-left hover:bg-raised/40", active === c.contact && "bg-raised")}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{c.lead?.title ?? `+${c.contact}`}</span>
                  {c.unread > 0 && <span className="rounded-full bg-ok px-1.5 text-[11px] font-bold text-night">{c.unread}</span>}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-muted">
                  {c.lastDirection === "OUT" ? "You: " : ""}
                  {c.last}
                </span>
                <span className="text-[11px] text-muted">{timeAgo(c.lastAt)}</span>
              </button>
            </li>
          ))}
        </ul>

        {!active || !thread ? (
          <div className="hidden place-items-center text-sm text-muted md:grid">Choose a conversation</div>
        ) : (
          <div className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <p className="font-medium">{thread.lead?.title ?? `+${active}`}</p>
                <p className="text-[12px] text-muted">
                  +{active} · {thread.windowOpen ? <span className="text-ok">reply window open</span> : "reply window closed, templates only"}
                </p>
              </div>
              {thread.lead && (
                <Link href={`/leads?q=${encodeURIComponent(thread.lead.title)}`} className="text-[13px] text-pin hover:underline">
                  Open lead
                </Link>
              )}
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {thread.messages.map((m) => (
                <div key={m.id} className={cn("flex", m.direction === "OUT" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] whitespace-pre-line rounded-panel px-3 py-2 text-[14px]",
                      m.direction === "OUT" ? "bg-[#0B2A24] text-[#E6F4EF]" : "bg-raised",
                    )}
                    dir="auto"
                  >
                    {m.body}
                    <span className="mt-1 block text-right text-[10px] opacity-60">
                      {timeAgo(m.createdAt)}
                      {m.direction === "OUT" ? ` · ${m.status}` : ""}
                    </span>
                    {m.error && <span className="block text-[11px] text-danger">{m.error}</span>}
                  </div>
                </div>
              ))}
              <div ref={bottom} />
            </div>
            <div className="border-t border-line p-3">
              {thread.windowOpen ? (
                <div className="flex gap-2">
                  <Textarea
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write a reply"
                    className="text-[14px]"
                    dir="auto"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (text.trim()) send();
                      }
                    }}
                  />
                  <Button onClick={send} loading={sending} disabled={!text.trim()} aria-label="Send">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[12px] text-muted">More than 24 hours since their last message. WhatsApp only allows an approved template now.</p>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={tpl}
                      onChange={(e) => {
                        setTpl(e.target.value);
                        const t = tpls?.find((x) => `${x.name}|${x.language}` === e.target.value);
                        setParams(Array.from({ length: t?.params ?? 0 }, () => ""));
                      }}
                      className="h-9 w-auto text-[13px]"
                      aria-label="Template"
                    >
                      <option value="">{tpls === null ? "Loading templates…" : tpls.length ? "Choose a template" : "No approved templates"}</option>
                      {tpls?.map((t) => (
                        <option key={`${t.name}|${t.language}`} value={`${t.name}|${t.language}`}>
                          {t.name} ({t.language})
                        </option>
                      ))}
                    </Select>
                    {params.map((p, i) => (
                      <Input
                        key={i}
                        value={p}
                        onChange={(e) => setParams((all) => all.map((x, j) => (j === i ? e.target.value : x)))}
                        placeholder={`{{${i + 1}}}`}
                        className="h-9 w-36 text-[13px]"
                      />
                    ))}
                    <Button size="sm" className="h-9" onClick={send} loading={sending} disabled={!chosen}>
                      Send template
                    </Button>
                  </div>
                  {chosen && <p className="text-[12px] text-muted">{chosen.body}</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
