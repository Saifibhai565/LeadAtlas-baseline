import { Unbounded } from "next/font/google";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Faq } from "@/components/landing/faq";
import { LiveScan } from "@/components/landing/live-scan";
import { currentUser } from "@/lib/auth";
import { currentBrand } from "@/lib/brand";
import { db } from "@/lib/db";
import { ensurePlans, getSetting, getSettings } from "@/lib/settings";
import { APP_NAME as DEFAULT_NAME, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const display = Unbounded({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display", display: "swap" });

/** What one lead looks like, used in the "anatomy" section. Sample data. */
const ANATOMY = [
  { title: "Ready to contact", text: "Phone, WhatsApp, email and social pages, checked and ready." },
  { title: "Why they need you", text: "Website score, SEO gaps and what their customers complain about." },
  { title: "Why now", text: "Signals like recently opened, rating dropped or running ads." },
  { title: "What to say", text: "A message written for this business, in English, Urdu or Roman Urdu." },
];

export default async function Landing() {
  const host = ((await headers()).get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
  const hosted = host ? await db.site.findUnique({ where: { customDomain: host }, select: { slug: true, published: true } }) : null;
  if (hosted?.published) redirect(`/s/${hosted.slug}`);
  if ((await currentBrand()).custom) redirect("/login");

  const [plans, wa, site, me] = await Promise.all([ensurePlans(), getSetting("support_whatsapp"), getSettings(), currentUser().catch(() => null)]);
  const name = site.platform_name || DEFAULT_NAME;
  const pairs = (txt: string) =>
    txt
      .split("\n")
      .map((l) => l.split("|").map((x) => x.trim()))
      .filter((p) => p[0]);
  const steps = pairs(site.landing_steps).map(([title, text]) => ({ title, text: text ?? "" }));
  const features = site.landing_features.split("\n").map((l) => l.trim()).filter(Boolean);
  const faq = pairs(site.landing_faq).map(([q, a]) => ({ q, a: a ?? "" }));
  const cta = site.landing_cta || "Start free";
  const support = wa.replace(/\D/g, "");
  const ctaHref = me ? (me.isAdmin ? "/admin" : "/dashboard") : "/register";
  const ctaText = me ? (me.isAdmin ? "Open Super Admin" : "Open dashboard") : cta;

  return (
    <div className={`${display.variable} landing min-h-screen bg-[#070B14] text-[#E9EEF7]`} style={{ colorScheme: "dark" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#070B14]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label={`${name} home`}>
            {site.platform_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/brand/logo" alt={name} className="h-8 w-auto max-w-[180px] object-contain" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
                  <path d="M12 2c4.4 0 7 3.1 7 6.9C19 14.2 12 22 12 22S5 14.2 5 8.9C5 5.1 7.6 2 12 2Z" fill="#F2B43C" />
                  <circle cx="12" cy="9" r="2.6" fill="#070B14" />
                </svg>
                <span className="font-[family-name:var(--font-display)] text-[17px] font-medium tracking-tight">{name}</span>
              </>
            )}
          </Link>
          <nav className="hidden items-center gap-8 text-[14px] text-[#A3AEC2] md:flex" aria-label="Sections">
            <a href="#how" className="hover:text-white">
              How it works
            </a>
            <a href="#features" className="hover:text-white">
              Features
            </a>
            {site.landing_show_pricing === "1" && (
              <a href="#pricing" className="hover:text-white">
                Pricing
              </a>
            )}
            <a href="#faq" className="hover:text-white">
              Questions
            </a>
          </nav>
          <div className="flex items-center gap-4 text-[14px]">
            {!me && (
              <Link href="/login" className="text-[#A3AEC2] hover:text-white">
                Sign in
              </Link>
            )}
            <Link href={ctaHref} className="rounded-full bg-[#F2B43C] px-5 py-2.5 font-semibold text-[#1A1203] transition-colors hover:bg-[#FFC75A]">
              {ctaText}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="landing-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[13px] text-[#A3AEC2]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3DD6B5]" aria-hidden />
              {site.platform_tagline || "Lead generation for agencies"}
            </p>
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-[40px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[58px] lg:text-[68px]">
              {site.hero_title}
            </h1>
            <p className="mt-6 max-w-xl text-[18px] leading-8 text-[#A3AEC2]">{site.hero_subtitle}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href={ctaHref}
                className="rounded-full bg-[#F2B43C] px-7 py-4 text-[16px] font-semibold text-[#1A1203] shadow-[0_10px_40px_-10px_rgba(242,180,60,0.7)] transition-transform hover:-translate-y-0.5"
              >
                {ctaText}
              </Link>
              <a href="#how" className="rounded-full border border-white/15 px-7 py-4 text-[16px] text-[#E9EEF7] hover:border-white/30">
                See how it works
              </a>
            </div>
          </div>
          <LiveScan />
        </div>
      </section>

      {/* Anatomy of a lead */}
      <section className="border-y border-white/5 bg-[#0A101C]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[34px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[44px]">
              Not a list of names. Leads you can close.
            </h2>
            <p className="mt-5 max-w-md text-[17px] leading-7 text-[#A3AEC2]">
              Every business arrives with everything you need to decide, and to start the conversation.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[22px] border border-white/10 bg-white/10 sm:grid-cols-2">
            {ANATOMY.map((a) => (
              <div key={a.title} className="bg-[#0B1322] p-7">
                <p className="font-[family-name:var(--font-display)] text-[18px] font-medium text-[#F2B43C]">{a.title}</p>
                <p className="mt-2 text-[15px] leading-6 text-[#A3AEC2]">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24">
        <h2 className="font-[family-name:var(--font-display)] text-[34px] font-bold tracking-[-0.02em] sm:text-[44px]">How it works</h2>
        <ol className="mt-14 grid gap-12 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="font-[family-name:var(--font-display)] text-[72px] font-bold leading-none text-transparent [-webkit-text-stroke:1.5px_#F2B43C]">
                {i + 1}
              </span>
              <h3 className="mt-4 text-[21px] font-semibold">{s.title}</h3>
              <p className="mt-2 text-[16px] leading-7 text-[#A3AEC2]">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section id="features" className="relative scroll-mt-24 overflow-hidden border-y border-white/5 bg-[#0A101C]">
        <div className="landing-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="font-[family-name:var(--font-display)] text-[34px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[44px]">
            One place for the whole job
          </h2>
          <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex gap-3 border-t border-white/10 pt-5 text-[16px] leading-7 text-[#D6DDEA]">
                <svg viewBox="0 0 24 24" className="mt-1 h-5 w-5 shrink-0" aria-hidden>
                  <path d="M12 2c4.4 0 7 3.1 7 6.9C19 14.2 12 22 12 22S5 14.2 5 8.9C5 5.1 7.6 2 12 2Z" fill="#F2B43C" />
                  <circle cx="12" cy="9" r="2.6" fill="#0A101C" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      {site.landing_show_pricing === "1" && plans.length > 0 && (
        <section id="pricing" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24">
          <h2 className="font-[family-name:var(--font-display)] text-[34px] font-bold tracking-[-0.02em] sm:text-[44px]">Pricing</h2>
          <p className="mt-3 text-[17px] text-[#A3AEC2]">Start free. Upgrade when it pays for itself.</p>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {plans.map((p, i) => {
              const featured = i === Math.min(1, plans.length - 1);
              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-[22px] border p-8 ${featured ? "border-[#F2B43C]/60 bg-gradient-to-b from-[#F2B43C]/[0.08] to-transparent" : "border-white/10 bg-white/[0.02]"}`}
                >
                  {featured && <span className="absolute -top-3 left-8 rounded-full bg-[#F2B43C] px-3 py-1 text-[12px] font-semibold text-[#1A1203]">Most chosen</span>}
                  <h3 className="font-[family-name:var(--font-display)] text-[20px] font-medium">{p.name}</h3>
                  {p.blurb && <p className="mt-2 text-[15px] text-[#A3AEC2]">{p.blurb}</p>}
                  <p className="mt-6">
                    <span className="tabular font-[family-name:var(--font-display)] text-[40px] font-bold tracking-tight">
                      {p.currency} {formatNumber(p.price)}
                    </span>
                    <span className="text-[#A3AEC2]"> / month</span>
                  </p>
                  {p.priceUsd != null && <p className="text-[14px] text-[#A3AEC2]">or ${formatNumber(p.priceUsd)} a month</p>}
                  <ul className="mt-6 space-y-2.5 text-[15px] text-[#D6DDEA]">
                    <li>{formatNumber(p.credits)} new leads a month</li>
                    <li>{p.seats === 1 ? "1 person" : `Up to ${p.seats} people`}</li>
                    <li>{p.ai ? "AI messages, demos and proposals" : "Templates and website checks"}</li>
                    {p.outreach && <li>Email and WhatsApp campaigns</li>}
                    {p.api && <li>API, webhooks and Chrome extension</li>}
                    {p.whiteLabel && <li>Your own brand and domain</li>}
                  </ul>
                  <div className="mt-auto pt-8">
                    <Link
                      href={ctaHref}
                      className={`block rounded-full px-5 py-3.5 text-center font-semibold ${featured ? "bg-[#F2B43C] text-[#1A1203] hover:bg-[#FFC75A]" : "border border-white/15 hover:border-white/30"}`}
                    >
                      {me ? ctaText : cta}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Questions */}
      {faq.length > 0 && (
        <section id="faq" className="mx-auto max-w-4xl scroll-mt-24 px-6 pb-24">
          <h2 className="mb-10 font-[family-name:var(--font-display)] text-[34px] font-bold tracking-[-0.02em] sm:text-[44px]">Questions</h2>
          <Faq items={faq} />
        </section>
      )}

      {/* Closing call to action */}
      <section className="relative overflow-hidden border-t border-white/5">
        <div className="landing-rings pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-[36px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[54px]">
            Your next client is already on the map.
          </h2>
          <Link
            href={ctaHref}
            className="mt-10 inline-block rounded-full bg-[#F2B43C] px-8 py-4 text-[17px] font-semibold text-[#1A1203] shadow-[0_10px_50px_-10px_rgba(242,180,60,0.8)] transition-transform hover:-translate-y-0.5"
          >
            {ctaText}
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-[14px] text-[#7D889C]">
          <p>
            © {new Date().getFullYear()} {name}
            {site.landing_footer ? `. ${site.landing_footer}` : ""}
          </p>
          <nav className="flex gap-6">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            {support && (
              <a href={`https://wa.me/${support}`} target="_blank" rel="noreferrer" className="hover:text-white">
                WhatsApp us
              </a>
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}
