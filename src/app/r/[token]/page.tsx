import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ISSUE_INFO, issueList } from "@/lib/issues";

export const dynamic = "force-dynamic";

const FIX: Record<string, string> = {
  SITE_DOWN: "Get the website back online, or replace it with a simple, fast one-page site.",
  NO_HTTPS: "Install a free SSL certificate so browsers show the padlock instead of “Not secure”.",
  NOT_MOBILE: "Rebuild the layout so it fits phones. Most local customers search on mobile.",
  SLOW: "Compress images and use better hosting so the page opens in under 3 seconds.",
  NO_DESCRIPTION: "Write a short description so Google shows a clear summary under your name.",
  NO_TITLE: "Give the homepage a title with your business name, service and city.",
};

async function load(token: string) {
  return db.lead.findUnique({
    where: { reportToken: token },
    include: { user: { select: { brandName: true, brandColor: true, brandWhatsapp: true, businessName: true, name: true } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const lead = await load((await params).token);
  return { title: lead ? `Website check for ${lead.title}` : "Report not found", robots: { index: false } };
}

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const lead = await load((await params).token);
  if (!lead) notFound();

  const brand = lead.user.brandName || lead.user.businessName || lead.user.name;
  const accent = lead.user.brandColor || "#F2B43C";
  const rgb = [1, 3, 5].map((i) => parseInt(accent.slice(i, i + 2), 16) / 255);
  const onAccent = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] > 0.55 ? "#141A23" : "#FFFFFF";
  const wa = (lead.user.brandWhatsapp ?? "").replace(/\D/g, "");
  const issues = lead.website ? issueList(lead.auditIssues) : [];
  const score = lead.website ? lead.auditScore ?? null : 0;
  const scoreColor = score == null ? "#8B9AB2" : score >= 80 ? "#34C4A0" : score >= 50 ? "#F2B43C" : "#EF6B6B";

  const findings: { title: string; why: string; fix: string }[] = lead.website
    ? issues.map((i) => ({ title: ISSUE_INFO[i].label, why: ISSUE_INFO[i].pitch, fix: FIX[i] }))
    : [
        {
          title: "No website",
          why: "People who find you on Google Maps have nowhere to see your services, prices or photos.",
          fix: "A simple, fast website that shows what you offer and lets customers call or message you in one tap.",
        },
      ];

  return (
    <main className="min-h-screen bg-[#F6F7F9] text-[#141A23]" style={{ colorScheme: "light" }}>
      <div className="h-1.5" style={{ background: accent }} />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-sm text-[#5B6575]">Prepared by {brand}</p>
        <h1 className="mt-2 text-[32px] font-semibold leading-tight tracking-[-0.02em]">Website check for {lead.title}</h1>
        {lead.address && <p className="mt-1 text-[#5B6575]">{lead.address}</p>}

        <section className="mt-8 flex items-center gap-6 rounded-2xl border border-[#E3E7ED] bg-white p-6">
          <div
            className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-[6px]"
            style={{ borderColor: scoreColor }}
            aria-label={`Score ${score ?? "not available"} out of 100`}
          >
            <span className="text-3xl font-semibold tabular-nums">{score ?? "–"}</span>
          </div>
          <div>
            <p className="font-medium">
              {!lead.website
                ? "You're missing customers who look you up online."
                : issues.length === 0
                  ? "Your website passed every check."
                  : `We found ${issues.length} thing${issues.length > 1 ? "s" : ""} that may be costing you customers.`}
            </p>
            <p className="mt-1 text-sm text-[#5B6575]">
              {lead.website ? `Checked ${lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : "Based on your Google Maps listing"}
              {lead.rating != null ? `. Your Google rating is ${lead.rating.toFixed(1)} from ${lead.reviewCount ?? 0} reviews.` : "."}
            </p>
          </div>
        </section>

        {findings.length > 0 && (
          <section className="mt-8 space-y-4">
            {findings.map((f) => (
              <div key={f.title} className="rounded-2xl border border-[#E3E7ED] bg-white p-5">
                <h2 className="font-semibold">{f.title}</h2>
                <p className="mt-1 text-[#5B6575]">{f.why}</p>
                <p className="mt-3 text-sm">
                  <span className="font-medium">How to fix it: </span>
                  {f.fix}
                </p>
              </div>
            ))}
          </section>
        )}

        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I saw the website check for ${lead.title}. Can we talk about fixing it?`)}`}
            className="mt-10 inline-flex items-center rounded-xl px-5 py-3 font-semibold"
            style={{ background: accent, color: onAccent }}
          >
            Talk to {brand} on WhatsApp
          </a>
        )}
        <p className="mt-10 text-[12px] text-[#8A93A2]">
          This report was made from public information: your Google Maps listing and your website's homepage.
        </p>
      </div>
    </main>
  );
}
