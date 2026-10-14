import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { audit } from "@/lib/audit";
import { apiAdmin, fail, forbidden } from "@/lib/http";
import { getPlatformSmtp, savePlatformSmtp } from "@/lib/platform-sender";

export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  const p = await getPlatformSmtp();
  return NextResponse.json({ server: p ? { ...p, passEnc: undefined, hasPassword: Boolean(p.passEnc) } : null });
}

/** PATCH { enabled, host, port, user, pass?, domains, defaultFrom, dailyLimit, gapSeconds } — checks the login before saving. */
export async function PATCH(req: Request) {
  const admin = await apiAdmin();
  if (!admin) return forbidden();
  const b = await req.json().catch(() => ({}));
  const host = String(b?.host ?? "").trim();
  const port = Math.round(Number(b?.port ?? 587));
  const user = String(b?.user ?? "").trim();
  const pass = String(b?.pass ?? "");
  const domains = String(b?.domains ?? "")
    .split(/[,\s]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  const defaultFrom = String(b?.defaultFrom ?? "").trim().toLowerCase();
  const dailyLimit = Math.max(1, Math.min(100000, Math.round(Number(b?.dailyLimit ?? 500))));
  const gapSeconds = Math.max(1, Math.min(3600, Math.round(Number(b?.gapSeconds ?? 5))));
  if (b?.enabled) {
    if (!host || !user) return fail("Enter the SMTP server and user name.");
    if (domains.length === 0) return fail("Enter at least one sending domain.");
    if (!domains.some((d) => defaultFrom.endsWith(`@${d}`))) return fail("The default sending address must be on one of the domains.");
    const current = await getPlatformSmtp();
    if (!pass && !current?.passEnc) return fail("Enter the SMTP password.");
    if (pass) {
      try {
        await nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, connectionTimeout: 15000 }).verify();
      } catch (err) {
        return fail(`Couldn't sign in to the server: ${(err instanceof Error ? err.message : "error").slice(0, 200)}`);
      }
    }
  }
  await savePlatformSmtp({ enabled: Boolean(b?.enabled), host, port, user, pass: pass || undefined, domains, defaultFrom, dailyLimit, gapSeconds });
  await audit(admin, "sending-server.edit", null, `${b?.enabled ? "on" : "off"} ${host} ${domains.join(",")}`);
  return NextResponse.json({ ok: true });
}
