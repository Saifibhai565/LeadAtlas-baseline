"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LifeBuoy, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { id: string; sender: string; body: string; createdAt: string };
type Data = { ticket: { id: string; status: string; messages: Msg[] } | null; bot: { name: string; greeting: string; ai: boolean }; whatsapp: string | null };

/** Floating "Help" button with the AI assistant and the support team. */
export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Data | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetch("/api/support", { cache: "no-store" })
      .then((r) => r.json())
      .then(setD)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("support") === "1") setOpen(true);
  }, []);
  useEffect(() => {
    if (!open) return;
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [open, load]);
  useEffect(() => bottom.current?.scrollIntoView({ block: "end" }), [d?.ticket?.messages.length, sending]);

  async function send(body: Record<string, unknown>) {
    setSending(true);
    await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => undefined);
    setSending(false);
    setText("");
    load();
  }

  const msgs = d?.ticket?.messages ?? [];
  const status = d?.ticket?.status;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="glow-btn fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-pin text-pin-ink shadow-lg"
        aria-label={open ? "Close help" : "Help and support"}
      >
        {open ? <X className="h-5 w-5" /> : <LifeBuoy className="h-5 w-5" />}
      </button>
      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex h-[480px] w-[calc(100vw-40px)] max-w-[360px] flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-2xl" role="dialog" aria-label="Support">
          <div className="border-b border-line px-4 py-3">
            <p className="font-semibold">{d?.bot.name ?? "Support"}</p>
            <p className="text-[12px] text-muted">
              {status === "OPEN" ? "Our team has your message and will reply here." : d?.bot.ai ? "AI assistant, with our team behind it" : "Our team replies here"}
            </p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-[13px]">
            <div className="max-w-[85%] rounded-panel bg-raised px-3 py-2">{d?.bot.greeting ?? "Hi! How can we help?"}</div>
            {msgs.map((m) => (
              <div key={m.id} className={cn("flex", m.sender === "USER" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-line rounded-panel px-3 py-2",
                    m.sender === "USER" ? "bg-pin text-pin-ink" : m.sender === "TEAM" ? "border border-ok/40 bg-ok/10" : "bg-raised",
                  )}
                  dir="auto"
                >
                  {m.sender === "TEAM" && <span className="mb-0.5 block text-[11px] font-semibold text-ok">Support team</span>}
                  {m.body}
                </div>
              </div>
            ))}
            {sending && <div className="w-16 animate-pulse rounded-panel bg-raised px-3 py-2">…</div>}
            <div ref={bottom} />
          </div>
          {d?.ticket && status === "AI" && (
            <button onClick={() => send({ human: true })} className="border-t border-line py-2 text-[12px] text-pin hover:underline">
              Talk to a person instead
            </button>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) send({ message: text });
            }}
            className="flex gap-2 border-t border-line p-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your question"
              className="h-9 flex-1 rounded-control border border-line bg-raised px-3 text-[13px] text-ink outline-none focus:border-pin"
              dir="auto"
              aria-label="Your message"
            />
            <button type="submit" disabled={sending || !text.trim()} className="grid h-9 w-9 place-items-center rounded-control bg-pin text-pin-ink disabled:opacity-50" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </form>
          <a href="/help" className="border-t border-line py-2 text-center text-[12px] text-muted hover:text-ink">
            Browse the help center
          </a>
          {d?.whatsapp && (
            <a href={`https://wa.me/${d.whatsapp}`} target="_blank" rel="noreferrer" className="border-t border-line py-2 text-center text-[12px] text-muted hover:text-ink">
              Or message us on WhatsApp
            </a>
          )}
        </div>
      )}
    </>
  );
}
