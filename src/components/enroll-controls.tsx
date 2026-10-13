"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

type Opt = { id: string; name?: string; label?: string; active?: boolean };

/** Bulk bar control: start a sequence for the selected leads. */
export function EnrollControls({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const [seqs, setSeqs] = useState<Opt[] | null>(null);
  const [boxes, setBoxes] = useState<Opt[]>([]);
  const [seq, setSeq] = useState("");
  const [box, setBox] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/outreach/sequences").then((r) => r.json()), fetch("/api/outreach/mailboxes").then((r) => r.json())])
      .then(([s, m]) => {
        if (m.allowed === false) return setSeqs([]);
        const activeSeqs = (s.sequences ?? []).filter((x: Opt) => x.active);
        const activeBoxes = (m.mailboxes ?? []).filter((x: Opt) => x.active);
        setSeqs(activeSeqs);
        setBoxes(activeBoxes);
        setSeq(activeSeqs[0]?.id ?? "");
        setBox(activeBoxes[0]?.id ?? "");
      })
      .catch(() => setSeqs([]));
  }, []);

  if (!seqs || seqs.length === 0 || boxes.length === 0) return null;

  async function start() {
    setBusy(true);
    const res = await fetch("/api/outreach/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: ids, sequenceId: seq, mailboxId: box }),
    });
    const b = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't start the sequence.");
    const skipped = [b.noEmail && `${b.noEmail} without email`, b.already && `${b.already} already in it`, b.unsubscribed && `${b.unsubscribed} unsubscribed`]
      .filter(Boolean)
      .join(", ");
    toast.success(`Started for ${b.added} lead${b.added === 1 ? "" : "s"}${skipped ? `. Skipped: ${skipped}` : ""}.`);
    onDone();
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Select value={seq} onChange={(e) => setSeq(e.target.value)} className="h-8 w-auto max-w-[180px] text-[13px]" aria-label="Sequence">
        {seqs.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      {boxes.length > 1 && (
        <Select value={box} onChange={(e) => setBox(e.target.value)} className="h-8 w-auto max-w-[160px] text-[13px]" aria-label="Send from">
          {boxes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      )}
      <Button size="sm" variant="secondary" onClick={start} loading={busy}>
        <Mail className="h-3.5 w-3.5 text-pin" aria-hidden />
        Start sequence
      </Button>
    </span>
  );
}
