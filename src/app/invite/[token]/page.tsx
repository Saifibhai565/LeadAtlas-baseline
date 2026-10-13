import Link from "next/link";
import { ContourMap } from "@/components/contour-map";
import { InviteForm } from "@/components/invite-form";
import { db } from "@/lib/db";
import { APP_NAME } from "@/lib/utils";

export const metadata = { title: "Join your team" };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.invite.findUnique({ where: { token }, include: { owner: { select: { name: true } } } });

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-6">
      <ContourMap className="pointer-events-none absolute inset-0 h-full w-full opacity-60" />
      <div className="relative w-full max-w-sm rounded-panel border border-line bg-surface p-7">
        <p className="text-lg font-semibold">{APP_NAME}</p>
        {!invite || invite.usedAt ? (
          <>
            <h1 className="mt-6 text-xl font-semibold">This invite link has expired</h1>
            <p className="mt-2 text-sm text-muted">It was already used or cancelled. Ask the person who invited you for a new link.</p>
            <Link href="/login" className="mt-6 inline-block text-sm font-medium text-pin hover:underline">
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-semibold">Join {invite.owner.name}'s team</h1>
            <p className="mt-1 text-sm text-muted">Create your sign-in for {invite.email}.</p>
            <InviteForm token={token} />
          </>
        )}
      </div>
    </main>
  );
}
