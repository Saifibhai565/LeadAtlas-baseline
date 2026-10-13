"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

type Method = { id: string; name: string; kind: string; currency: string; network: string | null; accountTitle: string | null; accountNumber: string | null; details: string | null; qrImage: string | null };
type Plan = { id: string; name: string; price: number; priceUsd?: number | null; currency: string; credits: number; seats: number; ai: boolean; api: boolean; outreach: boolean; whiteLabel?: boolean; card?: boolean; blurb: string | null };
type Payment = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  status: string;
  adminNote: string | null;
  discount: number;
  couponCode: string | null;
  createdAt: string;
  plan: { name: string };
};
type Data = {
  current: { planName: string; expiresAt: string | null; credits: number; seats: number };
  plans: Plan[];
  payments: Payment[];
  instructions: string;
  isOwner: boolean;
  methods: Method[];
};

const USDISH = ["USD", "USDT", "USDC", "BUSD", "DAI"];
function priceIn(p: Plan, m: Method | null) {
  if (!m || m.currency === p.currency) return { amount: p.price, currency: p.currency };
  if (USDISH.includes(m.currency) && p.priceUsd != null) return { amount: p.priceUsd, currency: m.currency };
  return null;
}

const METHOD_LABEL: Record<string, string> = { JAZZCASH: "JazzCash", EASYPAISA: "Easypaisa", BANK: "Bank transfer", CARD: "Card", OTHER: "Other" };

export function BillingView() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [paying, setPaying] = useState<Plan | null>(null);
  const [form, setForm] = useState({ method: "JAZZCASH", reference: "", payerName: "", payerPhone: "" });
  const [coupon, setCoupon] = useState("");
  const [methodId, setMethodId] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; final: number; label: string } | null>(null);

  async function applyCoupon() {
    if (!paying || !coupon.trim()) return;
    const res = await fetch("/api/billing/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: paying.id, code: coupon, methodId: methodId || undefined }),
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) {
      setApplied(null);
      return toast.error(b.error ?? "That coupon didn't work.");
    }
    setApplied(b);
    toast.success(`${b.label} applied.`);
  }
  const [sending, setSending] = useState(false);

  const load = () =>
    fetch("/api/billing", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData);
  useEffect(() => {
    load();
    if (new URLSearchParams(window.location.search).get("paid") === "1") {
      toast.success("Thanks! Your card payment went through. Your plan switches on within a minute.");
      const t = setTimeout(() => {
        load();
        router.refresh();
      }, 8000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function payByCard(p: Plan) {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: p.id }),
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(b.error ?? "Couldn't open the card payment page.");
    window.location.href = b.url;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!paying) return;
    setSending(true);
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: paying.id, ...form, methodId: methodId || undefined, couponCode: applied?.code ?? "" }),
    });
    const b = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't send the payment details.");
    toast.success("Payment details sent. Your plan switches on once it's confirmed.");
    setPaying(null);
    setApplied(null);
    setCoupon("");
    setForm({ method: "JAZZCASH", reference: "", payerName: "", payerPhone: "" });
    load();
    router.refresh();
  }

  if (!data) return <div className="h-72 animate-pulse rounded-panel bg-surface" />;
  const method = data.methods?.find((m) => m.id === methodId) ?? null;
  const usable = (p: Plan) => (data.methods ?? []).filter((m) => priceIn(p, m));
  const price = paying ? priceIn(paying, method) : null;
  const expires = data.current.expiresAt ? new Date(data.current.expiresAt) : null;

  return (
    <div className="space-y-6">
      <Panel className="flex flex-wrap items-center gap-x-10 gap-y-4 p-6">
        <div>
          <p className="text-[13px] text-muted">Current plan</p>
          <p className="text-2xl font-semibold">{data.current.planName}</p>
        </div>
        <div>
          <p className="text-[13px] text-muted">Credits left</p>
          <p className="tabular text-2xl font-semibold">{formatNumber(data.current.credits)}</p>
        </div>
        <div>
          <p className="text-[13px] text-muted">Team seats</p>
          <p className="tabular text-2xl font-semibold">{data.current.seats}</p>
        </div>
        <p className="text-sm text-muted">
          {expires
            ? `Renews by payment. Active until ${expires.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`
            : "You're on the free plan. Credits you have stay until you use them."}
        </p>
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        {data.plans.map((p) => {
          const current = p.name === data.current.planName;
          return (
            <Panel key={p.id} className={cn("flex flex-col p-6", current && "border-pin/60")}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                {current && <Badge tone="pin">Your plan</Badge>}
              </div>
              {p.blurb && <p className="mt-1 text-sm text-muted">{p.blurb}</p>}
              <p className="mt-5">
                <span className="tabular text-3xl font-semibold">
                  {p.currency} {formatNumber(p.price)}
                </span>
                <span className="text-muted"> / month</span>
                {p.priceUsd != null && <span className="block text-[13px] text-muted">or ${formatNumber(p.priceUsd)}</span>}
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                  {formatNumber(p.credits)} leads a month
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                  {p.seats === 1 ? "Just you" : `Up to ${p.seats} people`}
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                  Website checks, pipeline and templates
                </li>
                <li className={cn("flex gap-2", !p.ai && "text-muted")}>
                  {p.ai ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                  AI message writer and web extractor
                </li>
                <li className={cn("flex gap-2", !p.api && "text-muted")}>
                  {p.api ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                  API, webhooks and Chrome extension
                </li>
                <li className={cn("flex gap-2", !p.outreach && "text-muted")}>
                  {p.outreach ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                  Email outreach and follow-up sequences
                </li>
                {p.whiteLabel && (
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                    Your own domain and brand (white-label)
                  </li>
                )}
              </ul>
              <div className="mt-auto pt-6">
                {data.isOwner ? (
                  <>
                  <Button
                    className="w-full"
                    variant={current ? "secondary" : "primary"}
                    onClick={() => {
                      setPaying(p);
                      setApplied(null);
                    }}
                  >
                    {current ? "Pay for another month" : `Choose ${p.name}`}
                  </Button>
                  {p.card && (
                    <Button className="mt-2 w-full" variant="ghost" onClick={() => payByCard(p)}>
                      Pay by card
                    </Button>
                  )}
                  </>
                ) : (
                  <p className="text-center text-[13px] text-muted">The account owner manages the plan.</p>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      {paying && (
        <Panel>
          <PanelHeader
            title={`Pay for ${paying.name}${price ? `: ${price.currency} ${formatNumber(applied ? applied.final : price.amount)}` : ""}`}
            description="Send the payment, then tell us the transaction ID."
            action={
              <button onClick={() => setPaying(null)} className="text-muted hover:text-ink" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            }
          />
          <div className="grid gap-6 p-5 md:grid-cols-2">
            {data.methods?.length ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">1. Choose how to pay</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {usable(paying).map((m) => {
                    const pr = priceIn(paying, m)!;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => {
                          setMethodId(m.id);
                          setApplied(null);
                        }}
                        className={cn("rounded-control border p-3 text-left text-sm", methodId === m.id ? "border-pin bg-pin/10" : "border-line hover:border-muted/50")}
                      >
                        <span className="block font-medium">{m.name}</span>
                        <span className="tabular text-[13px] text-muted">
                          {pr.currency} {formatNumber(pr.amount)}
                          {m.network ? ` · ${m.network}` : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {method && (
                  <div className="space-y-2 rounded-control border border-line bg-night/40 p-4 text-sm">
                    <p className="font-medium">2. Send exactly {price ? `${price.currency} ${formatNumber(applied ? applied.final : price.amount)}` : ""}</p>
                    {method.accountTitle && <p>Account title: {method.accountTitle}</p>}
                    {method.accountNumber && (
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-muted">{method.kind === "CRYPTO" ? `${method.network} address:` : "Account:"}</span>
                        <code className="break-all rounded bg-raised px-2 py-1 text-[13px]">{method.accountNumber}</code>
                        <button type="button" onClick={() => navigator.clipboard.writeText(method.accountNumber!).then(() => toast.success("Copied."))} className="text-[13px] text-pin hover:underline">
                          Copy
                        </button>
                      </p>
                    )}
                    {method.kind === "CRYPTO" && <p className="text-[13px] text-danger">Send only on the {method.network} network. Sending on another network loses the money.</p>}
                    {method.details && <p className="whitespace-pre-line text-muted">{method.details}</p>}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {method.qrImage && <img src={method.qrImage} alt={`QR code for ${method.name}`} className="h-40 w-40 rounded bg-white p-2" />}
                  </div>
                )}
              </div>
            ) : (
              <div className="whitespace-pre-line rounded-control border border-line bg-night/50 p-4 text-sm leading-6">{data.instructions}</div>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="coupon">Coupon code (optional)</Label>
                <div className="flex gap-2">
                  <Input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} className="uppercase" />
                  <Button type="button" variant="secondary" onClick={applyCoupon} disabled={!coupon.trim()}>
                    Apply
                  </Button>
                </div>
                {applied && (
                  <p className="mt-1.5 text-[13px] text-ok">
                    {applied.label}: pay {paying.currency} {formatNumber(applied.final)} instead of {formatNumber(paying.price)}.
                  </p>
                )}
              </div>
              {!data.methods?.length && (
              <div>
                <Label htmlFor="method">Paid with</Label>
                <Select id="method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  {Object.entries(METHOD_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              )}
              <div>
                <Label htmlFor="ref">{method?.kind === "CRYPTO" ? "Transaction hash (TxID)" : "Transaction ID"}</Label>
                <Input id="ref" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pname">Sender name</Label>
                  <Input id="pname" value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="pphone">Sender number</Label>
                  <Input id="pphone" value={form.payerPhone} onChange={(e) => setForm({ ...form, payerPhone: e.target.value })} />
                </div>
              </div>
              <Button type="submit" loading={sending} className="w-full" disabled={Boolean(data.methods?.length) && !method}>
                Send payment details
              </Button>
            </form>
          </div>
        </Panel>
      )}

      <ReferralPanel />

      {data.payments.length > 0 && (
        <Panel>
          <PanelHeader title="Payment history" />
          <ul className="divide-y divide-line">
            {data.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {p.plan.name}, {p.currency} {formatNumber(p.amount)}
                  </p>
                  <p className="text-[13px] text-muted">
                    {METHOD_LABEL[p.method]} {p.reference}, {timeAgo(p.createdAt)}
                    {p.adminNote ? `. Note: ${p.adminNote}` : ""}
                  </p>
                </div>
                <span className="flex items-center gap-3">
                  {p.status === "APPROVED" && (
                    <a href={`/invoice/${p.id}`} target="_blank" rel="noreferrer" className="text-[13px] text-pin hover:underline">
                      Invoice
                    </a>
                  )}
                  <Badge tone={p.status === "APPROVED" ? "ok" : p.status === "REJECTED" ? "danger" : "info"}>
                    {p.status === "APPROVED" ? "Confirmed" : p.status === "REJECTED" ? "Not confirmed" : "Waiting for review"}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function ReferralPanel() {
  const [r, setR] = useState<{ code: string; signedUp: number; paid: number; reward: number; earned: number } | null>(null);
  useEffect(() => {
    fetch("/api/referrals")
      .then((res) => res.json())
      .then(setR)
      .catch(() => undefined);
  }, []);
  if (!r?.code || r.reward <= 0) return null;
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${r.code}`;
  return (
    <Panel className="p-6">
      <h2 className="text-[15px] font-semibold">Invite friends, earn {formatNumber(r.reward)} credits each</h2>
      <p className="mt-1 text-sm text-muted">
        Share your link. When someone signs up with it and starts a paid plan, you get {formatNumber(r.reward)} credits.
      </p>
      <div className="mt-4 flex gap-2">
        <Input value={link} readOnly onFocus={(e) => e.target.select()} className="font-mono text-[13px]" />
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Link copied."))}>
          Copy
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`I use this to find business clients on Google Maps. Try it: ${link}`)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 shrink-0 items-center rounded-control border border-line bg-raised px-4 text-sm hover:border-muted/50"
        >
          Share on WhatsApp
        </a>
      </div>
      <p className="tabular mt-3 text-[13px] text-muted">
        {formatNumber(r.signedUp)} signed up, {formatNumber(r.paid)} paid, {formatNumber(r.earned)} credits earned.
      </p>
    </Panel>
  );
}
