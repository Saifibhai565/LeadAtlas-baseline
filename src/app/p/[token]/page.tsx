import { notFound } from "next/navigation";
import { AcceptProposal } from "@/components/accept-proposal";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const metadata = { title: "Proposal", robots: { index: false } };

type Proposal = { title?: string; intro?: string; problems?: string[]; solution?: string[]; deliverables?: string[]; price?: string; timeline?: string; next?: string };

export default async function ProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lead = await db.lead.findUnique({
    where: { proposalToken: token },
    select: {
      id: true,
      title: true,
      userId: true,
      proposal: true,
      proposalAt: true,
      proposalViewedAt: true,
      proposalAcceptedAt: true,
      user: { select: { brandName: true, businessName: true, name: true, brandWhatsapp: true, brandColor: true } },
    },
  });
  if (!lead?.proposal) notFound();
  if (!lead.proposalViewedAt) {
    await db.lead.update({ where: { id: lead.id }, data: { proposalViewedAt: new Date() } });
    await notify(lead.userId, `${lead.title} opened your proposal`, "They're reading it now.", `/leads?q=${encodeURIComponent(lead.title)}`);
  }
  let p: Proposal = {};
  try {
    p = JSON.parse(lead.proposal);
  } catch {
    p = {};
  }
  const brand = lead.user.brandName || lead.user.businessName || lead.user.name;
  const accent = lead.user.brandColor || "#F2B43C";
  const wa = (lead.user.brandWhatsapp ?? "").replace(/\D/g, "");
  const list = (title: string, items?: string[]) =>
    items?.length ? (
      <section className="mt-8">
        <h2 className="text-lg font-semibold">{title}</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[#2b3442]">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <main className="min-h-screen bg-[#F6F7F9] text-[#141A23]" style={{ colorScheme: "light" }}>
      <div className="h-1.5" style={{ background: accent }} />
      <article className="mx-auto max-w-2xl px-6 py-12" dir="auto">
        <p className="text-sm text-[#5B6575]">
          Proposal from {brand} for {lead.title}
        </p>
        <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.02em]">{p.title ?? "Proposal"}</h1>
        {p.intro && <p className="mt-4 text-[17px] leading-7 text-[#2b3442]">{p.intro}</p>}
        {list("What's holding you back", p.problems)}
        {list("What we'll do", p.solution)}
        {list("What you get", p.deliverables)}
        <section className="mt-8 grid gap-4 rounded-2xl border border-[#E3E7ED] bg-white p-5 sm:grid-cols-2">
          <div>
            <p className="text-sm text-[#5B6575]">Investment</p>
            <p className="text-xl font-semibold">{p.price ?? "To be agreed"}</p>
          </div>
          <div>
            <p className="text-sm text-[#5B6575]">Timeline</p>
            <p className="text-xl font-semibold">{p.timeline ?? "To be agreed"}</p>
          </div>
        </section>
        {p.next && <p className="mt-6 text-[#2b3442]">{p.next}</p>}
        <div className="mt-8">
          <AcceptProposal token={token} accepted={Boolean(lead.proposalAcceptedAt)} accent={accent} />
        </div>
        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I have a question about the proposal for ${lead.title}.`)}`}
            className="mt-4 inline-block text-sm text-[#5B6575] underline"
          >
            Have a question? Message {brand} on WhatsApp
          </a>
        )}
      </article>
    </main>
  );
}
