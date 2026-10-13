"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Select, Textarea, Toggle } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

const TABS = ["Overview", "Payments", "Support", "Users", "Leads", "Plans", "Payment methods", "Features", "Coupons", "Website", "Activity log", "Errors", "System", "Settings"] as const;
type Tab = (typeof TABS)[number];

async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) {
    toast.error(b.error ?? "Something went wrong.");
    return null;
  }
  return b as T;
}

// ---------- Overview ----------
function Overview({ go }: { go: (t: Tab) => void }) {
  const [d, setD] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    api<Record<string, number>>("/api/admin/overview").then(setD);
  }, []);
  if (!d) return <div className="h-40 animate-pulse rounded-panel bg-surface" />;
  const stats = [
    ["Accounts", d.users, `+${d.newUsers} this week`],
    ["Paying now", d.paying, ""],
    ["Revenue this month", d.revenueMonth, `${formatNumber(d.revenueAll)} all time`],
    ["Leads saved", d.leads, `${formatNumber(d.searches)} searches`],
  ] as const;
  return (
    <div className="space-y-6">
      {d.pending > 0 && (
        <button
          onClick={() => go("Payments")}
          className="w-full rounded-panel border border-pin/40 bg-pin/10 px-5 py-3 text-left text-sm text-pin"
        >
          {d.pending} payment{d.pending > 1 ? "s are" : " is"} waiting for your review.
        </button>
      )}
      <Panel className="grid divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {stats.map(([label, value, sub]) => (
          <div key={label} className="p-5">
            <p className="text-[13px] text-muted">{label}</p>
            <p className="tabular mt-1 text-2xl font-semibold">{formatNumber(value)}</p>
            {sub && <p className="text-[12px] text-muted">{sub}</p>}
          </div>
        ))}
      </Panel>
    </div>
  );
}

// ---------- Payments ----------
type AdminPayment = {
  explorer?: string | null;
  network?: string | null;
  id: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  payerName: string | null;
  payerPhone: string | null;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
  plan: { name: string; credits: number };
};

function Payments() {
  const [status, setStatus] = useState("PENDING");
  const [rows, setRows] = useState<AdminPayment[] | null>(null);
  const load = useCallback(() => {
    api<{ payments: AdminPayment[] }>(`/api/admin/payments?status=${status}`).then((b) => setRows(b?.payments ?? []));
  }, [status]);
  useEffect(load, [load]);

  async function review(p: AdminPayment, action: "approve" | "reject") {
    const note = action === "reject" ? prompt("Reason (the customer will see this)", "We couldn't find this transaction.") : "";
    if (note === null) return;
    const b = await api(`/api/admin/payments/${p.id}`, { method: "POST", body: JSON.stringify({ action, note }) });
    if (b) {
      toast.success(action === "approve" ? `${p.plan.name} switched on for ${p.user.name}.` : "Payment rejected.");
      load();
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Payments"
        description="Check each transaction ID in your JazzCash, Easypaisa or bank app before approving."
        action={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 w-auto text-[13px]">
            <option value="PENDING">Waiting</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </Select>
        }
      />
      {rows == null ? (
        <div className="h-24 animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0 text-sm">
                <p className="font-medium">
                  {p.user.name} <span className="font-normal text-muted">{p.user.email}</span>
                </p>
                <p className="mt-0.5">
                  {p.plan.name}, <span className="tabular">{p.currency} {formatNumber(p.amount)}</span> by {p.method.toLowerCase()}
                </p>
                <p className="mt-0.5 text-[13px] text-muted">
                  {p.network ? `${p.network} hash` : "Transaction"} <span className="tabular break-all text-ink">{p.reference}</span>
                  {p.explorer && (
                    <a href={p.explorer} target="_blank" rel="noreferrer" className="ml-1 text-pin hover:underline">
                      check on blockchain
                    </a>
                  )}
                  {p.payerName ? `, from ${p.payerName}` : ""}
                  {p.payerPhone ? ` (${p.payerPhone})` : ""}, {timeAgo(p.createdAt)}
                </p>
              </div>
              {p.status === "PENDING" ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => review(p, "approve")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => review(p, "reject")}>
                    Reject
                  </Button>
                </div>
              ) : (
                <Badge tone={p.status === "APPROVED" ? "ok" : "danger"}>{p.status === "APPROVED" ? "Approved" : "Rejected"}</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ---------- Users ----------
type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  blocked: boolean;
  credits: number;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
  planExpiresAt: string | null;
  ownerId: string | null;
  owner: { name: string; email: string } | null;
  plan: { id: string; name: string } | null;
  _count: { leads: number; members: number };
};
type PlanRow = { id: string; name: string; price: number; currency: string; credits: number; seats: number; ai: boolean; api?: boolean; outreach?: boolean; whiteLabel?: boolean; lsVariantId?: string | null; priceUsd?: number | null; active: boolean; sort: number; blurb: string | null; _count?: { users: number } };

const USER_FILTERS = [
  ["all", "Everyone"],
  ["owners", "Account owners"],
  ["members", "Team members"],
  ["paying", "Paying"],
  ["blocked", "Blocked"],
  ["unverified", "Email not confirmed"],
] as const;

function planActive(u: { plan: unknown; planExpiresAt: string | null }) {
  return Boolean(u.plan && u.planExpiresAt && new Date(u.planExpiresAt) > new Date());
}

function Users() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ users: AdminUser[]; total: number; pageSize: number; counts: Record<string, number> } | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ users: AdminUser[]; total: number; pageSize: number; counts: Record<string, number> }>(
      `/api/admin/users?q=${encodeURIComponent(q)}&filter=${filter}&page=${page}`,
    ).then((b) => b && setData(b));
  }, [q, filter, page]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => setPage(1), [q, filter]);
  useEffect(() => {
    api<{ plans: PlanRow[] }>("/api/admin/plans").then((b) => setPlans(b?.plans ?? []));
  }, []);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <Panel>
        <div className="space-y-3 border-b border-line p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find by name or email" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            {USER_FILTERS.map(([k, l]) => {
              const countKey = k === "all" ? "all" : k;
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  aria-pressed={filter === k}
                  className={cn(
                    "h-8 rounded-full border px-3 text-[13px]",
                    filter === k ? "border-pin/50 bg-pin/10 text-pin" : "border-line text-muted hover:text-ink",
                  )}
                >
                  {l}
                  {data?.counts?.[countKey] != null && <span className="tabular ml-1.5 opacity-70">{formatNumber(data.counts[countKey])}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[13px] text-muted">
                <th className="px-4 py-3 font-medium">Person</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 text-right font-medium">Credits</th>
                <th className="px-4 py-3 text-right font-medium">Leads</th>
                <th className="px-4 py-3 font-medium">Last sign-in</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.users.map((u) => (
                <tr key={u.id} className="hover:bg-raised/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {u.name}{" "}
                      {u.role === "ADMIN" && <Badge tone="pin">Admin</Badge>} {u.blocked && <Badge tone="danger">Blocked</Badge>}
                    </p>
                    <p className="text-[13px] text-muted">
                      {u.email}
                      {!u.emailVerifiedAt && <span className="ml-1.5 text-pin" title="Email not confirmed">(not confirmed)</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted">
                    {u.owner ? <>Member of {u.owner.name}</> : <>Owner{u._count.members ? `, ${u._count.members} in team` : ""}</>}
                  </td>
                  <td className="px-4 py-3">
                    {u.ownerId ? (
                      <span className="text-[13px] text-muted">Shared</span>
                    ) : planActive(u) ? (
                      <Badge tone="ok">{u.plan!.name} until {new Date(u.planExpiresAt!).toLocaleDateString("en-GB")}</Badge>
                    ) : (
                      <Badge>Free</Badge>
                    )}
                  </td>
                  <td className="tabular px-4 py-3 text-right">{u.ownerId ? "-" : formatNumber(u.credits)}</td>
                  <td className="tabular px-4 py-3 text-right">{u.ownerId ? "-" : formatNumber(u._count.leads)}</td>
                  <td className="px-4 py-3 text-[13px] text-muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="secondary" onClick={() => setOpen(u.id)}>
                      View and edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.users.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">Nobody matches.</p>}
        </div>

        {data && data.total > data.pageSize && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-muted">
            <span className="tabular">
              Page {page} of {pages}, {formatNumber(data.total)} people
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Panel>
      {open && <UserDetail id={open} plans={plans} onClose={() => setOpen(null)} onChanged={load} />}
    </>
  );
}

type Detail = {
  user: AdminUser & {
    businessName: string | null;
    offer: string | null;
    emailAlerts: boolean;
    owner: { id: string; name: string; email: string } | null;
    members: { id: string; name: string; email: string; blocked: boolean; lastLoginAt: string | null }[];
    payments: { id: string; amount: number; currency: string; status: string; reference: string; createdAt: string; plan: { name: string } }[];
  };
  stats: { leads: number; leadsWeek: number; searches: number; watches: number; messages: number; lastSearch: { name: string; createdAt: string } | null };
};

function toDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function UserDetail({ id, plans, onClose, onChanged }: { id: string; plans: PlanRow[]; onClose: () => void; onChanged: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "USER",
    credits: "",
    planId: "",
    planEnd: "",
    verified: false,
    businessName: "",
    offer: "",
    newPassword: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<Detail>(`/api/admin/users/${id}`).then((b) => {
      if (!b) return;
      setD(b);
      setForm({
        name: b.user.name,
        email: b.user.email,
        role: b.user.role,
        credits: String(b.user.credits),
        planId: b.user.plan?.id ?? "",
        planEnd: toDate(b.user.planExpiresAt),
        verified: Boolean(b.user.emailVerifiedAt),
        businessName: b.user.businessName ?? "",
        offer: b.user.offer ?? "",
        newPassword: "",
      });
    });
  }, [id]);
  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function patch(body: Record<string, unknown>, msg: string) {
    const b = await api<{ tempPassword: string | null }>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    if (!b) return false;
    if (b.tempPassword) {
      await navigator.clipboard.writeText(b.tempPassword).catch(() => undefined);
      alert(`Temporary password for ${d?.user.email}:\n\n${b.tempPassword}\n\n(Copied. Send it to them and ask them to change it in Settings.)`);
    } else if (msg) toast.success(msg);
    load();
    onChanged();
    return true;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!d) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      role: form.role,
      verified: form.verified,
      setCredits: Number(form.credits),
      businessName: form.businessName,
      offer: form.offer,
      ...(form.newPassword ? { newPassword: form.newPassword } : {}),
    };
    if (!d.user.ownerId) {
      body.planId = form.planId || null;
      if (form.planId) body.planExpiresAt = form.planEnd ? `${form.planEnd}T23:59:59` : undefined;
    }
    await patch(body, "Saved.");
    setSaving(false);
  }

  async function impersonate() {
    if (!d || !confirm(`Open the app as ${d.user.name}? You'll see exactly what they see. A banner lets you come back.`)) return;
    const b = await api(`/api/admin/users/${id}/impersonate`, { method: "POST" });
    if (b) window.location.href = "/dashboard";
  }

  async function remove() {
    if (!d) return;
    const what = d.user.ownerId ? "this team member" : "this account and ALL of its leads, searches and team members";
    if (prompt(`This deletes ${what}. It can't be undone.\n\nType DELETE to confirm.`) !== "DELETE") return;
    const b = await api(`/api/admin/users/${id}`, { method: "DELETE" });
    if (b) {
      toast.success("Deleted.");
      onChanged();
      onClose();
    }
  }

  const u = d?.user;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label="User details">
      <button className="absolute inset-0 bg-night/60" onClick={onClose} aria-label="Close" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-line bg-surface">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{u?.name ?? "Loading…"}</h2>
            {u && (
              <p className="truncate text-sm text-muted">
                {u.email}, joined {timeAgo(u.createdAt)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!d || !u ? (
          <div className="flex-1 animate-pulse" />
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <dl className="grid grid-cols-3 gap-3 text-center">
              {[
                ["Leads", d.stats.leads, `+${d.stats.leadsWeek} this week`],
                ["Searches", d.stats.searches, d.stats.lastSearch ? `last ${timeAgo(d.stats.lastSearch.createdAt)}` : "none yet"],
                ["Messages sent", d.stats.messages, `${d.stats.watches} watches`],
              ].map(([label, value, sub]) => (
                <div key={String(label)} className="rounded-control border border-line p-3">
                  <dd className="tabular text-xl font-semibold">{formatNumber(Number(value))}</dd>
                  <dt className="text-[12px] text-muted">{label}</dt>
                  <p className="text-[11px] text-muted">{sub}</p>
                </div>
              ))}
            </dl>
            <p className="text-[13px] text-muted">
              Last sign-in: {u.lastLoginAt ? timeAgo(u.lastLoginAt) : "never"}.{" "}
              {u.owner ? `Team member of ${u.owner.name} (${u.owner.email}).` : u.members.length ? `${u.members.length} people in their team.` : "No team."}
              {u.businessName ? ` Business: ${u.businessName}.` : ""}
            </p>

            <form onSubmit={save} className="space-y-4 rounded-panel border border-line p-4">
              <h3 className="text-[15px] font-semibold">Edit</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ue-name">Name</Label>
                  <Input id="ue-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="ue-email">Email</Label>
                  <Input id="ue-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ue-role">Role</Label>
                  <Select id="ue-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={Boolean(u.ownerId)}>
                    <option value="USER">Customer</option>
                    <option value="ADMIN">Admin (full access to everything)</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ue-credits">Credits</Label>
                  <Input
                    id="ue-credits"
                    type="number"
                    min={0}
                    value={form.credits}
                    onChange={(e) => setForm({ ...form, credits: e.target.value })}
                    disabled={Boolean(u.ownerId)}
                    className="tabular"
                  />
                </div>
              </div>
              {!u.ownerId && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="ue-plan">Plan</Label>
                    <Select id="ue-plan" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
                      <option value="">Free</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="ue-end">Plan ends on</Label>
                    <Input
                      id="ue-end"
                      type="date"
                      value={form.planEnd}
                      onChange={(e) => setForm({ ...form, planEnd: e.target.value })}
                      disabled={!form.planId}
                      className="[color-scheme:dark]"
                    />
                    <Hint>Empty = 30 days from today.</Hint>
                  </div>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ue-biz">Business name</Label>
                  <Input id="ue-biz" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="ue-pw">New password</Label>
                  <Input
                    id="ue-pw"
                    type="text"
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    placeholder="Leave empty to keep it"
                    autoComplete="off"
                  />
                  <Hint>Their current password can't be shown, only replaced.</Hint>
                </div>
              </div>
              <div>
                <Label htmlFor="ue-offer">What they sell</Label>
                <Textarea id="ue-offer" rows={2} value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} />
              </div>
              <Toggle checked={form.verified} onChange={(v) => setForm({ ...form, verified: v })} label="Email confirmed" />
              {u.ownerId && <Hint>Credits and plan belong to their team owner. Edit the owner to change them.</Hint>}
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
            </form>

            <div className="space-y-2">
              <h3 className="text-[15px] font-semibold">Actions</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={impersonate} disabled={u.blocked}>
                  Open the app as this person
                </Button>
                <Button size="sm" variant="secondary" onClick={() => confirm(`Reset the password for ${u.email}?`) && patch({ resetPassword: true }, "")}>
                  Reset password
                </Button>
                {u.role !== "ADMIN" && (
                  <Button
                    size="sm"
                    variant={u.blocked ? "secondary" : "danger"}
                    onClick={() => patch({ blocked: !u.blocked }, u.blocked ? "Account switched back on." : "Account blocked.")}
                  >
                    {u.blocked ? "Unblock" : "Block"}
                  </Button>
                )}
                {u.role !== "ADMIN" && (
                  <Button size="sm" variant="danger" onClick={remove}>
                    Delete
                  </Button>
                )}
              </div>
            </div>

            {u.members.length > 0 && (
              <div>
                <h3 className="mb-2 text-[15px] font-semibold">Team</h3>
                <ul className="divide-y divide-line rounded-control border border-line text-sm">
                  {u.members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between px-3 py-2">
                      <span className="min-w-0 truncate">
                        {m.name} <span className="text-muted">{m.email}</span>
                      </span>
                      {m.blocked ? <Badge tone="danger">Removed</Badge> : <span className="text-[12px] text-muted">{m.lastLoginAt ? timeAgo(m.lastLoginAt) : "never signed in"}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {u.payments.length > 0 && (
              <div>
                <h3 className="mb-2 text-[15px] font-semibold">Payments</h3>
                <ul className="divide-y divide-line rounded-control border border-line text-sm">
                  {u.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="min-w-0 truncate">
                        {p.plan.name}, <span className="tabular">{p.currency} {formatNumber(p.amount)}</span>{" "}
                        <span className="text-muted">{p.reference}, {timeAgo(p.createdAt)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {p.status === "APPROVED" && (
                          <a href={`/invoice/${p.id}`} target="_blank" rel="noreferrer" className="text-[12px] text-pin hover:underline">
                            Invoice
                          </a>
                        )}
                        <Badge tone={p.status === "APPROVED" ? "ok" : p.status === "REJECTED" ? "danger" : "info"}>{p.status.toLowerCase()}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

// ---------- All leads ----------
type AdminLead = {
  id: string;
  title: string;
  category: string | null;
  phone: string | null;
  emails: string | null;
  website: string | null;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  status: string;
  source: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

const EMPTY_LEAD_FILTERS = {
  q: "",
  owner: "",
  category: "",
  city: "",
  status: "",
  source: "",
  phone: "",
  email: "",
  website: "",
  minRating: "",
  from: "",
  to: "",
};

function AdminLeads() {
  const [f, setF] = useState(EMPTY_LEAD_FILTERS);
  const [debounced, setDebounced] = useState(f);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [data, setData] = useState<{ items: AdminLead[]; total: number } | null>(null);
  const [owners, setOwners] = useState<{ id: string; name: string; email: string; _count: { leads: number } }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(f), 350);
    return () => clearTimeout(t);
  }, [f]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(debounced).forEach(([k, v]) => v && p.set(k, v));
    return p.toString();
  }, [debounced]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
    setAllMatching(false);
  }, [query, pageSize]);

  const load = useCallback(() => {
    api<{ items: AdminLead[]; total: number; owners: typeof owners | null }>(
      `/api/admin/leads?${query}&page=${page}&pageSize=${pageSize}${owners.length ? "" : "&withOwners=1"}`,
    ).then((b) => {
      if (!b) return;
      setData({ items: b.items, total: b.total });
      if (b.owners) setOwners(b.owners);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page, pageSize]);
  useEffect(load, [load]);

  const items = data?.items ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const allOnPage = items.length > 0 && items.every((l) => selected.has(l.id));
  const count = allMatching ? data?.total ?? 0 : selected.size;

  function toggleAll() {
    setAllMatching(false);
    setSelected((s) => {
      const n = new Set(s);
      if (allOnPage) items.forEach((l) => n.delete(l.id));
      else items.forEach((l) => n.add(l.id));
      return n;
    });
  }

  async function remove() {
    if (count === 0) return;
    if (prompt(`Delete ${formatNumber(count)} leads from customers' accounts? This can't be undone.\n\nType DELETE to confirm.`) !== "DELETE") return;
    const b = await api<{ deleted: number }>("/api/admin/leads/bulk", {
      method: "POST",
      body: JSON.stringify(allMatching ? { action: "delete", all: true, query } : { action: "delete", ids: Array.from(selected) }),
    });
    if (b) {
      toast.success(`Deleted ${formatNumber(b.deleted)} leads.`);
      setSelected(new Set());
      setAllMatching(false);
      load();
    }
  }

  const exportHref = allMatching || selected.size === 0 ? `/api/admin/leads/export?${query}` : `/api/admin/leads/export?ids=${Array.from(selected).join(",")}`;
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const filtered = Object.values(f).some(Boolean);

  return (
    <Panel>
      <div className="space-y-3 border-b border-line p-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Name, phone, email, website, address" className="pl-9" />
          </div>
          <Select value={f.owner} onChange={(e) => set("owner", e.target.value)} className="w-auto max-w-[240px]" aria-label="Customer">
            <option value="">All customers</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({formatNumber(o._count.leads)})
              </option>
            ))}
          </Select>
          <Input value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="Category" className="w-36" />
          <Input value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="City or area" className="w-36" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <Select value={f.status} onChange={(e) => set("status", e.target.value)} className="h-8 w-auto text-[13px]" aria-label="Status">
            <option value="">Any status</option>
            {["NEW", "CONTACTED", "INTERESTED", "WON", "LOST"].map((v) => (
              <option key={v} value={v}>
                {v.charAt(0) + v.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
          {(
            [
              ["phone", "Phone"],
              ["email", "Email"],
              ["website", "Website"],
            ] as const
          ).map(([k, l]) => (
            <Select key={k} value={f[k]} onChange={(e) => set(k, e.target.value)} className="h-8 w-auto text-[13px]" aria-label={l}>
              <option value="">{l}: any</option>
              <option value="1">{l}: yes</option>
              <option value="0">{l}: no</option>
            </Select>
          ))}
          <Select value={f.source} onChange={(e) => set("source", e.target.value)} className="h-8 w-auto text-[13px]" aria-label="Source">
            <option value="">Any source</option>
            <option value="MAPS">Map search</option>
            <option value="WEB">Web / extension</option>
            <option value="IMPORT">Imported</option>
          </Select>
          <Select value={f.minRating} onChange={(e) => set("minRating", e.target.value)} className="h-8 w-auto text-[13px]" aria-label="Rating">
            <option value="">Any rating</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="4.5">4.5+</option>
          </Select>
          <label className="inline-flex items-center gap-1 text-muted">
            Added from
            <Input type="date" value={f.from} onChange={(e) => set("from", e.target.value)} className="h-8 w-auto text-[13px] [color-scheme:dark]" />
          </label>
          <label className="inline-flex items-center gap-1 text-muted">
            to
            <Input type="date" value={f.to} onChange={(e) => set("to", e.target.value)} className="h-8 w-auto text-[13px] [color-scheme:dark]" />
          </label>
          {filtered && (
            <button onClick={() => setF(EMPTY_LEAD_FILTERS)} className="text-muted hover:text-ink">
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-raised/30 px-4 py-2.5 text-sm">
        <span className="tabular">{data ? `${formatNumber(data.total)} leads` : "…"}</span>
        {count > 0 && <span className="tabular font-medium text-pin">{formatNumber(count)} selected</span>}
        {allOnPage && !allMatching && data && data.total > items.length && (
          <button onClick={() => setAllMatching(true)} className="text-[13px] text-pin hover:underline">
            Select all {formatNumber(data.total)} matching
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <a href={exportHref} className="inline-flex h-8 items-center rounded-control border border-line bg-raised px-3 text-[13px] hover:border-muted/50">
            {count > 0 ? `Export ${formatNumber(count)}` : "Export all shown"}
          </a>
          <Button size="sm" variant="danger" onClick={remove} disabled={count === 0}>
            Delete
          </Button>
          <Select value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))} className="h-8 w-auto text-[13px]" aria-label="Rows per page">
            {[50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[13px] text-muted">
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select page" className="accent-[rgb(var(--pin))]" />
              </th>
              <th className="px-2 py-3 font-medium">Business</th>
              <th className="px-3 py-3 font-medium">Contact</th>
              <th className="px-3 py-3 font-medium">Customer</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((l) => (
              <tr key={l.id} className={cn("align-top hover:bg-raised/30", (allMatching || selected.has(l.id)) && "bg-pin/5")}>
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={allMatching || selected.has(l.id)}
                    onChange={() => {
                      setAllMatching(false);
                      setSelected((s) => {
                        const n = new Set(s);
                        if (n.has(l.id)) n.delete(l.id);
                        else n.add(l.id);
                        return n;
                      });
                    }}
                    aria-label={`Select ${l.title}`}
                    className="mt-1 accent-[rgb(var(--pin))]"
                  />
                </td>
                <td className="max-w-[280px] px-2 py-2.5">
                  <p className="font-medium">{l.title}</p>
                  <p className="text-[12px] text-muted">
                    {[l.category, l.rating != null ? `★ ${l.rating} (${l.reviewCount ?? 0})` : null].filter(Boolean).join(" · ")}
                  </p>
                  {l.address && <p className="line-clamp-1 text-[12px] text-muted">{l.address}</p>}
                </td>
                <td className="px-3 py-2.5 text-[13px]">
                  <p className="tabular">{l.phone ?? <span className="text-muted">No phone</span>}</p>
                  {l.emails && <p className="max-w-[200px] truncate text-info">{l.emails.split(",")[0]}</p>}
                  {l.website && <p className="max-w-[200px] truncate text-muted">{l.website.replace(/^https?:\/\//, "")}</p>}
                </td>
                <td className="px-3 py-2.5 text-[13px]">
                  <button onClick={() => set("owner", l.user.id)} className="text-left hover:text-pin" title="Show only this customer's leads">
                    {l.user.name}
                    <span className="block text-[12px] text-muted">{l.user.email}</span>
                  </button>
                </td>
                <td className="px-3 py-2.5 text-[13px] text-muted">{l.status.toLowerCase()}</td>
                <td className="px-3 py-2.5 text-[13px] text-muted">{timeAgo(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && items.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">No leads match.</p>}
      </div>

      {data && data.total > pageSize && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-muted">
          <span className="tabular">
            Page {page} of {formatNumber(pages)}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((x) => x + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ---------- Plans ----------
const EMPTY_PLAN: PlanRow = { id: "", name: "", price: 0, currency: "PKR", credits: 1000, seats: 1, ai: false, active: true, sort: 9, blurb: "" };

function Plans() {
  const [plans, setPlans] = useState<PlanRow[] | null>(null);
  const [edit, setEdit] = useState<PlanRow | null>(null);
  const load = () => api<{ plans: PlanRow[] }>("/api/admin/plans").then((b) => setPlans(b?.plans ?? []));
  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const b = await api(edit.id ? `/api/admin/plans/${edit.id}` : "/api/admin/plans", {
      method: edit.id ? "PATCH" : "POST",
      body: JSON.stringify(edit),
    });
    if (b) {
      toast.success("Plan saved.");
      setEdit(null);
      load();
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Panel>
        <PanelHeader
          title="Plans"
          description="Shown on Billing and on your landing page."
          action={
            <Button size="sm" variant="secondary" onClick={() => setEdit({ ...EMPTY_PLAN })}>
              New plan
            </Button>
          }
        />
        <ul className="divide-y divide-line">
          {plans?.map((p) => (
            <li key={p.id}>
              <button onClick={() => setEdit(p)} className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-raised/40">
                <div>
                  <p className="font-medium">
                    {p.name} {!p.active && <Badge>Hidden</Badge>}
                  </p>
                  <p className="text-[13px] text-muted">
                    {formatNumber(p.credits)} credits, {p.seats} seat{p.seats > 1 ? "s" : ""}
                    {p.ai ? ", AI" : ""}
                    {p.api ? ", API" : ""}
                    {p.outreach ? ", outreach" : ""}, {p._count?.users ?? 0} on it
                  </p>
                </div>
                <span className="tabular">
                  {p.currency} {formatNumber(p.price)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      {edit && (
        <Panel>
          <form onSubmit={save} className="space-y-4 p-5">
            <h2 className="text-[15px] font-semibold">{edit.id ? `Edit ${edit.name}` : "New plan"}</h2>
            <div>
              <Label htmlFor="pn">Name</Label>
              <Input id="pn" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="pp">Price per month</Label>
                <Input id="pp" type="number" min={0} value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="pc">Currency</Label>
                <Input id="pc" value={edit.currency} onChange={(e) => setEdit({ ...edit, currency: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="pusd">Price in US dollars (optional)</Label>
              <Input
                id="pusd"
                type="number"
                min={0}
                value={edit.priceUsd ?? ""}
                onChange={(e) => setEdit({ ...edit, priceUsd: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="e.g. 29"
              />
              <Hint>Needed for USD, USDT and other dollar payment methods.</Hint>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="pcr">Credits</Label>
                <Input id="pcr" type="number" min={0} value={edit.credits} onChange={(e) => setEdit({ ...edit, credits: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="ps">Seats</Label>
                <Input id="ps" type="number" min={1} value={edit.seats} onChange={(e) => setEdit({ ...edit, seats: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="po">Order</Label>
                <Input id="po" type="number" value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label htmlFor="pb">Short description</Label>
              <Input id="pb" value={edit.blurb ?? ""} onChange={(e) => setEdit({ ...edit, blurb: e.target.value })} />
            </div>
            <Toggle checked={edit.ai} onChange={(v) => setEdit({ ...edit, ai: v })} label="Include AI features" description="AI message writer and web extractor" />
            <Toggle
              checked={Boolean(edit.api)}
              onChange={(v) => setEdit({ ...edit, api: v })}
              label="Include API and extension"
              description="API keys, webhooks and the Chrome extension"
            />
            <Toggle
              checked={Boolean(edit.outreach)}
              onChange={(v) => setEdit({ ...edit, outreach: v })}
              label="Include email outreach"
              description="Connected mailboxes, sending from the app and sequences"
            />
            <Toggle
              checked={Boolean(edit.whiteLabel)}
              onChange={(v) => setEdit({ ...edit, whiteLabel: v })}
              label="Include white-label"
              description="The customer can run the app on their own domain with their brand"
            />
            <div>
              <Label htmlFor="plv">Card payment variant ID (optional)</Label>
              <Input id="plv" value={edit.lsVariantId ?? ""} onChange={(e) => setEdit({ ...edit, lsVariantId: e.target.value })} placeholder="From your Lemon Squeezy product" />
              <Hint>Needs LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID in .env. Leave empty for manual payments only.</Hint>
            </div>
            <Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Show this plan" description="Hidden plans stay on for people who have them" />
            <div className="flex gap-2">
              <Button type="submit">Save plan</Button>
              <Button type="button" variant="ghost" onClick={() => setEdit(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}

// ---------- Features ----------
function FeatureControl() {
  const [d, setD] = useState<{
    features: { key: string; label: string }[];
    config: Record<string, { on: boolean; plans: string[] }>;
    plans: { id: string; name: string }[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api<typeof d>("/api/admin/features").then(setD);
  }, []);
  if (!d) return <div className="h-40 animate-pulse rounded-panel bg-surface" />;
  const columns = [{ id: "free", name: "Free" }, ...d.plans];
  const get = (k: string) => d.config[k] ?? { on: true, plans: [] };
  const set = (k: string, v: { on: boolean; plans: string[] }) => setD({ ...d, config: { ...d.config, [k]: v } });

  return (
    <Panel>
      <PanelHeader
        title="Features"
        description="Choose what customers see. Turn a feature off for everyone, or show it only on some plans. You always see everything."
        action={
          <Button
            size="sm"
            loading={saving}
            onClick={async () => {
              setSaving(true);
              if (await api("/api/admin/features", { method: "PATCH", body: JSON.stringify({ config: d.config }) })) toast.success("Saved. Customers see the change on their next page load.");
              setSaving(false);
            }}
          >
            Save
          </Button>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[13px] text-muted">
              <th className="px-5 py-3 font-medium">Feature</th>
              <th className="px-3 py-3 font-medium">On</th>
              {columns.map((p) => (
                <th key={p.id} className="px-3 py-3 text-center font-medium">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {d.features.map((f) => {
              const c = get(f.key);
              const everyPlan = c.plans.length === 0;
              return (
                <tr key={f.key} className={c.on ? "" : "opacity-60"}>
                  <td className="px-5 py-3 font-medium">{f.label}</td>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={c.on} onChange={(e) => set(f.key, { ...c, on: e.target.checked })} className="accent-[rgb(var(--pin))]" aria-label={`${f.label} on`} />
                  </td>
                  {columns.map((p) => (
                    <td key={p.id} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        disabled={!c.on}
                        checked={everyPlan || c.plans.includes(p.id)}
                        onChange={(e) => {
                          const current = everyPlan ? columns.map((x) => x.id) : c.plans;
                          const next = e.target.checked ? [...current, p.id] : current.filter((x) => x !== p.id);
                          set(f.key, { ...c, plans: next.length === columns.length ? [] : next });
                        }}
                        className="accent-[rgb(var(--pin))]"
                        aria-label={`${f.label} on ${p.name}`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ---------- Payment methods ----------
type PM = {
  id: string;
  name: string;
  kind: string;
  currency: string;
  network: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
  details: string | null;
  qrImage: string | null;
  active: boolean;
  sort: number;
};
const EMPTY_PM: PM = { id: "", name: "", kind: "BANK", currency: "PKR", network: null, accountTitle: "", accountNumber: "", details: "", qrImage: null, active: true, sort: 0 };

function readImage(file: File, max: number): Promise<string | null> {
  return new Promise((resolve) => {
    if (file.size > max) {
      toast.error(`That image is too big. Keep it under ${Math.round(max / 1000)} KB.`);
      return resolve(null);
    }
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

function PaymentMethods() {
  const [list, setList] = useState<PM[] | null>(null);
  const [edit, setEdit] = useState<PM | null>(null);
  const load = () => api<{ methods: PM[] }>("/api/admin/payment-methods").then((b) => setList(b?.methods ?? []));
  useEffect(() => {
    load();
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const b = await api(edit.id ? `/api/admin/payment-methods/${edit.id}` : "/api/admin/payment-methods", {
      method: edit.id ? "PATCH" : "POST",
      body: JSON.stringify(edit),
    });
    if (b) {
      toast.success("Saved.");
      setEdit(null);
      load();
    }
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Panel>
        <PanelHeader
          title="Payment methods"
          description="What customers see on the Billing page. Bank, mobile wallets, dollars and crypto. You confirm each payment yourself."
          action={
            <Button size="sm" variant="secondary" onClick={() => setEdit({ ...EMPTY_PM })}>
              Add method
            </Button>
          }
        />
        {list?.length === 0 && <p className="px-5 py-8 text-sm text-muted">No methods yet, so Billing shows your payment instructions text from Settings.</p>}
        <ul className="divide-y divide-line">
          {list?.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <button onClick={() => setEdit(m)} className="min-w-0 text-left">
                <p className="font-medium">
                  {m.name} {!m.active && <Badge>Hidden</Badge>}
                </p>
                <p className="truncate text-[13px] text-muted">
                  {m.kind.toLowerCase()} · {m.currency}
                  {m.network ? ` · ${m.network}` : ""} {m.accountNumber ? `· ${m.accountNumber}` : ""}
                </p>
              </button>
              <button
                onClick={async () => {
                  if (confirm(`Delete ${m.name}?`) && (await api(`/api/admin/payment-methods/${m.id}`, { method: "DELETE" }))) load();
                }}
                className="text-[13px] text-muted hover:text-danger"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      {edit && (
        <Panel>
          <form onSubmit={save} className="space-y-4 p-5">
            <h2 className="text-[15px] font-semibold">{edit.id ? `Edit ${edit.name}` : "New payment method"}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pm-kind">Type</Label>
                <Select
                  id="pm-kind"
                  value={edit.kind}
                  onChange={(e) => {
                    const kind = e.target.value;
                    setEdit({ ...edit, kind, currency: kind === "CRYPTO" ? "USDT" : edit.currency, network: kind === "CRYPTO" ? edit.network ?? "TRC20" : null });
                  }}
                >
                  <option value="BANK">Bank account</option>
                  <option value="WALLET">Mobile wallet (JazzCash, Easypaisa…)</option>
                  <option value="CRYPTO">Crypto</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="pm-cur">Currency</Label>
                <Input id="pm-cur" value={edit.currency} onChange={(e) => setEdit({ ...edit, currency: e.target.value.toUpperCase() })} placeholder="PKR, USD, USDT" />
              </div>
            </div>
            <div>
              <Label htmlFor="pm-name">Name customers see</Label>
              <Input id="pm-name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder={edit.kind === "CRYPTO" ? "USDT (TRC20)" : "Meezan Bank"} required />
            </div>
            {edit.kind === "CRYPTO" && (
              <div>
                <Label htmlFor="pm-net">Network</Label>
                <Select id="pm-net" value={edit.network ?? "TRC20"} onChange={(e) => setEdit({ ...edit, network: e.target.value })}>
                  {["TRC20", "BEP20", "ERC20", "Polygon", "Solana", "Bitcoin"].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {edit.kind !== "CRYPTO" && (
              <div>
                <Label htmlFor="pm-title">Account title</Label>
                <Input id="pm-title" value={edit.accountTitle ?? ""} onChange={(e) => setEdit({ ...edit, accountTitle: e.target.value })} />
              </div>
            )}
            <div>
              <Label htmlFor="pm-acc">{edit.kind === "CRYPTO" ? "Wallet address" : edit.kind === "BANK" ? "Account number or IBAN" : "Number or account"}</Label>
              <Input id="pm-acc" value={edit.accountNumber ?? ""} onChange={(e) => setEdit({ ...edit, accountNumber: e.target.value })} className="font-mono text-[13px]" />
            </div>
            <div>
              <Label htmlFor="pm-det">Extra instructions</Label>
              <Textarea id="pm-det" rows={3} value={edit.details ?? ""} onChange={(e) => setEdit({ ...edit, details: e.target.value })} placeholder="Branch, SWIFT code, or 'add your email in the payment note'" />
            </div>
            <div>
              <Label>QR code (optional)</Label>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {edit.qrImage && <img src={edit.qrImage} alt="QR" className="h-16 w-16 rounded bg-white p-1" />}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const d = await readImage(f, 300_000);
                    if (d) setEdit({ ...edit, qrImage: d });
                  }}
                  className="text-[13px]"
                />
                {edit.qrImage && (
                  <button type="button" onClick={() => setEdit({ ...edit, qrImage: null })} className="text-[13px] text-muted hover:text-danger">
                    Remove
                  </button>
                )}
              </div>
            </div>
            <Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Show on Billing" />
            <p className="text-[12px] text-muted">
              For a method in another currency (USD, USDT), set each plan's “Price in US dollars” in the Plans tab, or it won't be offered for that plan.
            </p>
            <div className="flex gap-2">
              <Button type="submit">Save</Button>
              <Button type="button" variant="ghost" onClick={() => setEdit(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}

// ---------- Website, branding and SEO ----------
function ImageSetting({ kind, label, hint, isSet, max, onDone }: { kind: string; label: string; hint: string; isSet: boolean; max: number; onDone: () => void }) {
  const [v, setV] = useState(0);
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-3">
        {isSet && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/brand/${kind}?v=${v}`} alt="" className="h-12 max-w-[160px] rounded border border-line bg-white object-contain p-1" />
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/gif"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const d = await readImage(f, max);
            if (!d) return;
            if (await api("/api/admin/upload", { method: "POST", body: JSON.stringify({ kind, dataUrl: d }) })) {
              toast.success(`${label} updated.`);
              setV((x) => x + 1);
              onDone();
            }
          }}
          className="text-[13px]"
        />
        {isSet && (
          <button
            type="button"
            onClick={async () => {
              if (await api("/api/admin/upload", { method: "POST", body: JSON.stringify({ kind, dataUrl: "" }) })) onDone();
            }}
            className="text-[13px] text-muted hover:text-danger"
          >
            Remove
          </button>
        )}
      </div>
      <Hint>{hint}</Hint>
    </div>
  );
}

function WebsiteSettings() {
  const [s, setS] = useState<Record<string, string> | null>(null);
  const load = () => api<{ settings: Record<string, string> }>("/api/admin/settings").then((b) => setS(b?.settings ?? null));
  useEffect(() => {
    load();
  }, []);
  if (!s) return <div className="h-40 animate-pulse rounded-panel bg-surface" />;
  const f = (k: string) => ({ value: s[k] ?? "", onChange: (e: { target: { value: string } }) => setS({ ...s, [k]: e.target.value }) });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (await api("/api/admin/settings", { method: "PATCH", body: JSON.stringify(s) })) toast.success("Saved. Refresh any page to see it.");
  }
  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <Panel className="space-y-4 p-6">
        <h2 className="text-[15px] font-semibold">Brand</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <div>
            <Label htmlFor="w-name">Platform name</Label>
            <Input id="w-name" {...f("platform_name")} />
          </div>
          <div>
            <Label htmlFor="w-col">Main colour</Label>
            <div className="flex gap-2">
              <input type="color" value={s.platform_color || "#9A6700"} onChange={(e) => setS({ ...s, platform_color: e.target.value })} className="h-10 w-10 shrink-0 rounded-control border border-line" aria-label="Pick colour" />
              <Input id="w-col" {...f("platform_color")} placeholder="default" className="font-mono text-[13px]" />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="w-tag">Tagline (subtitle)</Label>
          <Input id="w-tag" {...f("platform_tagline")} />
        </div>
        <ImageSetting kind="logo" label="Logo" hint="Shown in the sidebar, sign-in pages and website header. PNG or SVG, wide, under 300 KB." isSet={Boolean(s.platform_logo)} max={300_000} onDone={load} />
        <ImageSetting kind="favicon" label="Favicon (browser tab icon)" hint="Square PNG, SVG or ICO, 64 to 512 px, under 100 KB." isSet={Boolean(s.platform_favicon)} max={100_000} onDone={load} />
      </Panel>

      <Panel className="space-y-4 p-6">
        <h2 className="text-[15px] font-semibold">Search engines and sharing (SEO)</h2>
        <div>
          <Label htmlFor="w-st">Page title</Label>
          <Input id="w-st" {...f("seo_title")} placeholder={`${s.platform_name}: lead generation for agencies`} />
          <Hint>Shown in the browser tab and as the headline on Google. 50 to 60 characters works best.</Hint>
        </div>
        <div>
          <Label htmlFor="w-sd">Description</Label>
          <Textarea id="w-sd" rows={3} {...f("seo_description")} />
          <Hint>Shown under the title on Google and in link previews. About 150 characters.</Hint>
        </div>
        <div>
          <Label htmlFor="w-sk">Keywords (comma separated)</Label>
          <Input id="w-sk" {...f("seo_keywords")} />
        </div>
        <ImageSetting kind="og" label="Share image" hint="Shown when your link is shared on WhatsApp, Facebook or X. 1200 x 630 px, under 1 MB." isSet={Boolean(s.og_image)} max={1_000_000} onDone={load} />
      </Panel>

      <Panel className="space-y-4 p-6">
        <h2 className="text-[15px] font-semibold">Home page</h2>
        <div>
          <Label htmlFor="w-ht">Headline</Label>
          <Input id="w-ht" {...f("hero_title")} />
        </div>
        <div>
          <Label htmlFor="w-hs">Sub-headline</Label>
          <Textarea id="w-hs" rows={2} {...f("hero_subtitle")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="w-cta">Button text</Label>
            <Input id="w-cta" {...f("landing_cta")} />
          </div>
          <div>
            <Label htmlFor="w-foot">Footer text</Label>
            <Input id="w-foot" {...f("landing_footer")} placeholder="Made in Lahore" />
          </div>
        </div>
        <div>
          <Label htmlFor="w-steps">How it works (one step per line: Title | Text)</Label>
          <Textarea id="w-steps" rows={4} {...f("landing_steps")} className="font-mono text-[12px]" />
        </div>
        <div>
          <Label htmlFor="w-feat">Features (one per line)</Label>
          <Textarea id="w-feat" rows={6} {...f("landing_features")} className="font-mono text-[12px]" />
        </div>
        <div>
          <Label htmlFor="w-faq">Questions (one per line: Question | Answer)</Label>
          <Textarea id="w-faq" rows={5} {...f("landing_faq")} className="font-mono text-[12px]" />
        </div>
        <Toggle checked={s.landing_show_pricing === "1"} onChange={(v) => setS({ ...s, landing_show_pricing: v ? "1" : "0" })} label="Show pricing on the home page" />
      </Panel>
      <div className="flex gap-3">
        <Button type="submit">Save website</Button>
        <a href="/" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-control border border-line px-4 text-sm">
          View home page (signed out)
        </a>
      </div>
    </form>
  );
}

// ---------- Coupons ----------
type CouponRow = {
  id: string;
  code: string;
  percent: number;
  amount: number;
  planId: string | null;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  active: boolean;
};

function Coupons() {
  const [rows, setRows] = useState<CouponRow[] | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [f, setF] = useState({ code: "", kind: "percent", value: "20", planId: "", maxUses: "", expiresAt: "" });
  const load = () => api<{ coupons: CouponRow[] }>("/api/admin/coupons").then((b) => setRows(b?.coupons ?? []));
  useEffect(() => {
    load();
    api<{ plans: PlanRow[] }>("/api/admin/plans").then((b) => setPlans(b?.plans ?? []));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const b = await api("/api/admin/coupons", {
      method: "POST",
      body: JSON.stringify({
        code: f.code,
        percent: f.kind === "percent" ? Number(f.value) : 0,
        amount: f.kind === "amount" ? Number(f.value) : 0,
        planId: f.planId || null,
        maxUses: f.maxUses || null,
        expiresAt: f.expiresAt || null,
      }),
    });
    if (b) {
      toast.success("Coupon created.");
      setF({ ...f, code: "" });
      load();
    }
  }

  const planName = (id: string | null) => (id ? plans.find((p) => p.id === id)?.name ?? "one plan" : "any plan");

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Panel>
        <PanelHeader title="Coupons" description="Customers enter these on the Billing page. Uses count when you approve the payment." />
        {rows?.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">No coupons yet.</p>}
        <ul className="divide-y divide-line">
          {rows?.map((c) => {
            const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-mono font-medium">
                    {c.code} {!c.active && <Badge>Off</Badge>} {expired && <Badge tone="danger">Expired</Badge>}
                  </p>
                  <p className="text-[13px] text-muted">
                    {c.percent ? `${c.percent}% off` : `${formatNumber(c.amount)} off`} {planName(c.planId)}, used {c.uses}
                    {c.maxUses ? ` of ${c.maxUses}` : ""}
                    {c.expiresAt ? `, until ${new Date(c.expiresAt).toLocaleDateString("en-GB")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      if (await api(`/api/admin/coupons/${c.id}`, { method: "PATCH", body: JSON.stringify({ active: !c.active }) })) load();
                    }}
                  >
                    {c.active ? "Turn off" : "Turn on"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (confirm(`Delete ${c.code}?`) && (await api(`/api/admin/coupons/${c.id}`, { method: "DELETE" }))) load();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel>
        <form onSubmit={create} className="space-y-4 p-5">
          <h2 className="text-[15px] font-semibold">New coupon</h2>
          <div>
            <Label htmlFor="cc">Code</Label>
            <Input id="cc" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="LAUNCH20" className="font-mono" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ck">Discount</Label>
              <Select id="ck" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                <option value="percent">Percent off</option>
                <option value="amount">Fixed amount off</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="cv">{f.kind === "percent" ? "Percent" : "Amount"}</Label>
              <Input id="cv" type="number" min={1} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} required />
            </div>
          </div>
          <div>
            <Label htmlFor="cp">Works on</Label>
            <Select id="cp" value={f.planId} onChange={(e) => setF({ ...f, planId: e.target.value })}>
              <option value="">Any plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cm">Max uses</Label>
              <Input id="cm" type="number" min={1} value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} placeholder="Unlimited" />
            </div>
            <div>
              <Label htmlFor="ce">Ends on</Label>
              <Input id="ce" type="date" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} className="[color-scheme:dark]" />
            </div>
          </div>
          <Button type="submit">Create coupon</Button>
        </form>
      </Panel>
    </div>
  );
}

// ---------- Activity log ----------
function ActivityLog() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<{ id: string; actorEmail: string; action: string; detail: string | null; createdAt: string }[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      api<{ entries: { id: string; actorEmail: string; action: string; detail: string | null; createdAt: string }[] }>(
        `/api/admin/audit?q=${encodeURIComponent(q)}`,
      ).then((b) => setRows(b?.entries ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <Panel>
      <PanelHeader title="Activity log" description="Every admin action: approvals, edits, sign-ins as a customer, plan and setting changes." />
      <div className="border-b border-line p-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions, emails, details" className="max-w-sm" />
      </div>
      {rows?.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">Nothing logged yet.</p>}
      <ul className="divide-y divide-line">
        {rows?.map((r) => (
          <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="font-mono text-[12px] text-pin">{r.action}</span> <span className="text-muted">{r.detail}</span>
            </span>
            <span className="shrink-0 text-[12px] text-muted">
              {r.actorEmail}, {timeAgo(r.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------- System ----------
type Health = {
  engine: boolean;
  smtp: boolean;
  ai: boolean;
  cronSecretSet: boolean;
  lastTick: string | null;
  enrichRunning: boolean;
  searches: number;
  enrichQueue: number;
  enrichFailed: number;
  outboxQueued: number;
  outboxFailed: number;
  sentToday: number;
  pausedBoxes: number;
  dbBytes: number;
  leads: number;
  users: number;
  uptimeSeconds: number;
  memoryMb: number;
  nodeVersion: string;
};

function SystemHealth() {
  const [h, setH] = useState<Health | null>(null);
  const load = useCallback(() => {
    api<Health>("/api/admin/health").then(setH);
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);
  if (!h) return <div className="h-40 animate-pulse rounded-panel bg-surface" />;

  const tickAgo = h.lastTick ? Math.round((Date.now() - new Date(h.lastTick).getTime()) / 60000) : null;
  const checks: { label: string; ok: boolean; detail: string }[] = [
    { label: "Scraping engine", ok: h.engine, detail: h.engine ? "Online" : "Not reachable. Start it with go run main.go (or check the engine container)." },
    {
      label: "Background jobs",
      ok: tickAgo != null && tickAgo <= 10,
      detail: tickAgo == null ? "Haven't run since the app started." : `Last ran ${tickAgo} min ago${h.cronSecretSet ? "" : ". Set CRON_SECRET on the server so they run around the clock."}`,
    },
    { label: "Platform email (SMTP)", ok: h.smtp, detail: h.smtp ? "Connected" : "Not set up. Emails are printed in the terminal." },
    { label: "AI features", ok: h.ai, detail: h.ai ? "API key set" : "No ANTHROPIC_API_KEY, AI buttons are hidden." },
    { label: "Customer mailboxes", ok: h.pausedBoxes === 0, detail: h.pausedBoxes ? `${h.pausedBoxes} paused after sign-in errors` : "All fine" },
  ];
  const fmtBytes = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(2)} GB` : `${(b / 1e6).toFixed(1)} MB`);

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader title="Health" description="Refreshes every 20 seconds." />
        <ul className="divide-y divide-line">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3 px-5 py-3 text-sm">
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", c.ok ? "bg-ok" : "bg-danger")} aria-hidden />
              <span className="min-w-0">
                <span className="font-medium">{c.label}</span>
                <span className="block text-[13px] text-muted">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="grid divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {[
          ["Searches running", h.searches, ""],
          ["Website checks waiting", h.enrichQueue, h.enrichFailed ? `${h.enrichFailed} failed today` : h.enrichRunning ? "worker running" : ""],
          ["Emails waiting", h.outboxQueued, `${h.sentToday} sent today${h.outboxFailed ? `, ${h.outboxFailed} failed` : ""}`],
          ["Database", h.dbBytes, `${formatNumber(h.leads)} leads, ${formatNumber(h.users)} people`],
        ].map(([label, value, sub]) => (
          <div key={String(label)} className="p-5">
            <p className="text-[13px] text-muted">{label}</p>
            <p className="tabular mt-1 text-2xl font-semibold">{label === "Database" ? fmtBytes(Number(value)) : formatNumber(Number(value))}</p>
            {sub && <p className="text-[12px] text-muted">{sub}</p>}
          </div>
        ))}
      </Panel>

      <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-[15px] font-semibold">Database backup</h2>
          <p className="mt-1 text-sm text-muted">
            Download a full copy now. Keep it somewhere safe: it holds every customer's data. Servers also keep a daily copy for 14 days.
          </p>
          <p className="mt-1 text-[12px] text-muted">
            Up {Math.round(h.uptimeSeconds / 3600)} h, {h.memoryMb} MB memory, Node {h.nodeVersion}
          </p>
        </div>
        <a href="/api/admin/backup" className="inline-flex h-10 items-center rounded-control border border-line bg-raised px-4 text-sm hover:border-muted/50">
          Download backup
        </a>
      </Panel>
    </div>
  );
}

// ---------- Support ----------
type Ticket = {
  id: string;
  subject: string;
  status: string;
  updatedAt: string;
  user: { name: string; email: string } | null;
  messages: { id: string; sender: string; body: string; createdAt: string }[];
};

function SupportTab() {
  const [status, setStatus] = useState("OPEN");
  const [list, setList] = useState<Ticket[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const load = useCallback(() => {
    api<{ tickets: Ticket[] }>(`/api/admin/support?status=${status}`).then((b) => setList(b?.tickets ?? []));
  }, [status]);
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);
  const t = list?.find((x) => x.id === openId) ?? null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
      <Panel>
        <PanelHeader
          title="Support"
          action={
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 w-auto text-[13px]">
              <option value="OPEN">Waiting for us</option>
              <option value="ANSWERED">Answered</option>
              <option value="AI">With the AI only</option>
              <option value="CLOSED">Closed</option>
              <option value="ALL">All</option>
            </Select>
          }
        />
        {list?.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Nothing here.</p>}
        <ul className="divide-y divide-line">
          {list?.map((x) => (
            <li key={x.id}>
              <button onClick={() => setOpenId(x.id)} className={cn("block w-full px-4 py-3 text-left hover:bg-raised/40", openId === x.id && "bg-raised")}>
                <p className="truncate text-sm font-medium">{x.subject}</p>
                <p className="text-[12px] text-muted">
                  {x.user?.name ?? "Unknown"} · {timeAgo(x.updatedAt)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      {t ? (
        <Panel className="flex flex-col">
          <PanelHeader
            title={t.subject}
            description={`${t.user?.name ?? ""} ${t.user?.email ?? ""}`}
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (await api("/api/admin/support", { method: "POST", body: JSON.stringify({ ticketId: t.id, close: true }) })) load();
                }}
              >
                Close
              </Button>
            }
          />
          <div className="max-h-[420px] space-y-2 overflow-y-auto p-4 text-[13px]">
            {t.messages.map((m) => (
              <div key={m.id} className={cn("flex", m.sender === "USER" ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[80%] whitespace-pre-line rounded-panel px-3 py-2", m.sender === "USER" ? "bg-raised" : m.sender === "TEAM" ? "bg-ok/10" : "bg-night/40 text-muted")} dir="auto">
                  <span className="mb-0.5 block text-[11px] font-semibold">{m.sender === "USER" ? "Customer" : m.sender === "TEAM" ? "You" : "AI assistant"}</span>
                  {m.body}
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await api("/api/admin/support", { method: "POST", body: JSON.stringify({ ticketId: t.id, body: reply }) })) {
                setReply("");
                load();
              }
            }}
            className="flex gap-2 border-t border-line p-3"
          >
            <Textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the customer" className="text-[13px]" dir="auto" />
            <Button type="submit" disabled={!reply.trim()}>
              Send
            </Button>
          </form>
        </Panel>
      ) : (
        <Panel className="p-10 text-center text-sm text-muted">Choose a conversation.</Panel>
      )}
    </div>
  );
}

// ---------- Errors ----------
type ErrRow = { id: string; source: string; message: string; stack: string | null; path: string | null; count: number; resolved: boolean; firstSeen: string; lastSeen: string };

function ErrorsTab() {
  const [show, setShow] = useState("open");
  const [rows, setRows] = useState<ErrRow[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const load = useCallback(() => {
    api<{ errors: ErrRow[] }>(`/api/admin/errors?show=${show}`).then((b) => setRows(b?.errors ?? []));
  }, [show]);
  useEffect(load, [load]);
  const copy = (e: ErrRow) =>
    navigator.clipboard
      .writeText(`${e.source} error on ${e.path ?? "?"} (${e.count}x, last ${e.lastSeen})\n${e.message}\n\n${e.stack ?? ""}`)
      .then(() => toast.success("Copied. Paste it to your developer or into the chat."));

  return (
    <Panel>
      <PanelHeader
        title="Errors"
        description="Crashes the app caught by itself, in the browser and on the server. The same error is counted, not repeated."
        action={
          <div className="flex items-center gap-2">
            <Select value={show} onChange={(e) => setShow(e.target.value)} className="h-8 w-auto text-[13px]">
              <option value="open">Not fixed</option>
              <option value="all">All</option>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                if (await api("/api/admin/errors", { method: "POST", body: JSON.stringify({ all: true }) })) load();
              }}
            >
              Mark all fixed
            </Button>
          </div>
        }
      />
      {rows?.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">No errors. Good sign.</p>}
      <ul className="divide-y divide-line">
        {rows?.map((e) => (
          <li key={e.id} className="px-5 py-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button onClick={() => setOpenId(openId === e.id ? null : e.id)} className="min-w-0 text-left">
                <p className="font-medium">
                  <Badge tone={e.source === "SERVER" ? "danger" : "pin"}>{e.source === "SERVER" ? "Server" : "Browser"}</Badge> {e.message}
                </p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {e.path ?? "unknown page"} · {e.count}x · last {timeAgo(e.lastSeen)} · first {timeAgo(e.firstSeen)}
                </p>
              </button>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="ghost" onClick={() => copy(e)}>
                  Copy
                </Button>
                {!e.resolved && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      if (await api("/api/admin/errors", { method: "POST", body: JSON.stringify({ id: e.id }) })) load();
                    }}
                  >
                    Fixed
                  </Button>
                )}
              </div>
            </div>
            {openId === e.id && e.stack && <pre className="mt-2 max-h-60 overflow-auto rounded-control bg-night/60 p-3 text-[11px] leading-4">{e.stack}</pre>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------- Self-test and maintenance ----------
function SelfTest() {
  const [checks, setChecks] = useState<{ name: string; ok: boolean | null; detail: string; fix?: string }[] | null>(null);
  const [running, setRunning] = useState(false);
  async function run() {
    setRunning(true);
    const b = await api<{ checks: typeof checks }>("/api/admin/diagnostics");
    setRunning(false);
    if (b) setChecks(b.checks);
  }
  const failed = checks?.filter((c) => c.ok === false).length ?? 0;
  return (
    <Panel>
      <PanelHeader
        title="Self-test"
        description="Checks every part of the system in about 30 seconds and tells you what to fix."
        action={
          <Button size="sm" onClick={run} loading={running}>
            {checks ? "Run again" : "Run self-test"}
          </Button>
        }
      />
      {checks && (
        <>
          <p className={cn("px-5 pt-3 text-sm font-medium", failed ? "text-danger" : "text-ok")}>
            {failed ? `${failed} problem${failed > 1 ? "s" : ""} found` : "Everything required is working."}
          </p>
          <ul className="divide-y divide-line">
            {checks.map((c) => (
              <li key={c.name} className="flex items-start gap-3 px-5 py-2.5 text-sm">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", c.ok === true ? "bg-ok" : c.ok === false ? "bg-danger" : "bg-muted")} aria-hidden />
                <span className="min-w-0">
                  <span className="font-medium">{c.name}</span>
                  <span className="block text-[13px] text-muted">{c.detail}</span>
                  {c.ok === false && c.fix && <span className="block text-[13px] text-pin">Fix: {c.fix}</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

function Maintenance() {
  const [old, setOld] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => api<{ old: Record<string, number> }>("/api/admin/maintenance").then((b) => setOld(b?.old ?? null));
  useEffect(() => {
    load();
  }, []);
  const total = old ? Object.values(old).reduce((a, b) => a + b, 0) : 0;
  return (
    <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <h2 className="text-[15px] font-semibold">Maintenance</h2>
        <p className="mt-1 text-sm text-muted">
          {old
            ? `${formatNumber(total)} old records can be cleared: notifications over 90 days, finished emails over a year, rank checks over 6 months, fixed errors and old logs. Leads are never touched.`
            : "Loading…"}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          loading={busy === "cleanup"}
          disabled={!total}
          onClick={async () => {
            if (!confirm(`Delete ${total} old records? Download a backup first if you want to keep them.`)) return;
            setBusy("cleanup");
            const b = await api<{ deleted: number }>("/api/admin/maintenance", { method: "POST", body: JSON.stringify({ action: "cleanup" }) });
            setBusy(null);
            if (b) toast.success(`Cleared ${b.deleted} records.`);
            load();
          }}
        >
          Clear old records
        </Button>
        <Button
          variant="secondary"
          loading={busy === "optimize"}
          onClick={async () => {
            setBusy("optimize");
            const b = await api("/api/admin/maintenance", { method: "POST", body: JSON.stringify({ action: "optimize" }) });
            setBusy(null);
            if (b) toast.success("Database optimised.");
          }}
        >
          Optimise database
        </Button>
      </div>
    </Panel>
  );
}

// ---------- Settings ----------
function PlatformSettings() {
  const [s, setS] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    api<{ settings: Record<string, string> }>("/api/admin/settings").then((b) => setS(b?.settings ?? null));
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (await api("/api/admin/settings", { method: "PATCH", body: JSON.stringify(s) })) toast.success("Settings saved.");
  }
  if (!s) return <div className="h-40 animate-pulse rounded-panel bg-surface" />;
  return (
    <div className="max-w-2xl space-y-6">
    <EmailStatus />
    <Panel>
      <form onSubmit={save} className="space-y-5 p-6">
        <div className="space-y-3 rounded-control border border-line p-4">
          <p className="text-[15px] font-semibold">Support assistant</p>
          <Toggle
            checked={s.support_ai === "1"}
            onChange={(v) => setS({ ...s, support_ai: v ? "1" : "0" })}
            label="AI answers first"
            description="When off, every message goes straight to you. Needs ANTHROPIC_API_KEY."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="sbn">Assistant name</Label>
              <Input id="sbn" value={s.support_bot_name} onChange={(e) => setS({ ...s, support_bot_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="sgr">First message</Label>
              <Input id="sgr" value={s.support_greeting} onChange={(e) => setS({ ...s, support_greeting: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="skb">What the assistant knows</Label>
            <Textarea id="skb" rows={6} value={s.support_kb} onChange={(e) => setS({ ...s, support_kb: e.target.value })} />
            <Hint>Prices, payment and refund rules, approval times, common problems and fixes. It answers only from this and the built-in app guide, and passes anything else to you.</Hint>
          </div>
        </div>
        <div>
          <Label htmlFor="pi">Payment instructions</Label>
          <Textarea id="pi" rows={8} value={s.payment_instructions} onChange={(e) => setS({ ...s, payment_instructions: e.target.value })} />
          <Hint>Customers see this on the Billing page. Put your JazzCash, Easypaisa and bank details here.</Hint>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sw">Support WhatsApp number</Label>
            <Input id="sw" value={s.support_whatsapp} onChange={(e) => setS({ ...s, support_whatsapp: e.target.value })} placeholder="923001234567" />
            <Hint>Used on the forgot-password page and the website.</Hint>
          </div>
          <div>
            <Label htmlFor="sc">Free credits on signup</Label>
            <Input id="sc" type="number" min={0} value={s.signup_credits} onChange={(e) => setS({ ...s, signup_credits: e.target.value })} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="rc">Referral reward (credits)</Label>
            <Input id="rc" type="number" min={0} value={s.referral_credits} onChange={(e) => setS({ ...s, referral_credits: e.target.value })} />
            <Hint>Given when someone a customer invited starts a paid plan. 0 turns referrals off.</Hint>
          </div>
          <div>
            <Label htmlFor="if">Your details on invoices</Label>
            <Textarea id="if" rows={4} value={s.invoice_from} onChange={(e) => setS({ ...s, invoice_from: e.target.value })} />
          </div>
        </div>
        <div>
          <Label htmlFor="pp">Privacy policy</Label>
          <Textarea id="pp" rows={8} value={s.privacy_policy} onChange={(e) => setS({ ...s, privacy_policy: e.target.value })} />
          <Hint>Shown at /privacy. Have a lawyer check it before you sell.</Hint>
        </div>
        <div>
          <Label htmlFor="tos">Terms of service</Label>
          <Textarea id="tos" rows={8} value={s.terms_of_service} onChange={(e) => setS({ ...s, terms_of_service: e.target.value })} />
          <Hint>Shown at /terms. New users agree to it when they sign up.</Hint>
        </div>
        <Button type="submit">Save settings</Button>
      </form>
    </Panel>
    </div>
  );
}

function EmailStatus() {
  const [st, setSt] = useState<{ ready: boolean; host: string | null; from: string | null } | null>(null);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    api<{ ready: boolean; host: string | null; from: string | null }>("/api/admin/test-email").then(setSt);
  }, []);
  async function test() {
    setSending(true);
    const b = await api<{ to: string }>("/api/admin/test-email", { method: "POST" });
    setSending(false);
    if (b) toast.success(`Test email sent to ${b.to}. Check the inbox and spam folder.`);
  }
  if (!st) return null;
  return (
    <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          Email (SMTP) <Badge tone={st.ready ? "ok" : "neutral"}>{st.ready ? "Connected" : "Not set up"}</Badge>
        </h2>
        <p className="mt-1 text-sm text-muted">
          {st.ready
            ? `Sending through ${st.host} as ${st.from ?? "your SMTP user"}.`
            : "Add SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM to .env, then restart. Until then, emails are printed in the terminal."}
        </p>
      </div>
      <Button variant="secondary" onClick={test} loading={sending} disabled={!st.ready}>
        Send a test email
      </Button>
    </Panel>
  );
}

export function AdminView() {
  const [tab, setTab] = useState<Tab>("Overview");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if ((TABS as readonly string[]).includes(t ?? "")) setTab(t as Tab);
  }, []);
  return (
    <>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm",
              tab === t ? "border-pin font-medium text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && <Overview go={setTab} />}
      {tab === "Payments" && <Payments />}
      {tab === "Support" && <SupportTab />}
      {tab === "Users" && <Users />}
      {tab === "Leads" && <AdminLeads />}
      {tab === "Plans" && <Plans />}
      {tab === "Features" && <FeatureControl />}
      {tab === "Payment methods" && <PaymentMethods />}
      {tab === "Website" && <WebsiteSettings />}
      {tab === "Coupons" && <Coupons />}
      {tab === "Activity log" && <ActivityLog />}
      {tab === "Errors" && <ErrorsTab />}
      {tab === "System" && (
        <div className="space-y-6">
          <SelfTest />
          <SystemHealth />
          <Maintenance />
        </div>
      )}
      {tab === "Settings" && <PlatformSettings />}
    </>
  );
}
