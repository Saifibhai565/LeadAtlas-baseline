import { unsign } from "@/lib/crypto";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function Unsubscribe({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = unsign<{ w: string; e: string }>(token);
  let ok = false;
  if (data?.w && data?.e) {
    await db.suppression.upsert({
      where: { userId_email: { userId: data.w, email: data.e } },
      create: { userId: data.w, email: data.e, reason: "UNSUBSCRIBED" },
      update: { reason: "UNSUBSCRIBED" },
    });
    await db.sequenceEnrollment.updateMany({
      where: { userId: data.w, status: "ACTIVE", lead: { emails: { contains: data.e } } },
      data: { status: "UNSUBSCRIBED", endedAt: new Date() },
    });
    await db.emailMessage.updateMany({ where: { userId: data.w, toEmail: data.e, status: "QUEUED" }, data: { status: "CANCELLED" } });
    ok = true;
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[#F6F7F9] px-6 text-[#141A23]" style={{ colorScheme: "light" }}>
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold">{ok ? "You're unsubscribed" : "This link isn't valid"}</h1>
        <p className="mt-2 text-sm text-[#5B6575]">
          {ok ? `${data!.e} won't get any more emails from this sender.` : "It may have been copied incompletely. Reply to the email with “stop” instead."}
        </p>
      </div>
    </main>
  );
}
