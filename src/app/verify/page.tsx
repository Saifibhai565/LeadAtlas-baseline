import Link from "next/link";
import { db } from "@/lib/db";
import { consumeEmailToken } from "@/lib/tokens";
import { APP_NAME } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm email" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const userId = token ? await consumeEmailToken(token, "VERIFY") : null;
  if (userId) await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm rounded-panel border border-line bg-surface p-7 text-center">
        <p className="text-lg font-semibold">{APP_NAME}</p>
        <h1 className="mt-6 text-xl font-semibold">{userId ? "Your email is confirmed" : "This link didn't work"}</h1>
        <p className="mt-2 text-sm text-muted">
          {userId
            ? "Thanks. You'll get password resets and payment receipts at this address."
            : "It may have expired or already been used. Sign in and use “Resend” at the top of the page for a new one."}
        </p>
        <Link href="/dashboard" className="mt-6 inline-flex h-10 items-center rounded-control bg-pin px-4 text-sm font-semibold text-pin-ink">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
