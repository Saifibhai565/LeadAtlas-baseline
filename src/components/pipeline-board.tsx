"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, Search } from "lucide-react";
import { toast } from "sonner";
import { useT } from "./i18n-provider";
import { Input } from "@/components/ui/field";
import { LeadDrawer } from "./lead-drawer";
import { cn, formatNumber } from "@/lib/utils";

type Card = {
  id: string;
  title: string;
  category: string | null;
  phone: string | null;
  score: number | null;
  followUpAt: string | null;
  dealValue: number | null;
  website: string | null;
  rating: number | null;
};
type Column = { stage: string; items: Card[]; count: number; value: number };

const STAGE_INFO: Record<string, { key: string; en: string; accent: string }> = {
  NEW: { key: "pipe.NEW", en: "New", accent: "bg-muted" },
  CONTACTED: { key: "pipe.CONTACTED", en: "Contacted", accent: "bg-info" },
  INTERESTED: { key: "pipe.INTERESTED", en: "Interested", accent: "bg-pin" },
  WON: { key: "pipe.WON", en: "Won", accent: "bg-ok" },
  LOST: { key: "pipe.LOST", en: "Lost", accent: "bg-danger" },
};

function followUpState(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { text: `Overdue ${-diff} d`, tone: "text-danger" };
  if (diff === 0) return { text: "Follow up today", tone: "text-pin" };
  if (diff === 1) return { text: "Tomorrow", tone: "text-muted" };
  return { text: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), tone: "text-muted" };
}

export function PipelineBoard() {
  const { t } = useT();
  const [columns, setColumns] = useState<Column[] | null>(null);
  const [due, setDue] = useState(0);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [dragging, setDragging] = useState<{ id: string; from: string } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/pipeline?q=${encodeURIComponent(debounced)}`, { cache: "no-store" });
    if (!res.ok) return;
    const b = await res.json();
    setColumns(b.columns);
    setDue(b.due);
  }, [debounced]);

  useEffect(() => {
    load();
  }, [load]);

  async function move(id: string, from: string, to: string) {
    if (from === to || !columns) return;
    // Optimistic move
    const card = columns.find((c) => c.stage === from)?.items.find((i) => i.id === id);
    if (!card) return;
    setColumns(
      columns.map((c) =>
        c.stage === from
          ? { ...c, items: c.items.filter((i) => i.id !== id), count: c.count - 1, value: c.value - (card.dealValue ?? 0) }
          : c.stage === to
            ? { ...c, items: [card, ...c.items], count: c.count + 1, value: c.value + (card.dealValue ?? 0) }
            : c,
      ),
    );
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: to }),
    });
    if (!res.ok) {
      toast.error("Couldn't move this lead.");
      load();
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a lead" className="pl-9" aria-label="Find a lead" />
        </div>
        {due > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-pin/40 bg-pin/10 px-3 py-1 text-[13px] text-pin">
            <BellRing className="h-3.5 w-3.5" aria-hidden />
            {due} follow-up{due > 1 ? "s" : ""} due
          </span>
        )}
        <button
          onClick={async () => {
            const res = await fetch("/api/leads/lookalike", { method: "POST" });
            const b = await res.json().catch(() => ({}));
            if (!res.ok) return toast.error(b.error ?? "Couldn't start the search.");
            toast.success(`Searching for more like your best clients: ${(b.keywords ?? []).slice(0, 3).join(", ")}${(b.keywords ?? []).length > 3 ? "…" : ""}`);
          }}
          className="text-[13px] text-pin hover:underline"
          title="Runs searches for the kinds of business and cities you win most"
        >
          {t("pipe.findMore","Find more like my wins")}
        </button>
        <button
          onClick={async () => {
            const res = await fetch("/api/leads/learn", { method: "POST" });
            const b = await res.json().catch(() => ({}));
            if (!res.ok) return toast.error("Couldn't learn from your deals.");
            const cats = Object.entries((b.boosts ?? {}) as Record<string, number>).filter(([, v]) => v !== 0);
            toast.success(
              b.decided < 3
                ? "Mark a few more leads as Won or Lost first. Scores learn from at least 3 per category."
                : `Learned from ${b.decided} deals (${b.won} won). ${cats.length ? `Adjusted ${cats.length} categories, re-scored ${b.changed} leads.` : "No category stands out yet."}`,
            );
            load();
          }}
          className="text-[13px] text-pin hover:underline"
          title="Scores give a small boost to the kinds of business you win most"
        >
          {t("pipe.learnWins","Learn from my wins")}
        </button>
        <p className="ml-auto text-[13px] text-muted">Drag a card to move it. New shows your highest-scored leads first.</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {(columns ?? Object.keys(STAGE_INFO).map((stage) => ({ stage, items: [], count: 0, value: 0 }))).map((col) => {
          const info = STAGE_INFO[col.stage];
          return (
            <section
              key={col.stage}
              aria-label={t(info.key, info.en)}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.stage);
              }}
              onDragLeave={() => setOver((o) => (o === col.stage ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                if (dragging) move(dragging.id, dragging.from, col.stage);
                setDragging(null);
              }}
              className={cn(
                "flex w-[272px] shrink-0 flex-col rounded-panel border bg-surface transition-colors",
                over === col.stage && dragging?.from !== col.stage ? "border-pin/60" : "border-line",
              )}
            >
              <header className="border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", info.accent)} aria-hidden />
                  <h2 className="text-sm font-semibold">{t(info.key, info.en)}</h2>
                  <span className="tabular ml-auto text-[13px] text-muted">{formatNumber(col.count)}</span>
                </div>
                {col.value > 0 && <p className="tabular mt-1 text-[12px] text-muted">{formatNumber(col.value)} in deals</p>}
              </header>
              <ul className="flex max-h-[calc(100vh-280px)] min-h-[160px] flex-col gap-2 overflow-y-auto p-2">
                {columns == null &&
                  [0, 1, 2].map((i) => <li key={i} className="h-20 animate-pulse rounded-control bg-raised/50" />)}
                {col.items.map((card) => {
                  const fu = followUpState(card.followUpAt);
                  return (
                    <li
                      key={card.id}
                      draggable
                      onDragStart={() => setDragging({ id: card.id, from: col.stage })}
                      onDragEnd={() => setDragging(null)}
                      className={cn(
                        "cursor-grab rounded-control border border-line bg-raised/60 p-3 active:cursor-grabbing",
                        dragging?.id === card.id && "opacity-40",
                      )}
                    >
                      <button onClick={() => setOpenId(card.id)} className="block w-full text-left">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-medium leading-snug hover:text-pin">{card.title}</p>
                          {card.score != null && (
                            <span
                              className={cn(
                                "tabular shrink-0 rounded px-1.5 text-[11px] font-semibold",
                                card.score >= 70 ? "bg-pin/15 text-pin" : card.score >= 45 ? "bg-info/15 text-info" : "bg-line text-muted",
                              )}
                              title="Lead score"
                            >
                              {card.score}
                            </span>
                          )}
                        </div>
                        {card.category && <p className="mt-0.5 text-[12px] text-muted">{card.category}</p>}
                        <div className="mt-2 flex items-center justify-between text-[12px]">
                          {fu ? <span className={fu.tone}>{fu.text}</span> : <span className="text-muted">{card.website ? "" : "No website"}</span>}
                          {card.dealValue ? <span className="tabular text-ok">{formatNumber(card.dealValue)}</span> : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
                {columns != null && col.count > col.items.length && (
                  <li className="px-2 py-1 text-center text-[12px] text-muted">
                    +{formatNumber(col.count - col.items.length)} more in Leads
                  </li>
                )}
                {columns != null && col.count === 0 && (
                  <li className="px-2 py-6 text-center text-[12px] text-muted">Drop leads here</li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      {openId && <LeadDrawer id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </>
  );
}
