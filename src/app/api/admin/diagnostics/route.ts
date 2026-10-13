import { statfs } from "node:fs/promises";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { AI_ENABLED, callClaude } from "@/lib/ai";
import { db } from "@/lib/db";
import { enginePing } from "@/lib/engine";
import { apiAdmin, forbidden } from "@/lib/http";
import { SMTP_READY } from "@/lib/mail";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Check = { name: string; ok: boolean | null; detail: string; fix?: string };

async function timed<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms / 1000}s`)), ms))]);
}

async function run(name: string, fn: () => Promise<Omit<Check, "name">>): Promise<Check> {
  try {
    return { name, ...(await fn()) };
  } catch (err) {
    return { name, ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

/** One-click self-test of every part of the system, with what to do when something fails. */
export async function GET() {
  if (!(await apiAdmin())) return forbidden();
  const prod = process.env.NODE_ENV === "production";
  const g = globalThis as unknown as { __tick?: { last: number } };

  const checks = await Promise.all([
    run("Database read and write", async () => {
      await db.appSetting.upsert({ where: { key: "_diag" }, create: { key: "_diag", value: String(Date.now()) }, update: { value: String(Date.now()) } });
      const r = await db.appSetting.findUnique({ where: { key: "_diag" } });
      return { ok: Boolean(r), detail: "Saved and read back a test value." };
    }),
    run("Database health", async () => {
      const r = await db.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check;");
      const v = String(r[0]?.integrity_check ?? "");
      return { ok: v === "ok", detail: v === "ok" ? "No damage found." : v, fix: "Restore the latest backup (see DEPLOY.md)." };
    }),
    run("Database tables up to date", async () => {
      await Promise.all([db.lead.findFirst(), db.campaign.findFirst(), db.site.findFirst(), db.rankCheck.findFirst(), db.errorLog.findFirst(), db.waAccount.findFirst()]);
      return { ok: true, detail: "Every table answered." };
    }).then((c) => (c.ok ? c : { ...c, fix: "Run: npx prisma db push" })),
    run("Scraping engine", async () => {
      const ok = await enginePing();
      return { ok, detail: ok ? "Online." : "Not reachable.", fix: "Start it with go run main.go (on the server: docker compose ps, then logs engine)." };
    }),
    run("Background jobs", async () => {
      const last = g.__tick?.last;
      const mins = last ? Math.round((Date.now() - last) / 60000) : null;
      return {
        ok: mins != null && mins <= 10,
        detail: mins == null ? "Haven't run since the app started." : `Last ran ${mins} min ago.`,
        fix: prod ? "Check the cron container and CRON_SECRET." : "They run while someone has the app open. Open any page and wait a minute.",
      };
    }),
    run("Login security key", async () => {
      const len = (process.env.AUTH_SECRET ?? "").length;
      const weak = /change-this/i.test(process.env.AUTH_SECRET ?? "");
      return { ok: len >= 32 && !weak, detail: weak ? "Still the example value." : `${len} characters.`, fix: "Set AUTH_SECRET to a long random value (openssl rand -hex 32)." };
    }),
    run("App address (APP_URL)", async () => {
      const url = process.env.APP_URL ?? "";
      const ok = Boolean(url) && (!prod || url.startsWith("https://"));
      return { ok, detail: url || "Not set.", fix: "Set APP_URL to your full address, e.g. https://yourdomain.com. Email links use it." };
    }),
    run("Platform email (SMTP)", async () => {
      if (!SMTP_READY) return { ok: null, detail: "Not set up (optional). Emails are printed in the terminal.", fix: "Add SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM." };
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await timed(t.verify(), 15000);
      return { ok: true, detail: `Signed in to ${process.env.SMTP_HOST}.` };
    }).then((c) => (c.ok === false ? { ...c, fix: "Check the SMTP settings. For Gmail, use an App Password." } : c)),
    run("AI", async () => {
      if (!AI_ENABLED) return { ok: null, detail: "No key (optional). AI buttons are hidden.", fix: "Add ANTHROPIC_API_KEY." };
      const r = await timed(callClaude("Reply with the single word OK.", "Test", 5), 30000);
      return { ok: /ok/i.test(r), detail: `Answered: ${r.slice(0, 20)}` };
    }).then((c) => (c.ok === false ? { ...c, fix: "Check the API key and its credit balance." } : c)),
    run("Internet access (website checks)", async () => {
      const res = await timed(fetch("https://www.google.com/robots.txt", { cache: "no-store" }), 10000);
      return { ok: res.ok, detail: res.ok ? "Can reach websites." : `Got ${res.status}.`, fix: "The server can't reach the internet. Check its firewall." };
    }),
    run("OpenStreetMap", async () => {
      const res = await timed(fetch("https://overpass-api.de/api/status", { cache: "no-store" }), 10000);
      return { ok: res.ok, detail: res.ok ? "Reachable." : `Got ${res.status}.` };
    }),
    run("Disk space", async () => {
      const s = await statfs(process.cwd());
      const freeGb = (Number(s.bavail) * Number(s.bsize)) / 1e9;
      return { ok: freeGb > 2, detail: `${freeGb.toFixed(1)} GB free.`, fix: "Free up space or use a bigger server. Old backups can be deleted." };
    }),
    run("Open errors", async () => {
      const n = await db.errorLog.count({ where: { resolved: false } });
      return { ok: n === 0, detail: n ? `${n} kinds of error recorded. See the Errors tab.` : "None.", fix: "Open the Errors tab, send the details to your developer." };
    }),
  ]);
  return NextResponse.json({ checks, at: new Date().toISOString() });
}
