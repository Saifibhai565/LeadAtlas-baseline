"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AtSign, Globe2, Loader2, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { ISSUE_INFO } from "@/lib/issues";
import { formatNumber } from "@/lib/utils";

type Stats = {
  withWebsite: number;
  noWebsite: number;
  checked: number;
  queued: number;
  unchecked: number;
  socials: number;
  validEmails: number;
  issues: Record<string, number>;
  areas: { area: string; total: number; noSite: number; weakSite: number; openings: number }[];
};

export function EnrichView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/enrich", { cache: "no-store" });
    if (res.ok) setStats(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!stats?.queued) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [stats?.queued, load]);

  async function startAll() {
    setStarting(true);
    const res = await fetch("/api/enrich", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const body = await res.json().catch(() => ({}));
    setStarting(false);
    if (!res.ok) return toast.error(body.error ?? "Couldn't start the checks.");
    toast.success(body.queued ? `Checking ${body.queued} websites.` : "Every website is already checked.");
    load();
  }

  if (!stats) return <div className="h-64 animate-pulse rounded-panel bg-surface" />;

  const done = stats.withWebsite - stats.unchecked - stats.queued;
  const pct = stats.withWebsite ? Math.round((Math.max(0, done) / stats.withWebsite) * 100) : 0;
  const opportunities = [
    { key: "NO_WEBSITE", label: "No website at all", pitch: "They have no site. The easiest pitch there is.", count: stats.noWebsite, href: "/leads?website=0" },
    ...Object.entries(ISSUE_INFO).map(([key, info]) => ({
      key,
      label: info.label,
      pitch: info.pitch,
      count: stats.issues[key] ?? 0,
      href: `/leads?issue=${key}`,
    })),
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.3fr]">
      <Panel className="p-6">
        <h2 className="text-[15px] font-semibold">Check business websites</h2>
        <p className="mt-1 text-sm text-muted">
          Visits each lead's website to find emails, extra phone numbers and social pages, checks the email domain, and
          scores the website for common problems.
        </p>

        <div className="mt-6">
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-muted">Websites checked</span>
            <span className="tabular">
              {formatNumber(Math.max(0, done))} of {formatNumber(stats.withWebsite)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-raised">
            <div className="h-full rounded-full bg-pin transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          {stats.queued > 0 && (
            <p className="mt-2 inline-flex items-center gap-2 text-[13px] text-info">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Checking {formatNumber(stats.queued)} websites. You can leave this page; it keeps going.
            </p>
          )}
        </div>

        <Button className="mt-6 w-full" onClick={startAll} loading={starting} disabled={stats.unchecked === 0}>
          {stats.unchecked > 0 ? `Check ${formatNumber(stats.unchecked)} websites` : "All websites checked"}
        </Button>

        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 text-center">
          {[
            { icon: AtSign, label: "Email domain OK", value: stats.validEmails, href: "/leads?emailValid=1" },
            { icon: Share2, label: "Social pages", value: stats.socials, href: "/leads?socials=1" },
            { icon: ShieldCheck, label: "Checked", value: stats.checked, href: "/leads?checked=1" },
          ].map(({ icon: Icon, label, value, href }) => (
            <Link key={label} href={href} className="rounded-control p-2 hover:bg-raised">
              <Icon className="mx-auto h-4 w-4 text-muted" aria-hidden />
              <dd className="tabular mt-1 text-lg font-semibold">{formatNumber(value)}</dd>
              <dt className="text-[12px] text-muted">{label}</dt>
            </Link>
          ))}
        </dl>
      </Panel>

      <Panel>
        <PanelHeader
          title="Sales openings"
          description="Businesses with a website problem you can offer to fix. Click one to see the list."
        />
        <ul className="divide-y divide-line">
          {opportunities.map((o) => (
            <li key={o.key}>
              <Link href={o.href} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-raised/40">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Globe2 className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                    {o.label}
                  </p>
                  <p className="mt-0.5 pl-6 text-[13px] text-muted">{o.pitch}</p>
                </div>
                <span className={o.count ? "tabular text-lg font-semibold text-pin" : "tabular text-lg text-muted"}>
                  {formatNumber(o.count)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      {stats.areas?.length > 0 && (
        <Panel className="lg:col-span-2">
          <PanelHeader title="Where the openings are" description="Areas with the most businesses that have no website or a weak one." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[13px] text-muted">
                  <th className="px-5 py-2.5 font-medium">Area</th>
                  <th className="px-5 py-2.5 text-right font-medium">Businesses</th>
                  <th className="px-5 py-2.5 text-right font-medium">No website</th>
                  <th className="px-5 py-2.5 text-right font-medium">Weak website</th>
                  <th className="w-1/3 px-5 py-2.5 font-medium">Share with an opening</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.areas.map((a) => {
                  const pct = Math.round((a.openings / a.total) * 100);
                  return (
                    <tr key={a.area}>
                      <td className="px-5 py-2.5">
                        <Link href={`/leads?q=${encodeURIComponent(a.area.split(",")[0])}&website=0`} className="hover:text-pin">
                          {a.area}
                        </Link>
                      </td>
                      <td className="tabular px-5 py-2.5 text-right">{formatNumber(a.total)}</td>
                      <td className="tabular px-5 py-2.5 text-right text-pin">{formatNumber(a.noSite)}</td>
                      <td className="tabular px-5 py-2.5 text-right">{formatNumber(a.weakSite)}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                            <div className="h-full rounded-full bg-pin" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="tabular w-10 text-right text-[12px] text-muted">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
