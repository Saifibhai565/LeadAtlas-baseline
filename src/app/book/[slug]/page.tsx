import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Book a meeting", robots: { index: false } };

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const owner = await db.user.findUnique({ where: { meetingSlug: slug }, select: { blocked: true } });
  if (!owner || owner.blocked) notFound();
  return (
    <main className="min-h-screen bg-[#F6F7F9] px-4 py-10 text-[#141A23]" style={{ colorScheme: "light" }}>
      <BookingForm slug={slug} />
    </main>
  );
}
