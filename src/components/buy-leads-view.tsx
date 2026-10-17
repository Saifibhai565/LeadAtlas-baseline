"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { formatNumber } from "@/lib/utils";

type Result = { q: string; total: number; newCount: number; price: number; currency: string; balance: number; canAfford: number };

export function BuyLeadsView() {
  const [q, setQ] = useState("");
  const [r, setR] = useState<Result | null>(null);
  const [count, setCount] = useState("");
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setLoading(true);
    setR(null);
    const res = await fetch(`/api/data-market?q=${encodeURIComponent(q)}`);
    const b = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't check.");
    setR(b);
    setCount(String(Math.min(b.newCount, b.canAfford || b.newCount)));
  }

  async function buy() {
    if (!r) return;
    const n = Number(count);
    if (!(n > 0)) return toast.error("Choose how many to buy.");
    setBuying(true);
    const res = await fetch("/api/data-market/buy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q, count: n }) });
    const b = await res.json().catch(() => ({}));
    setBuying(false);
    if (!res.ok) return toast.error(b.error ?? "Purchase failed.");
    toast.success(`Bought ${formatNumber(b.bought)} leads for ${b.currency} ${formatNumber(b.cost)}. They're in your Leads now.`);
    check({ preventDefault() {} } as React.FormEvent);
  }

  const cost = r ? Number(count || 0) * r.price : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Panel className="p-6">
        <p className="text-sm text-muted">
          Buy ready business leads from our data bank. Type what you want, like <span className="font-mono">restaurant in USA</span> or{" "}
          <span className="font-mono">salon in Lahore</span>. You only pay for businesses you don't already have.
        </p>
        <form onSubmit={check} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="restaurant in USA" className="pl-9" />
          </div>
          <Button type="submit" loading={loading}>
            Check
          </Button>
        </form>
      </Panel>

      {r && (
        <Panel className="space-y-4 p-6">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-panel bg-line text-center">
            {[
              ["Available (new to you)", formatNumber(r.newCount)],
              ["Price per lead", `${r.currency} ${r.price}`],
              ["Your balance", `${r.currency} ${formatNumber(r.balance)}`],
            ].map(([l, v]) => (
              <div key={l} className="bg-surface p-4">
                <p className="text-[12px] text-muted">{l}</p>
                <p className="tabular mt-1 text-lg font-semibold">{v}</p>
              </div>
            ))}
          </div>
          {r.newCount === 0 ? (
            <p className="text-sm text-muted">Nothing new for that search in the bank yet. Try a different city or category.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-[13px] text-muted">How many to buy</label>
                  <Input type="number" min={1} max={r.newCount} value={count} onChange={(e) => setCount(e.target.value)} className="tabular w-32" />
                </div>
                <button onClick={() => setCount(String(Math.min(r.newCount, r.canAfford || r.newCount)))} className="text-[13px] text-pin hover:underline">
                  Max I can afford ({formatNumber(Math.min(r.newCount, r.canAfford))})
                </button>
                <span className="ml-auto text-sm">
                  Total: <span className="font-semibold">{r.currency} {formatNumber(cost)}</span>
                </span>
              </div>
              {cost > r.balance ? (
                <p className="text-sm text-danger">
                  Not enough balance.{" "}
                  <Link href="/wallet" className="underline">
                    Top up your wallet
                  </Link>
                  .
                </p>
              ) : (
                <Button onClick={buy} loading={buying} disabled={!Number(count)}>
                  Buy {formatNumber(Number(count))} leads for {r.currency} {formatNumber(cost)}
                </Button>
              )}
            </>
          )}
        </Panel>
      )}
    </div>
  );
}
