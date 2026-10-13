import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const metadata = { title: "Website demo", robots: { index: false } };

export default async function DemoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lead = await db.lead.findUnique({
    where: { demoToken: token },
    select: { id: true, title: true, userId: true, demoHtml: true, demoViewedAt: true, user: { select: { brandName: true, businessName: true, name: true, brandWhatsapp: true, brandColor: true } } },
  });
  if (!lead?.demoHtml) notFound();
  if (!lead.demoViewedAt) {
    await db.lead.update({ where: { id: lead.id }, data: { demoViewedAt: new Date() } });
    await notify(lead.userId, `${lead.title} opened your website demo`, "A good moment to follow up.", `/leads?q=${encodeURIComponent(lead.title)}`);
  }
  const brand = lead.user.brandName || lead.user.businessName || lead.user.name;
  const wa = (lead.user.brandWhatsapp ?? "").replace(/\D/g, "");
  return (
    <main className="flex h-screen flex-col bg-white" style={{ colorScheme: "light" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#141A23] px-4 py-2 text-[13px] text-white">
        <span>
          A website idea for <strong>{lead.title}</strong>, made by {brand}
        </span>
        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I saw the website demo for ${lead.title}. I'd like to know more.`)}`}
            className="rounded-full px-3 py-1 font-semibold text-[#141A23]"
            style={{ background: lead.user.brandColor || "#F2B43C" }}
          >
            I like it, let's talk
          </a>
        )}
      </div>
      {/* sandbox with no permissions: the demo can't run scripts or open anything */}
      <iframe title={`Website demo for ${lead.title}`} srcDoc={lead.demoHtml} sandbox="" className="w-full flex-1 border-0" />
    </main>
  );
}
