"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

type Method = { id: string; name: string; kind: string; currency: string; network: string | null; accountTitle: string | null; accountNumber: string | null; details: string | null; qrImage: string | null };
type Txn = { id: string; delta: number; balance: number; reason: string; detail: string | null; createdAt: string };
type Deposit = { id: string; amount: number; currency: string; method: string; reference: string; status: string; createdAt: string };
type Data = { balance: number; currency: string; price: number; priceCurrency: string; minDeposit: number; methods: Method[]; txns: Txn[]; deposits: Deposit[]; isOwner: boolean };

export function WalletView() {
  const [d, setD] = useState<Data | null>(null);
  const [method, setMethod] = useState<Method | null>(null);
  const [f, setF] = useState({ amount: "", reference: "" });

  const load = useCallback(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then(setD);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  if (!d) return <div className="h-64 animate-pulse rounded-panel bg-surface" />;

  async function deposit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/wallet/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(f.amount), method: method ? `${method.kind}_${method.network ?? ""}`.replace(/_$/, "") : "OTHER", reference: f.reference }),
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(b.error ?? "Couldn't submit.");
    toast.success("Deposit submitted. Your wallet is credited once we confirm it.");
    setF({ amount: "", reference: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <Panel className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-[13px] text-muted">Wallet balance</p>
          <p className="tabular text-[40px] font-semibold leading-none">
            {d.currency} {formatNumber(d.balance)}
          </p>
          <p className="mt-1 text-[13px] text-muted">Buy leads from the data bank: {d.priceCurrency} {d.price} per lead.</p>
        </div>
        <a href="/buy-leads" className="inline-flex h-11 items-center rounded-control bg-pin px-5 text-sm font-semibold text-pin-ink">
          Buy leads
        </a>
      </Panel>

      {d.isOwner && (
        <Panel>
          <PanelHeader title="Add money (deposit)" description={`Minimum ${d.currency} ${d.minDeposit}. Send, then enter the amount and transaction reference.`} />
          <div className="p-5">
            {d.methods.length === 0 ? (
              <p className="text-sm text-muted">No deposit methods are set up yet. Ask support.</p>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {d.methods.map((m) => (
                    <button key={m.id} onClick={() => setMethod(m)} className={cn("rounded-control border p-3 text-left text-sm", method?.id === m.id ? "border-pin bg-pin/10" : "border-line hover:border-muted/50")}>
                      <span className="font-medium">{m.name}</span>
                      <span className="block text-[12px] text-muted">
                        {m.kind === "CRYPTO" ? `${m.network} · ${m.currency}` : "Bank transfer"}
                      </span>
                    </button>
                  ))}
                </div>
                {method && (
                  <div className="mt-4 space-y-2 rounded-control border border-line bg-night/40 p-4 text-sm">
                    {method.accountTitle && <p>Account title: {method.accountTitle}</p>}
                    {method.accountNumber && (
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-muted">{method.kind === "CRYPTO" ? `${method.network} address:` : "Account:"}</span>
                        <code className="break-all rounded bg-raised px-2 py-1 text-[13px]">{method.accountNumber}</code>
                        <button onClick={() => navigator.clipboard.writeText(method.accountNumber!).then(() => toast.success("Copied."))} className="text-pin hover:underline">
                          <Copy className="inline h-3.5 w-3.5" />
                        </button>
                      </p>
                    )}
                    {method.kind === "CRYPTO" && <p className="text-[13px] text-danger">Send only on the {method.network} network.</p>}
                    {method.details && <p className="whitespace-pre-line text-muted">{method.details}</p>}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {method.qrImage && <img src={method.qrImage} alt="QR" className="h-40 w-40 rounded bg-white p-2" />}
                    <form onSubmit={deposit} className="grid gap-2 border-t border-line pt-3 sm:grid-cols-[120px_1fr_auto] sm:items-end">
                      <div>
                        <Label htmlFor="amt">Amount sent</Label>
                        <Input id="amt" type="number" min={d.minDeposit} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required />
                      </div>
                      <div>
                        <Label htmlFor="ref">{method.kind === "CRYPTO" ? "Transaction hash" : "Bank reference"}</Label>
                        <Input id="ref" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} className="font-mono text-[13px]" required />
                      </div>
                      <Button type="submit">Submit deposit</Button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </Panel>
      )}

      {d.deposits.length > 0 && (
        <Panel>
          <PanelHeader title="Deposits" />
          <ul className="divide-y divide-line">
            {d.deposits.map((dep) => (
              <li key={dep.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span>
                  {dep.currency} {formatNumber(dep.amount)} · <span className="text-muted">{dep.method}</span> · <span className="font-mono text-[12px] text-muted">{dep.reference.slice(0, 18)}…</span>
                </span>
                <Badge tone={dep.status === "APPROVED" ? "ok" : dep.status === "REJECTED" ? "danger" : "info"}>{dep.status.toLowerCase()}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {d.txns.length > 0 && (
        <Panel>
          <PanelHeader title="Wallet history" />
          <ul className="divide-y divide-line">
            {d.txns.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-2 text-sm">
                <span>
                  <span className="text-muted">{t.detail ?? t.reason}</span>
                </span>
                <span className="tabular">
                  <span className={t.delta >= 0 ? "text-ok" : "text-danger"}>
                    {t.delta >= 0 ? "+" : ""}
                    {formatNumber(t.delta)}
                  </span>
                  <span className="ml-3 text-muted">{formatNumber(t.balance)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
