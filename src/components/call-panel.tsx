"use client";

import { useState } from "react";
import { Phone, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";

type Script = {
  opening?: string;
  questions?: string[];
  pitch?: string;
  objections?: { they: string; you: string }[];
  close?: string;
  voicemail?: string;
};

export function CallPanel({ leadId, phone, ai, onLogged }: { leadId: string; phone: string; ai: boolean; onLogged: () => void }) {
  const [lang, setLang] = useState("roman_urdu");
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState("TALKED");
  const [note, setNote] = useState("");
  const [days, setDays] = useState("");
  const [saving, setSaving] = useState(false);

  async function write() {
    setLoading(true);
    const res = await fetch("/api/ai/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, language: lang }),
    });
    const b = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't write the script.");
    setScript(b.script);
  }

  async function log(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/leads/${leadId}/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, note, followUpDays: days }),
    });
    const b = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't save the call.");
    toast.success("Call saved.");
    setNote("");
    setDays("");
    onLogged();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-raised px-3 text-[13px] hover:border-muted/50">
          <Phone className="h-3.5 w-3.5" aria-hidden />
          Call {phone}
        </a>
        {ai && (
          <>
            <Select value={lang} onChange={(e) => setLang(e.target.value)} className="h-8 w-auto text-[13px]" aria-label="Script language">
              <option value="roman_urdu">Roman Urdu</option>
              <option value="urdu">Urdu</option>
              <option value="english">English</option>
            </Select>
            <Button size="sm" variant="secondary" onClick={write} loading={loading}>
              <Sparkles className="h-3.5 w-3.5 text-pin" aria-hidden />
              {script ? "Rewrite script" : "Call script"}
            </Button>
          </>
        )}
      </div>

      {script && (
        <div className="space-y-2 rounded-control border border-line bg-night/40 p-3 text-[13px] leading-5" dir="auto">
          {script.opening && (
            <p>
              <span className="font-medium text-muted">Start: </span>
              {script.opening}
            </p>
          )}
          {!!script.questions?.length && (
            <div>
              <p className="font-medium text-muted">Ask</p>
              <ul className="list-disc pl-4">
                {script.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {script.pitch && (
            <p>
              <span className="font-medium text-muted">Then: </span>
              {script.pitch}
            </p>
          )}
          {script.objections?.map((o) => (
            <p key={o.they}>
              <span className="font-medium text-muted">If they say </span>“{o.they}”: {o.you}
            </p>
          ))}
          {script.close && (
            <p>
              <span className="font-medium text-muted">End: </span>
              {script.close}
            </p>
          )}
          {script.voicemail && (
            <p className="text-muted">
              <span className="font-medium">Voicemail: </span>
              {script.voicemail}
            </p>
          )}
        </div>
      )}

      <form onSubmit={log} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="h-9 text-[13px]" aria-label="How did the call go">
            <option value="TALKED">Talked</option>
            <option value="INTERESTED">Interested</option>
            <option value="CALL_BACK">Call back later</option>
            <option value="NO_ANSWER">No answer</option>
            <option value="NOT_INTERESTED">Not interested</option>
            <option value="WRONG_NUMBER">Wrong number</option>
          </Select>
          <Select value={days} onChange={(e) => setDays(e.target.value)} className="h-9 text-[13px]" aria-label="Follow up">
            <option value="">No follow-up</option>
            <option value="1">Follow up tomorrow</option>
            <option value="3">In 3 days</option>
            <option value="7">In a week</option>
            <option value="30">In a month</option>
          </Select>
        </div>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did they say?" className="text-[13px]" dir="auto" aria-label="Call notes" />
        <Button type="submit" size="sm" variant="secondary" loading={saving}>
          Save call
        </Button>
      </form>
    </div>
  );
}
