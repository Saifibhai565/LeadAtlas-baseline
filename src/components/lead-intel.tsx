"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

type Intel = {
  domainCreated?: string | null;
  domainAgeYears?: number | null;
  sslExpires?: string | null;
  sslDaysLeft?: number | null;
  ip?: string | null;
  language?: string | null;
  contactForm?: boolean;
  booking?: boolean;
  liveChat?: boolean;
  whatsappWidget?: boolean;
  careersUrl?: string | null;
  contactUrl?: string | null;
  psiMobile?: number | null;
  psiDesktop?: number | null;
  psiLcp?: string | null;
  unsafe?: string | null;
  reviewsLast90?: number | null;
  reviewsPrev90?: number | null;
  ownerEmails?: { email: string; status: string }[];
  ownerEmailNote?: string | null;
  traffic?: { visits: number; month: string } | null;
  company?: { employees?: number | null; revenue?: string | null; industry?: string | null; founded?: number | null; linkedin?: string | null } | null;
  emailChecks?: Record<string, string>;
  phoneType?: { number: string; type: string; carrier?: string; country?: string; valid: boolean } | null;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5">
      <dt className="w-40 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
const yes = (v?: boolean) => (v ? <span className="text-ok">Yes</span> : <span className="text-muted">No</span>);
const scoreColor = (n: number) => (n >= 90 ? "text-ok" : n >= 50 ? "text-pin" : "text-danger");

/** Deep check: free checks, speed test, owner email finder and paid sources. */
export function LeadIntel({ lead, onChanged }: { lead: { id: string; website: string | null; intel: string | null; quality: number | null; intelAt: string | null }; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  let i: Intel = {};
  try {
    i = lead.intel ? JSON.parse(lead.intel) : {};
  } catch {
    i = {};
  }

  async function run(action: "check" | "owner-email" | "paid") {
    setBusy(action);
    const res = await fetch(`/api/leads/${lead.id}/intel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const b = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return toast.error(b.error ?? "The check failed.");
    toast.success(action === "owner-email" ? "Email check finished." : "Deep check finished.");
    onChanged();
  }

  const trend =
    i.reviewsLast90 != null && i.reviewsPrev90 != null
      ? i.reviewsLast90 > i.reviewsPrev90
        ? "growing"
        : i.reviewsLast90 < i.reviewsPrev90
          ? "slowing down"
          : "steady"
      : null;

  return (
    <div className="space-y-4 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        {lead.quality != null && (
          <span className={cn("rounded-md px-2 py-0.5 font-semibold", lead.quality >= 70 ? "bg-ok/15 text-ok" : lead.quality >= 40 ? "bg-pin/15 text-pin" : "bg-danger/15 text-danger")}>
            Contact quality {lead.quality}/100
          </span>
        )}
        <Button size="sm" variant="secondary" loading={busy === "check"} onClick={() => run("check")}>
          {lead.intelAt ? "Run deep check again" : "Run deep check"}
        </Button>
        {lead.website && (
          <Button size="sm" variant="secondary" loading={busy === "owner-email"} onClick={() => run("owner-email")}>
            Find owner email
          </Button>
        )}
        <Button size="sm" variant="ghost" loading={busy === "paid"} onClick={() => run("paid")} title="Traffic, company size and email verification from paid data services">
          Paid data
        </Button>
      </div>
      {busy === "check" && <p className="text-[12px] text-muted">Includes Google's speed test, which takes up to a minute.</p>}
      {lead.intelAt && <p className="text-[12px] text-muted">Last checked {timeAgo(lead.intelAt)}.</p>}

      {i.unsafe && <p className="rounded-control bg-danger/10 px-3 py-2 font-medium text-danger">Google flags this website as unsafe ({i.unsafe.toLowerCase().replace(/_/g, " ")}). It may be hacked: an urgent reason to help them.</p>}

      {!!i.ownerEmails?.length && (
        <div>
          <p className="font-medium">Owner email</p>
          {i.ownerEmailNote && <p className="text-[12px] text-muted">{i.ownerEmailNote}</p>}
          <ul className="mt-1 space-y-1">
            {i.ownerEmails.slice(0, 8).map((e) => (
              <li key={e.email} className="flex items-center gap-2">
                <button onClick={() => navigator.clipboard.writeText(e.email).then(() => toast.success("Copied."))} className="inline-flex items-center gap-1 hover:text-pin">
                  {e.email}
                  <Copy className="h-3 w-3 text-muted" aria-hidden />
                </button>
                <span className={cn("text-[11px]", e.status === "valid" ? "text-ok" : e.status === "invalid" ? "text-danger" : "text-muted")}>{e.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="divide-y divide-line/60">
        {(i.psiMobile != null || i.psiDesktop != null) && (
          <Row label="Google speed score">
            <span className={cn("font-semibold", scoreColor(i.psiMobile ?? 0))}>{i.psiMobile ?? "?"}</span> mobile ·{" "}
            <span className={cn("font-semibold", scoreColor(i.psiDesktop ?? 0))}>{i.psiDesktop ?? "?"}</span> desktop
            {i.psiLcp && <span className="text-muted"> · main content shows in {i.psiLcp}</span>}
          </Row>
        )}
        {i.domainAgeYears != null && (
          <Row label="Website age">
            {i.domainAgeYears} years {i.domainCreated && <span className="text-muted">(since {new Date(i.domainCreated).getFullYear()})</span>}
          </Row>
        )}
        {i.sslDaysLeft != null && (
          <Row label="Security certificate">
            <span className={i.sslDaysLeft < 0 ? "text-danger" : i.sslDaysLeft < 30 ? "text-pin" : ""}>
              {i.sslDaysLeft < 0 ? `expired ${-i.sslDaysLeft} days ago` : `expires in ${i.sslDaysLeft} days`}
            </span>
          </Row>
        )}
        {i.ip && <Row label="Server IP">{i.ip}</Row>}
        {i.language && <Row label="Website language">{i.language}</Row>}
        {lead.website && i.contactForm !== undefined && <Row label="Contact form">{yes(i.contactForm)}</Row>}
        {lead.website && i.booking !== undefined && <Row label="Online booking">{yes(i.booking)}</Row>}
        {lead.website && i.liveChat !== undefined && <Row label="Live chat">{yes(i.liveChat)}</Row>}
        {lead.website && i.whatsappWidget !== undefined && <Row label="WhatsApp button">{yes(i.whatsappWidget)}</Row>}
        {i.contactUrl && (
          <Row label="Contact page">
            <a href={i.contactUrl} target="_blank" rel="noreferrer" className="text-pin hover:underline">
              open
            </a>
          </Row>
        )}
        {i.careersUrl && (
          <Row label="Hiring">
            <span className="text-ok">They have a careers page</span>{" "}
            <a href={i.careersUrl} target="_blank" rel="noreferrer" className="text-pin hover:underline">
              open
            </a>
          </Row>
        )}
        {trend && (
          <Row label="Reviews trend">
            {i.reviewsLast90} in the last 3 months vs {i.reviewsPrev90} before: <span className={trend === "growing" ? "text-ok" : trend === "slowing down" ? "text-pin" : ""}>{trend}</span>
          </Row>
        )}
        {i.traffic && (
          <Row label="Website visits">
            about {formatNumber(i.traffic.visits)} in {i.traffic.month}
          </Row>
        )}
        {i.phoneType && (
          <Row label="Phone type">
            <span className={i.phoneType.type === "mobile" ? "text-ok" : ""}>{i.phoneType.type}</span>
            {i.phoneType.carrier ? ` · ${i.phoneType.carrier}` : ""}
            {i.phoneType.country ? ` · ${i.phoneType.country}` : ""}
            {!i.phoneType.valid && <span className="text-danger"> · not valid</span>}
          </Row>
        )}
        {i.company && (
          <Row label="Company">
            {[i.company.employees ? `${formatNumber(i.company.employees)} employees` : null, i.company.revenue, i.company.industry, i.company.founded ? `founded ${i.company.founded}` : null]
              .filter(Boolean)
              .join(" · ") || "No data"}
            {i.company.linkedin && (
              <a href={i.company.linkedin} target="_blank" rel="noreferrer" className="ml-2 text-pin hover:underline">
                LinkedIn
              </a>
            )}
          </Row>
        )}
        {i.emailChecks && Object.keys(i.emailChecks).length > 0 && (
          <Row label="Email verification">
            {Object.entries(i.emailChecks).map(([e, st]) => (
              <span key={e} className="block">
                {e}: <span className={st === "valid" ? "text-ok" : st === "invalid" ? "text-danger" : "text-muted"}>{st}</span>
              </span>
            ))}
          </Row>
        )}
      </dl>
      {!lead.intelAt && <p className="text-[12px] text-muted">Website checks run the free parts automatically. Press Run deep check for everything, including Google's speed test.</p>}
    </div>
  );
}
