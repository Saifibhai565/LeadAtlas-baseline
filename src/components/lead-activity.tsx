"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { timeAgo } from "@/lib/utils";

export type ActivityItem = { id: string; type: string; body: string; createdAt: string; user?: { name: string } | null };

const DOT: Record<string, string> = {
  NOTE: "bg-pin",
  STATUS: "bg-info",
  MESSAGE: "bg-ok",
  FOLLOW_UP: "bg-muted",
};

export function LeadActivity({ leadId, items, onChange }: { leadId: string; items: ActivityItem[]; onChange: () => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function addNote() {
    if (!note.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/leads/${leadId}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "NOTE", body: note }),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Couldn't save the note.");
    setNote("");
    onChange();
  }

  return (
    <div>
      <Textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note, like “Owner is Ali, call after 5pm”"
        className="text-[13px]"
        dir="auto"
        aria-label="New note"
      />
      <Button size="sm" variant="secondary" className="mt-2" onClick={addNote} loading={saving} disabled={!note.trim()}>
        Save note
      </Button>

      {items.length > 0 && (
        <ol className="mt-5 space-y-4 border-l border-line pl-4">
          {items.map((a) => (
            <li key={a.id} className="relative">
              <span className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${DOT[a.type] ?? "bg-muted"}`} aria-hidden />
              <p className="whitespace-pre-line text-[13px] leading-5" dir="auto">
                {a.body}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                {a.user?.name ? `${a.user.name}, ` : ""}
                {timeAgo(a.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
