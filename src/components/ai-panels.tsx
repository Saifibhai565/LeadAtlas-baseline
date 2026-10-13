"use client";

import { useEffect, useState } from "react";
import { MessageSquareReply, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/panel";
import { timeAgo, whatsappNumber } from "@/lib/utils";

let aiState: Promise<boolean> | null = null;
/** Whether AI features are available to this person (cached per page load). */
export function useAiAvailable() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!aiState) {
      aiState = fetch("/api/ai/message")
        .then((r) => r.json())
        .then((b) => Boolean(b.enabled))
        .catch(() => false);
    }
    aiState.then(setOk);
  }, []);
  return ok;
}

type Brief = { summary: string; needs: string[]; pitch: string; objection: string; answer: string; channel: string };

export function AiBrief({ leadId, initial, at }: { leadId: string; initial: string | null; at: string | null }) {
  const [brief, setBrief] = useState<Brief | null>(() => {
    try {
      return initial ? (JSON.parse(initial) as Brief) : null;
    } catch {
      return null;
    }
  });
  const [when, setWhen] = useState(at);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/ai/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
    });
    const b = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't write the brief.");
    setBrief(b.brief);
    setWhen(new Date().toISOString());
  }

  if (!brief) {
    return (
      <div>
        <p className="text-[13px] text-muted">A quick read on this business: what they likely need, how to open, and what they might push back on.</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={generate} loading={loading}>
          <Sparkles className="h-3.5 w-3.5 text-pin" aria-hidden />
          Write a brief
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-[13px] leading-5">
      <p>{brief.summary}</p>
      {brief.needs?.length > 0 && (
        <div>
          <p className="font-medium text-muted">Likely needs</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {brief.needs.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="font-medium text-muted">Open with</p>
        <p className="mt-0.5">{brief.pitch}</p>
      </div>
      <div>
        <p className="font-medium text-muted">If they say</p>
        <p className="mt-0.5 italic">“{brief.objection}”</p>
        <p className="mt-0.5">{brief.answer}</p>
      </div>
      <p className="text-muted">Best way to reach them: {brief.channel}</p>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={generate} loading={loading}>
          Rewrite
        </Button>
        {when && <span className="text-[12px] text-muted">Written {timeAgo(when)}</span>}
      </div>
    </div>
  );
}

const INTENT: Record<string, { label: string; tone: "ok" | "pin" | "info" | "danger" | "neutral" }> = {
  INTERESTED: { label: "Interested", tone: "ok" },
  QUESTION: { label: "Has a question", tone: "info" },
  PRICE: { label: "Asking about price", tone: "pin" },
  LATER: { label: "Not right now", tone: "neutral" },
  NOT_INTERESTED: { label: "Not interested", tone: "danger" },
  WRONG_PERSON: { label: "Wrong person", tone: "neutral" },
  OTHER: { label: "Other", tone: "neutral" },
};

type Suggestion = { intent: string; summary: string; stage: string; followUpDays: number | null; answer: string };

export function ReplyAssistant({ leadId, phone, onChanged }: { leadId: string; phone: string | null; onChanged: () => void }) {
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [s, setS] = useState<Suggestion | null>(null);
  const [answer, setAnswer] = useState("");

  async function analyze() {
    setLoading(true);
    const res = await fetch("/api/ai/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, reply }),
    });
    const b = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't read the reply.");
    setS(b);
    setAnswer(b.answer ?? "");
    onChanged();
  }

  async function apply() {
    if (!s) return;
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, status: s.stage }),
    });
    if (s.followUpDays != null) {
      const d = new Date(Date.now() + s.followUpDays * 86400000);
      d.setHours(9, 0, 0, 0);
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpAt: d.toISOString() }),
      });
    }
    toast.success("Stage and follow-up updated.");
    onChanged();
  }

  async function sendAnswer() {
    const wa = whatsappNumber(phone);
    if (!wa) return toast.error("This lead has no phone number for WhatsApp.");
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(answer)}`, "_blank", "noopener");
    await fetch(`/api/leads/${leadId}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "MESSAGE", channel: "WHATSAPP", body: answer }),
    });
    setS(null);
    setReply("");
    onChanged();
  }

  return (
    <div className="space-y-3">
      <Textarea
        rows={3}
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Paste what they wrote back, in any language"
        className="text-[13px]"
        dir="auto"
        aria-label="Their reply"
      />
      <Button size="sm" variant="secondary" onClick={analyze} loading={loading} disabled={!reply.trim()}>
        <MessageSquareReply className="h-3.5 w-3.5 text-pin" aria-hidden />
        Suggest an answer
      </Button>

      {s && (
        <div className="space-y-3 rounded-control border border-line bg-night/40 p-3">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <Badge tone={INTENT[s.intent]?.tone ?? "neutral"}>{INTENT[s.intent]?.label ?? s.intent}</Badge>
            <span className="text-muted">{s.summary}</span>
          </div>
          <p className="text-[13px] text-muted">
            Suggested: move to <span className="text-ink">{s.stage.toLowerCase()}</span>
            {s.followUpDays != null && <>, follow up in {s.followUpDays} day{s.followUpDays === 1 ? "" : "s"}</>}.{" "}
            <button onClick={apply} className="text-pin hover:underline">
              Apply
            </button>
          </p>
          <Textarea rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} className="text-[13px]" dir="auto" aria-label="Suggested answer" />
          <Button size="sm" onClick={sendAnswer} disabled={!answer.trim()}>
            Send answer on WhatsApp
          </Button>
        </div>
      )}
    </div>
  );
}
