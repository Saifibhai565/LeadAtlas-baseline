import Link from "next/link";
import { ResetForm } from "@/components/reset-form";
import { peekEmailToken } from "@/lib/tokens";

export const metadata = { title: "Choose a new password" };
export const dynamic = "force-dynamic";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const valid = token ? await peekEmailToken(token, "RESET") : false;
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-[-0.01em]">{valid ? "Choose a new password" : "This link has expired"}</h2>
      {valid ? (
        <ResetForm token={token!} />
      ) : (
        <p className="mt-2 text-muted">
          Reset links work for 1 hour and only once.{" "}
          <Link href="/forgot" className="font-medium text-pin hover:underline">
            Ask for a new one
          </Link>
          .
        </p>
      )}
    </div>
  );
}
