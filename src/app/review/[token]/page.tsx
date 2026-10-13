import { notFound } from "next/navigation";
import { PrivateFeedback } from "@/components/private-feedback";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leave a review", robots: { index: false } };

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lead = await db.lead.findUnique({ where: { reviewToken: token }, select: { title: true, placeKey: true, mapsUrl: true, address: true } });
  if (!lead) notFound();
  // Google's direct "write a review" link needs the Place ID (they start with ChIJ)
  const googleUrl = lead.placeKey.startsWith("ChIJ")
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(lead.placeKey)}`
    : lead.mapsUrl ?? `https://www.google.com/maps/search/${encodeURIComponent(`${lead.title} ${lead.address ?? ""}`)}`;

  return (
    <main className="grid min-h-screen place-items-center bg-[#F6F7F9] px-6 py-12 text-[#141A23]" style={{ colorScheme: "light" }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-[#5B6575]">Thank you for visiting</p>
        <h1 className="mt-1 text-2xl font-semibold">{lead.title}</h1>
        <p className="mt-4 text-[#2b3442]">Your review helps others find us. It takes less than a minute.</p>
        <a href={googleUrl} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#1A73E8] font-semibold text-white">
          Leave a review on Google
        </a>
        <PrivateFeedback token={token} />
      </div>
    </main>
  );
}
