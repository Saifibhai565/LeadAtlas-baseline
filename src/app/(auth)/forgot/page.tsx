import Link from "next/link";
import { ForgotForm } from "@/components/forgot-form";
import { SMTP_READY } from "@/lib/mail";
import { getSetting } from "@/lib/settings";

export const metadata = { title: "Forgot password" };
export const dynamic = "force-dynamic";

export default async function ForgotPage() {
  const wa = (await getSetting("support_whatsapp")).replace(/\D/g, "");
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-[-0.01em]">Forgot your password?</h2>
      {SMTP_READY ? (
        <>
          <p className="mt-2 text-muted">Enter your email and we'll send you a link to choose a new one.</p>
          <ForgotForm />
        </>
      ) : (
        <>
          <p className="mt-2 text-muted">
            Message support with the email you signed up with. We'll check it's you and send a temporary password.
          </p>
          {wa && (
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent("Hi, I forgot my password. My account email is: ")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex h-10 items-center rounded-control bg-pin px-4 text-sm font-semibold text-pin-ink"
            >
              Message support on WhatsApp
            </a>
          )}
        </>
      )}
      <p className="mt-6 text-[13px] text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-pin hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
