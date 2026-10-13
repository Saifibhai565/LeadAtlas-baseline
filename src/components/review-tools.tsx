"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/field";
import { timeAgo } from "@/lib/utils";

type Data = { reviewPath: string | null; monitoring: boolean; feedback: { id: string; name: string | null; contact: string | null; message: string; createdAt: string }[] };

/** For businesses you work for: review link and QR, weekly review monitoring, private feedback. */
export function ReviewTools({ leadId }: { leadId: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [origin, setOrigin] = useState("");
  const load = useCallback(() => {
    fetch(`/api/leads/${leadId}/review-tools`)
      .then((r) => r.json())
      .then(setD);
  }, [leadId]);
  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, [load]);

  async function act(action: string) {
    const res = await fetch(`/api/leads/${leadId}/review-tools`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(b.error ?? "Couldn't do that.");
    load();
  }

  if (!d) return <p className="text-[13px] text-muted">Loading…</p>;
  const link = d.reviewPath ? `${origin}${d.reviewPath}` : null;

  return (
    <div className="space-y-4 text-[13px]">
      <div>
        <p className="font-medium">Review link and QR code</p>
        <p className="text-muted">Give it to the business. Their customers scan it and land on the Google review box.</p>
        {link ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Link copied."))} className="text-pin hover:underline">
              Copy link
            </button>
            <a href={link} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">
              Open
            </a>
            <a href={`/api/qr?text=${encodeURIComponent(link)}`} download="review-qr.svg" className="text-muted hover:text-ink">
              Download QR
            </a>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qr?text=${encodeURIComponent(link)}`} alt="QR code for the review link" className="h-24 w-24 rounded bg-white p-1" />
          </div>
        ) : (
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => act("link")}>
            Create review link
          </Button>
        )}
      </div>

      <Toggle
        checked={d.monitoring}
        onChange={(v) => act(v ? "monitor-on" : "monitor-off")}
        label="Watch their reviews every week"
        description="You get a notification when new reviews come in, the rating drops or a bad review appears."
      />

      {d.feedback.length > 0 && (
        <div>
          <p className="font-medium">Private feedback from their customers</p>
          <ul className="mt-1 space-y-2">
            {d.feedback.map((f) => (
              <li key={f.id} className="rounded-control border border-line p-2">
                <p dir="auto">{f.message}</p>
                <p className="text-[12px] text-muted">
                  {[f.name, f.contact].filter(Boolean).join(", ") || "Anonymous"}, {timeAgo(f.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
