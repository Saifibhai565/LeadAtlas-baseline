import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { APP_NAME } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Terms of service" };

export default async function Page() {
  const text = await getSetting("terms_of_service");
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        {APP_NAME}
      </Link>
      <h1 className="mt-4 text-[32px] font-semibold tracking-[-0.02em]">Terms of service</h1>
      <div className="mt-8 whitespace-pre-line leading-7 text-ink/90">{text}</div>
    </main>
  );
}
