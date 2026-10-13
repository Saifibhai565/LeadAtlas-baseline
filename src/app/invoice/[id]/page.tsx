import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { APP_NAME } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice", robots: { index: false } };

const METHOD: Record<string, string> = { JAZZCASH: "JazzCash", EASYPAISA: "Easypaisa", BANK: "Bank transfer", OTHER: "Other" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const p = await db.payment.findUnique({
    where: { id },
    include: { plan: true, user: { select: { name: true, email: true, businessName: true } } },
  });
  if (!p || p.status !== "APPROVED" || (p.userId !== user.wsId && !user.isAdmin)) notFound();
  const from = await getSetting("invoice_from");
  const money = (n: number) => `${p.currency} ${n.toLocaleString("en-US")}`;
  const date = (p.reviewedAt ?? p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="min-h-screen bg-[#EEF1F5] px-4 py-10 text-[#141A23] print:bg-white print:p-0" style={{ colorScheme: "light" }}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex justify-end print:hidden">
          <PrintButton />
        </div>
        <article className="rounded-2xl bg-white p-10 shadow-sm print:rounded-none print:shadow-none">
          <header className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xl font-semibold">{APP_NAME}</p>
              <p className="mt-2 whitespace-pre-line text-sm text-[#5B6575]">{from}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold">Invoice</p>
              <p className="mt-1 text-sm text-[#5B6575]">No. {p.invoiceNo ?? p.id.slice(-8).toUpperCase()}</p>
              <p className="text-sm text-[#5B6575]">{date}</p>
              <p className="mt-2 inline-block rounded-full bg-[#E3F6EF] px-3 py-0.5 text-sm font-medium text-[#047857]">Paid</p>
            </div>
          </header>

          <section className="mt-10">
            <p className="text-sm text-[#5B6575]">Billed to</p>
            <p className="font-medium">{p.user.businessName || p.user.name}</p>
            {p.user.businessName && <p className="text-sm">{p.user.name}</p>}
            <p className="text-sm">{p.user.email}</p>
          </section>

          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b border-[#E3E7ED] text-left text-[#5B6575]">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#E3E7ED]">
                <td className="py-3">
                  {p.plan.name} plan, 1 month
                  <span className="block text-[#5B6575]">{p.plan.credits.toLocaleString("en-US")} credits, {p.plan.seats} seat{p.plan.seats > 1 ? "s" : ""}</span>
                </td>
                <td className="py-3 text-right tabular-nums">{money(p.amount + p.discount)}</td>
              </tr>
              {p.discount > 0 && (
                <tr className="border-b border-[#E3E7ED]">
                  <td className="py-3">Discount{p.couponCode ? ` (${p.couponCode})` : ""}</td>
                  <td className="py-3 text-right tabular-nums">-{money(p.discount)}</td>
                </tr>
              )}
              <tr>
                <td className="py-3 font-semibold">Total paid</td>
                <td className="py-3 text-right text-base font-semibold tabular-nums">{money(p.amount)}</td>
              </tr>
            </tbody>
          </table>

          <p className="mt-8 text-sm text-[#5B6575]">
            Paid by {METHOD[p.method] ?? p.method}, transaction {p.reference}
            {p.payerName ? `, from ${p.payerName}` : ""}.
          </p>
        </article>
      </div>
    </main>
  );
}
