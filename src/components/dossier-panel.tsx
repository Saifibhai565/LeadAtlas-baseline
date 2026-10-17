"use client";

import { useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Dossier = {
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  openingLine?: string;
  talkingPoints?: string[];
  objections?: { they: string; you: string }[];
  bestChannel?: string;
};

export function DossierPanel({ lead, ai, onChanged }: { lead: { id: string; dossier: string | null; dossierAt: string | null }; ai: boolean; onChanged: () => void }) {
  const [loading, setLoading] = useState(false);
  let d: Dossier | null = null;
  try {
    d = lead.dossier ? JSON.parse(lead.dossier) : null;
  } catch {
    d = null;
  }

  async function run() {
    setLoading(true);
    const res = await fetch(`/api/leads/${lead.id}/dossier`, { method: "POST" });
    const b = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't prepare the briefing.");
    onChanged();
  }

  if (!ai) return <p className="text-[13px] text-muted">The research briefing uses AI, part of the Pro and Agency plans.</p>;

  if (!d) {
    return (
      <div className="text-[13px]">
        <p className="text-muted">A one-page briefing before you call: what they are, their strengths and gaps, an opening line, talking points and likely objections.</p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={run} loading={loading}>
          <Sparkles className="h-3.5 w-3.5 text-pin" aria-hidden />
          Prepare briefing
        </Button>
      </div>
    );
  }

  const copyAll = () => {
    const txt = [
      d!.summary,
      d!.strengths?.length ? `Strengths:\n- ${d!.strengths.join("\n- ")}` : "",
      d!.weaknesses?.length ? `Gaps:\n- ${d!.weaknesses.join("\n- ")}` : "",
      d!.openingLine ? `Opening line: ${d!.openingLine}` : "",
      d!.talkingPoints?.length ? `Talking points:\n- ${d!.talkingPoints.join("\n- ")}` : "",
      d!.objections?.length ? `Objections:\n${d!.objections.map((o) => `- "${o.they}" -> ${o.you}`).join("\n")}` : "",
      d!.bestChannel ? `Best channel: ${d!.bestChannel}` : "",
    ].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(txt).then(() => toast.success("Briefing copied."));
  };

  return (
    <div className="space-y-3 text-[13px]">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={run} loading={loading}>
          Refresh
        </Button>
        <Button size="sm" variant="ghost" onClick={copyAll}>
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy all
        </Button>
      </div>
      {d.summary && <p>{d.summary}</p>}
      {d.openingLine && (
        <p className="rounded-control border border-pin/30 bg-pin/5 p-2">
          <span className="font-medium text-pin">Opening line: </span>
          {d.openingLine}
        </p>
      )}
      {d.strengths?.length ? (
        <div>
          <p className="font-medium text-ok">Strengths</p>
          <ul className="list-disc pl-5 text-muted">
            {d.strengths.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {d.weaknesses?.length ? (
        <div>
          <p className="font-medium text-pin">Gaps you can help with</p>
          <ul className="list-disc pl-5 text-muted">
            {d.weaknesses.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {d.talkingPoints?.length ? (
        <div>
          <p className="font-medium">Talking points</p>
          <ul className="list-disc pl-5 text-muted">
            {d.talkingPoints.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {d.objections?.map((o) => (
        <p key={o.they}>
          <span className="text-muted">If they say </span>“{o.they}”: {o.you}
        </p>
      ))}
      {d.bestChannel && (
        <p>
          <span className="font-medium">Best channel: </span>
          {d.bestChannel}
        </p>
      )}
    </div>
  );
}
