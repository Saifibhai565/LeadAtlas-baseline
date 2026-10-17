import Link from "next/link";
import { Building2, Check, Mail, Phone, Globe2, Terminal } from "lucide-react";
import { HeroBanner } from "@/components/hero-banner";
import { StatsPanel } from "@/components/stats-panel";
import { SIGNAL_INFO } from "@/lib/signals";
import { JobStatusBadge } from "@/components/status-badge";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rescoreMissing } from "@/lib/leads";
import { refreshOncePerStart } from "@/lib/signals-server";
import { formatNumber, timeAgo } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  await rescoreMissing(user.wsId, 300);
  refreshOncePerStart(user.wsId);
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [total, withPhone, withWebsite, withEmail, thisWeek, recentJobs, topCategories] = await Promise.all([
    db.lead.count({ where: { userId: user.wsId } }),
    db.lead.count({ where: { userId: user.wsId, phone: { not: null } } }),
    db.lead.count({ where: { userId: user.wsId, website: { not: null } } }),
    db.lead.count({ where: { userId: user.wsId, emails: { not: null } } }),
    db.lead.count({ where: { userId: user.wsId, createdAt: { gte: weekAgo } } }),
    db.job.findMany({ where: { userId: user.wsId }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.lead.groupBy({
      by: ["category"],
      where: { userId: user.wsId, category: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
      take: 6,
    }),
  ]);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const [dueLeads, bestLeads] = await Promise.all([
    db.lead.findMany({
      where: { userId: user.wsId, followUpAt: { lte: endOfToday }, status: { notIn: ["WON", "LOST"] } },
      orderBy: { followUpAt: "asc" },
      take: 6,
      select: { id: true, title: true, category: true, followUpAt: true },
    }),
    db.lead.findMany({
      where: { userId: user.wsId, status: "NEW", score: { not: null } },
      orderBy: [{ score: "desc" }, { reviewCount: "desc" }],
      take: 60,
      select: { id: true, title: true, category: true, score: true, website: true, signals: true, rating: true },
    }),
  ]);

  const [profile, searchCount, checkedCount, messageCount] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { offer: true } }),
    db.job.count({ where: { userId: user.wsId } }),
    db.lead.count({ where: { userId: user.wsId, enrichStatus: "DONE" } }),
    db.activity.count({ where: { type: "MESSAGE", lead: { userId: user.wsId } } }),
  ]);
  const steps = [
    { done: Boolean(profile?.offer), label: "Tell us what you sell", href: "/settings", why: "So messages and AI briefs explain your offer." },
    { done: searchCount > 0, label: "Run your first search", href: "/searches", why: "Try one city and one type of business." },
    { done: checkedCount > 0, label: "Check their websites", href: "/enrich", why: "Find out who has no website or a weak one." },
    { done: messageCount > 0, label: "Send your first message", href: "/leads?sort=score&status=NEW", why: "Open your best lead and message them." },
  ];
  const stepsLeft = steps.filter((st) => !st.done).length;

  // Mix categories so the list isn't six of the same kind
  const perCat = new Map<string, number>();
  const bestMixed = bestLeads
    .filter((l) => {
      const c = l.category ?? "";
      const n = perCat.get(c) ?? 0;
      if (n >= 2) return false;
      perCat.set(c, n + 1);
      return true;
    })
    .slice(0, 6);
  const hotCount = await db.lead.count({ where: { userId: user.wsId, status: { in: ["NEW", "CONTACTED"] }, score: { gte: 70 } } });

  const firstName = user.name.split(" ")[0];
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const reach = [
    { label: "Have a phone number", value: withPhone, icon: Phone },
    { label: "Have a website", value: withWebsite, icon: Globe2 },
    { label: "Have an email", value: withEmail, icon: Mail },
  ];

  return (
    <>
      <HeroBanner name={firstName} total={total} week={thisWeek} hot={hotCount} due={dueLeads.length} />
      <StatsPanel isAdmin={user.isAdmin} />

      {stepsLeft > 0 && (
        <Panel className="mb-6 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold">Get set up</h2>
            <p className="tabular text-[13px] text-muted">
              {steps.length - stepsLeft} of {steps.length} done
            </p>
          </div>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((st, i) => (
              <li key={st.label}>
                <Link
                  href={st.href}
                  className={
                    st.done
                      ? "block h-full rounded-control border border-line p-3 opacity-60"
                      : "block h-full rounded-control border border-line p-3 hover:border-pin/50"
                  }
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {st.done ? (
                      <Check className="h-4 w-4 text-ok" aria-hidden />
                    ) : (
                      <span className="tabular grid h-5 w-5 place-items-center rounded-full border border-line text-[11px]">{i + 1}</span>
                    )}
                    {st.label}
                  </span>
                  <span className="mt-1 block text-[13px] text-muted">{st.why}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {total === 0 ? (
        <Panel className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Find your first leads</h2>
          <p className="mt-1 max-w-xl text-muted">
            Searches run on the scraping engine on your computer. Start it once, then run searches from here.
          </p>
          <ol className="mt-6 space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-semibold">1</span>
              <div>
                Open the scraper folder in a terminal and run
                <code className="ml-2 inline-flex items-center gap-1.5 rounded bg-raised px-2 py-0.5 text-pin">
                  <Terminal className="h-3.5 w-3.5" aria-hidden />
                  go run main.go
                </code>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-semibold">2</span>
              <div>Wait for the green “Engine online” dot at the top of this page.</div>
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-semibold">3</span>
              <div>
                Go to <Link href="/searches" className="font-medium text-pin hover:underline">Searches</Link> and try
                something like “dentist in Lahore”.
              </div>
            </li>
          </ol>
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Panel className="p-6">
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <div>
                <p className="text-[13px] text-muted">Leads saved</p>
                <p className="tabular text-[44px] font-semibold leading-none tracking-[-0.02em]">{formatNumber(total)}</p>
              </div>
              <p className="text-sm text-muted">
                <span className="tabular font-medium text-ink">+{formatNumber(thisWeek)}</span> in the last 7 days
              </p>
            </div>

            <div className="mt-8 space-y-4">
              {reach.map(({ label, value, icon: Icon }) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 text-muted">
                      <Icon className="h-4 w-4" aria-hidden />
                      {label}
                    </span>
                    <span className="tabular">
                      {formatNumber(value)} <span className="text-muted">({pct(value)}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-raised">
                    <div className="h-full rounded-full bg-pin" style={{ width: `${pct(value)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Top categories" description="What you've collected the most of" />
            <ul className="divide-y divide-line">
              {topCategories.map((c) => (
                <li key={c.category} className="flex items-center justify-between px-5 py-3 text-sm">
                  <Link
                    href={`/leads?q=${encodeURIComponent(c.category ?? "")}`}
                    className="inline-flex min-w-0 items-center gap-2 hover:text-pin"
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                    <span className="truncate">{c.category}</span>
                  </Link>
                  <span className="tabular text-muted">{formatNumber(c._count._all)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {total > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader
              title="Follow up today"
              description="Leads you planned to get back to"
              action={
                <Link href="/pipeline" className="text-[13px] font-medium text-pin hover:underline">
                  Pipeline
                </Link>
              }
            />
            {dueLeads.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">Nothing due. Set a follow-up date on a lead and it shows up here.</p>
            ) : (
              <ul className="divide-y divide-line">
                {dueLeads.map((l) => {
                  const overdue = l.followUpAt! < new Date(new Date().setHours(0, 0, 0, 0));
                  return (
                    <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{l.title}</p>
                        {l.category && <p className="text-[13px] text-muted">{l.category}</p>}
                      </div>
                      <span className={overdue ? "shrink-0 text-[13px] text-danger" : "shrink-0 text-[13px] text-pin"}>
                        {overdue ? "Overdue" : "Today"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Best leads to contact next"
              description="New leads with the highest score"
              action={
                <Link href="/leads?sort=score&status=NEW" className="text-[13px] font-medium text-pin hover:underline">
                  See all
                </Link>
              }
            />
            {bestMixed.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">Scores appear after your next visit to Leads or Pipeline.</p>
            ) : (
              <ul className="divide-y divide-line">
                {bestMixed.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{l.title}</p>
                      <p className="text-[13px] text-muted">
                        {l.category ?? ""}
                        {l.rating != null && ` · ★ ${l.rating}`}
                        {!l.website && <span className="text-pin"> · no website</span>}
                        {(l.signals ?? "")
                          .split(",")
                          .filter((x) => SIGNAL_INFO[x])
                          .slice(0, 2)
                          .map((x) => (
                            <span key={x} className="text-pin"> · {SIGNAL_INFO[x].label.toLowerCase()}</span>
                          ))}
                      </p>
                    </div>
                    <span className="tabular shrink-0 rounded bg-pin/15 px-2 py-0.5 text-[13px] font-semibold text-pin">{l.score}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <Panel className="mt-6">
        <PanelHeader
          title="Recent searches"
          action={
            <Link href="/searches" className="text-[13px] font-medium text-pin hover:underline">
              View all
            </Link>
          }
        />
        {recentJobs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">No searches yet. Your first one will show up here.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recentJobs.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{j.name}</p>
                  <p className="text-[13px] text-muted">{timeAgo(j.createdAt)}</p>
                </div>
                <div className="flex items-center gap-4">
                  {j.status === "DONE" && (
                    <Link href={`/leads?jobId=${j.id}`} className="tabular text-[13px] text-muted hover:text-pin">
                      {formatNumber(j.newCount)} new leads
                    </Link>
                  )}
                  <JobStatusBadge status={j.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
