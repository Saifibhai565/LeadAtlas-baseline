"use client";

import { useState } from "react";
import { Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatNumber, timeAgo } from "@/lib/utils";

type Review = { n: string; r: number; t: string; w: string };
type Insights = { summary?: string; praises?: string[]; complaints?: string[]; opportunities?: string[]; pitch?: string };

function parse<T>(v: string | null, fallback: T): T {
  try {
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function ReviewsPanel({
  leadId,
  reviewsJson,
  distJson,
  insightsJson,
  insightsAt,
  ai,
}: {
  leadId: string;
  reviewsJson: string | null;
  distJson: string | null;
  insightsJson: string | null;
  insightsAt: string | null;
  ai: boolean;
}) {
  const reviews = parse<Review[]>(reviewsJson, []);
  const dist = parse<Record<string, number>>(distJson, {});
  const [insights, setInsights] = useState<Insights | null>(parse<Insights | null>(insightsJson, null));
  const [when, setWhen] = useState(insightsAt);
  const [all, setAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [replying, setReplying] = useState<number | null>(null);

  async function replyTo(index: number) {
    setReplying(index);
    const res = await fetch("/api/ai/review-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, index }),
    });
    const b = await res.json().catch(() => ({}));
    setReplying(null);
    if (!res.ok) return toast.error(b.error ?? "Couldn't write a reply.");
    setReplies((r) => ({ ...r, [index]: b.reply }));
  }
  const totalDist = [1, 2, 3, 4, 5].reduce((sum, k) => sum + (Number(dist[k]) || 0), 0);

  async function analyse() {
    setLoading(true);
    const res = await fetch("/api/ai/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
    });
    const b = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't analyse the reviews.");
    setInsights(b.insights);
    setWhen(new Date().toISOString());
  }

  if (reviews.length === 0 && totalDist === 0) {
    return <p className="text-[13px] text-muted">No reviews saved for this lead. New searches save them automatically.</p>;
  }

  const shown = all ? reviews : reviews.slice(0, 3);
  return (
    <div className="space-y-4">
      {totalDist > 0 && (
        <div className="space-y-1">
          {[5, 4, 3, 2, 1].map((k) => {
            const n = Number(dist[k]) || 0;
            const pct = totalDist ? Math.round((n / totalDist) * 100) : 0;
            return (
              <div key={k} className="flex items-center gap-2 text-[12px]">
                <span className="tabular w-6 text-muted">{k}★</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                  <div className={k <= 2 ? "h-full rounded-full bg-danger" : "h-full rounded-full bg-pin"} style={{ width: `${pct}%` }} />
                </div>
                <span className="tabular w-10 text-right text-muted">{formatNumber(n)}</span>
              </div>
            );
          })}
        </div>
      )}

      {ai && (
        <div className="rounded-control border border-line bg-night/40 p-3">
          {insights ? (
            <div className="space-y-2 text-[13px] leading-5">
              {insights.summary && <p>{insights.summary}</p>}
              {!!insights.complaints?.length && (
                <div>
                  <p className="font-medium text-danger">Customers complain about</p>
                  <ul className="mt-0.5 list-disc pl-4">
                    {insights.complaints.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!!insights.praises?.length && (
                <div>
                  <p className="font-medium text-ok">Customers love</p>
                  <ul className="mt-0.5 list-disc pl-4">
                    {insights.praises.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!!insights.opportunities?.length && (
                <div>
                  <p className="font-medium text-pin">How you could help</p>
                  <ul className="mt-0.5 list-disc pl-4">
                    {insights.opportunities.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {insights.pitch && (
                <p className="italic text-muted">
                  Opening line: “{insights.pitch}”
                </p>
              )}
              <div className="flex items-center gap-3">
                <Button size="sm" variant="ghost" onClick={analyse} loading={loading}>
                  Analyse again
                </Button>
                {when && <span className="text-[12px] text-muted">{timeAgo(when)}</span>}
              </div>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={analyse} loading={loading} disabled={reviews.length < 2}>
              <Sparkles className="h-3.5 w-3.5 text-pin" aria-hidden />
              What do customers say? (AI)
            </Button>
          )}
        </div>
      )}

      {shown.length > 0 && (
        <ul className="space-y-3">
          {shown.map((r, i) => (
            <li key={i} className="text-[13px] leading-5">
              <p className="flex items-center gap-1.5">
                <span className="inline-flex">
                  {Array.from({ length: 5 }, (_, s) => (
                    <Star key={s} className={s < r.r ? "h-3 w-3 fill-pin text-pin" : "h-3 w-3 text-line"} aria-hidden />
                  ))}
                </span>
                <span className="sr-only">{r.r} out of 5</span>
                <span className="text-muted">
                  {r.n}
                  {r.w ? `, ${r.w}` : ""}
                </span>
              </p>
              {r.t && (
                <p className="mt-0.5" dir="auto">
                  {r.t}
                </p>
              )}
              {ai && !replies[i] && (
                <button onClick={() => replyTo(i)} disabled={replying === i} className="mt-1 text-[12px] text-pin hover:underline">
                  {replying === i ? "Writing…" : "Write a reply (AI)"}
                </button>
              )}
              {replies[i] && (
                <div className="mt-1 rounded-control border border-line bg-night/40 p-2 text-[12px]" dir="auto">
                  {replies[i]}
                  <button
                    onClick={() => navigator.clipboard.writeText(replies[i]).then(() => toast.success("Reply copied. Paste it under the review on Google."))}
                    className="ml-2 text-pin hover:underline"
                  >
                    Copy
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {reviews.length > 3 && (
        <button onClick={() => setAll((v) => !v)} className="text-[13px] text-pin hover:underline">
          {all ? "Show fewer" : `Show all ${reviews.length} reviews`}
        </button>
      )}
    </div>
  );
}
