"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { SIGNAL_INFO } from "@/lib/signals";
import { cn, formatNumber } from "@/lib/utils";

type Stats = {
  overview: Record<string, number>;
  contacts: Record<string, number>;
  websites: Record<string, number>;
  social: Record<string, number>;
  signals: Record<string, number>;
  reviews: Record<string, number>;
  pipeline: Record<string, number>;
  outreach: Record<string, number>;
  sources: Record<string, number>;
  categories: { name: string; count: number }[];
  cities: { name: string; count: number }[];
};

type Tile = { label: string; value: number; href?: string; tone?: "ok" | "pin" | "danger" | "info"; money?: boolean };

const TABS = ["Overview", "Contacts", "Websites", "Social", "Signals", "Reviews", "Pipeline", "Outreach", "Places"] as const;

function tiles(s: Stats, tab: (typeof TABS)[number]): Tile[] {
  const o = s.overview;
  switch (tab) {
    case "Overview":
      return [
        { label: "Total leads", value: o.total, href: "/leads" },
        { label: "Added today", value: o.today, tone: "ok" },
        { label: "Added this week", value: o.week },
        { label: "Added in 30 days", value: o.month },
        { label: "Hot (score 70+)", value: o.hot, tone: "pin", href: "/leads?minScore=70" },
        { label: "Warm (45-69)", value: o.warm, href: "/leads?minScore=45" },
        { label: "Cold (under 45)", value: o.cold },
        { label: "Searches run", value: o.searches, href: "/searches" },
      ];
    case "Contacts":
      return [
        { label: "With phone", value: s.contacts.phone, href: "/leads?phone=1" },
        { label: "Mobile numbers", value: s.contacts.mobile, href: "/leads?signal=MOBILE" },
        { label: "With email", value: s.contacts.email, href: "/leads?email=1" },
        { label: "Email domain OK", value: s.contacts.emailValid, tone: "ok", href: "/leads?emailValid=1" },
        { label: "Email domain bad", value: s.contacts.emailInvalid, tone: "danger" },
        { label: "Agreed to messages", value: s.contacts.optIn },
        { label: "Contact quality 70+", value: s.contacts.q70, tone: "ok" },
        { label: "Contact quality 40-69", value: s.contacts.q40 },
      ];
    case "Websites":
      return [
        { label: "Have a website", value: s.websites.website, href: "/leads?website=1" },
        { label: "No website", value: s.websites.noWebsite, tone: "pin", href: "/leads?website=0" },
        { label: "Social page as website", value: s.websites.socialOnly, tone: "pin", href: "/leads?signal=SOCIAL_ONLY" },
        { label: "Websites checked", value: s.websites.checked, href: "/enrich" },
        { label: "Website down", value: s.websites.siteDown, tone: "danger", href: "/leads?issue=SITE_DOWN" },
        { label: "Not secure", value: s.websites.noHttps, tone: "danger", href: "/leads?issue=NO_HTTPS" },
        { label: "Not mobile-friendly", value: s.websites.notMobile, href: "/leads?issue=NOT_MOBILE" },
        { label: "Slow", value: s.websites.slow, href: "/leads?issue=SLOW" },
        { label: "Weak website (under 50)", value: s.websites.weakSite, tone: "pin" },
        { label: "Contact form", value: s.websites.hasForm },
        { label: "Online booking", value: s.websites.hasBooking },
        { label: "Live chat", value: s.websites.hasChat },
        { label: "Hiring", value: s.websites.hiring, tone: "ok" },
        { label: "Unsafe or hacked", value: s.websites.unsafe, tone: "danger" },
      ];
    case "Social":
      return [
        { label: "Any social page", value: s.social.any, href: "/leads?socials=1" },
        ...["facebook", "instagram", "linkedin", "x", "youtube", "tiktok", "whatsapp", "pinterest", "telegram", "snapchat", "threads"].map((n) => ({
          label: n === "x" ? "X (Twitter)" : n.charAt(0).toUpperCase() + n.slice(1),
          value: s.social[n] ?? 0,
        })),
      ];
    case "Signals":
      return Object.entries(SIGNAL_INFO).map(([k, v]) => ({
        label: v.label,
        value: s.signals[k] ?? 0,
        tone: ["RATING_DROP", "BAD_REVIEW"].includes(k) ? ("danger" as const) : ("pin" as const),
        href: `/leads?signal=${k}`,
      }));
    case "Reviews":
      return [
        { label: "Have reviews", value: s.reviews.withReviews },
        { label: "Rated 4.5 or more", value: s.reviews.rating45, tone: "ok" },
        { label: "2+ unhappy reviews", value: s.reviews.unhappy, tone: "danger", href: "/leads?unhappy=1" },
      ];
    case "Pipeline":
      return [
        { label: "New", value: s.pipeline.NEW ?? 0, href: "/leads?status=NEW" },
        { label: "Contacted", value: s.pipeline.CONTACTED ?? 0, href: "/leads?status=CONTACTED" },
        { label: "Interested", value: s.pipeline.INTERESTED ?? 0, tone: "info", href: "/leads?status=INTERESTED" },
        { label: "Won", value: s.pipeline.WON ?? 0, tone: "ok", href: "/leads?status=WON" },
        { label: "Lost", value: s.pipeline.LOST ?? 0, href: "/leads?status=LOST" },
        { label: "Follow-ups due", value: s.pipeline.followUps ?? 0, tone: "pin", href: "/leads?followUp=due" },
        { label: "Value of won deals", value: s.pipeline.wonValue ?? 0, tone: "ok", money: true },
      ];
    case "Outreach":
      return [
        { label: "Emails sent", value: s.outreach.emailsSent, href: "/outreach" },
        { label: "Emails opened", value: s.outreach.emailsOpened },
        { label: "Campaign messages", value: s.outreach.campaignSent, href: "/campaigns" },
        { label: "WhatsApp replies", value: s.outreach.waIn, href: "/inbox" },
        { label: "SMS sent", value: s.outreach.sms },
        { label: "Live websites", value: s.outreach.sites, href: "/sites" },
        { label: "Rank checks", value: s.outreach.rankChecks, href: "/rank" },
      ];
    default:
      return [];
  }
}

export function StatsPanel({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    setS(null);
    fetch(`/api/stats${scope === "all" ? "?scope=all" : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setS)
      .catch(() => undefined);
  }, [scope]);

  const total = s?.overview.total ?? 0;
  const list = s ? tiles(s, tab) : [];

  return (
    <Panel className="mb-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 pt-4">
        <div className="-mb-px flex gap-1 overflow-x-auto" role="tablist" aria-label="Statistics">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("whitespace-nowrap border-b-2 px-3 pb-3 text-sm", tab === t ? "border-pin font-medium text-ink" : "border-transparent text-muted hover:text-ink")}
            >
              {t}
            </button>
          ))}
        </div>
        {isAdmin && (
          <div className="mb-3 flex rounded-control border border-line p-0.5 text-[12px]">
            {(["mine", "all"] as const).map((x) => (
              <button key={x} onClick={() => setScope(x)} className={cn("rounded px-2.5 py-1", scope === x ? "bg-raised font-medium" : "text-muted")}>
                {x === "mine" ? "My data" : "All customers"}
              </button>
            ))}
          </div>
        )}
      </div>

      {!s ? (
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse bg-surface" />
          ))}
        </div>
      ) : tab === "Places" ? (
        <div className="grid gap-6 p-5 md:grid-cols-3">
          {[
            ["Sources", Object.entries(s.sources).map(([name, count]) => ({ name: { MAPS: "Google Maps", OSM: "OpenStreetMap", WEB: "Web and extension", IMPORT: "Imported", WHATSAPP: "WhatsApp" }[name] ?? name, count }))],
            ["Top categories", s.categories],
            ["Top cities", s.cities],
          ].map(([title, rows]) => (
            <div key={title as string}>
              <p className="mb-2 text-sm font-semibold">{title as string}</p>
              <ul className="space-y-1.5 text-[13px]">
                {(rows as { name: string; count: number }[]).map((r) => (
                  <li key={r.name}>
                    <div className="flex justify-between gap-2">
                      <span className="truncate">{r.name}</span>
                      <span className="tabular text-muted">{formatNumber(r.count)}</span>
                    </div>
                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-raised">
                      <div className="h-full bg-pin" style={{ width: `${total ? Math.max(2, (r.count / total) * 100) : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-4">
          {list.map((t) => {
            const pct = !t.money && total ? Math.round((t.value / total) * 100) : null;
            const body = (
              <>
                <p className="text-[12px] text-muted">{t.label}</p>
                <p
                  className={cn(
                    "tabular mt-1 text-[26px] font-semibold leading-none",
                    t.tone === "ok" && "text-ok",
                    t.tone === "pin" && "text-pin",
                    t.tone === "danger" && "text-danger",
                    t.tone === "info" && "text-info",
                  )}
                >
                  {formatNumber(t.value)}
                </p>
                {pct != null && tab !== "Overview" && tab !== "Outreach" && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
                      <div className={cn("h-full", t.tone === "danger" ? "bg-danger" : t.tone === "ok" ? "bg-ok" : "bg-pin")} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="tabular text-[11px] text-muted">{pct}%</span>
                  </div>
                )}
              </>
            );
            return t.href && scope === "mine" ? (
              <Link key={t.label} href={t.href} className="bg-surface p-4 transition-colors hover:bg-raised/40">
                {body}
              </Link>
            ) : (
              <div key={t.label} className="bg-surface p-4">
                {body}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
