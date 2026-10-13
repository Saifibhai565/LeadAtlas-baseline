import Link from "next/link";
import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { featureForPath } from "@/lib/feature-list";
import { allowedFeatures } from "@/lib/features";
import { SMTP_READY } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const features = await allowedFeatures(user);
  const path = (await headers()).get("x-pathname") ?? "";
  const needed = featureForPath(path);
  const blocked = needed && !features.includes(needed);

  return (
    <AppShell user={user} smtpReady={SMTP_READY} features={features}>
      {blocked ? (
        <div className="mx-auto max-w-lg py-20 text-center">
          <h1 className="text-xl font-semibold">This isn't part of your plan</h1>
          <p className="mt-2 text-muted">Upgrade to use it, or ask the account owner.</p>
          <Link href="/billing" className="mt-6 inline-flex h-10 items-center rounded-control bg-pin px-4 text-sm font-semibold text-pin-ink">
            See plans
          </Link>
        </div>
      ) : (
        children
      )}
    </AppShell>
  );
}
