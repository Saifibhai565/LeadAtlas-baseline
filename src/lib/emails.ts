import "server-only";
import { appUrl, type Mail } from "./mail";

/**
 * Email templates. Simple, readable on phones, and with a plain-text version for every email.
 */
const APP = process.env.NEXT_PUBLIC_APP_NAME || "LeadAtlas";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(opts: { heading: string; paragraphs: string[]; button?: { label: string; url: string }; footnote?: string }) {
  const p = opts.paragraphs.map((t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2b3442">${esc(t)}</p>`).join("");
  const btn = opts.button
    ? `<p style="margin:22px 0"><a href="${esc(opts.button.url)}" style="display:inline-block;background:#F2B43C;color:#211602;font-weight:600;font-size:15px;text-decoration:none;padding:12px 20px;border-radius:9px">${esc(opts.button.label)}</a></p>
       <p style="margin:0 0 14px;font-size:13px;color:#6b7686">Or open this link: <a href="${esc(opts.button.url)}" style="color:#9a6700">${esc(opts.button.url)}</a></p>`
    : "";
  const foot = opts.footnote ? `<p style="margin:18px 0 0;font-size:13px;color:#6b7686">${esc(opts.footnote)}</p>` : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f6f9;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e3e7ed;border-radius:14px">
      <tr><td style="padding:28px 28px 8px;font-size:16px;font-weight:700;color:#141a23">${esc(APP)}</td></tr>
      <tr><td style="padding:8px 28px 28px">
        <h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:#141a23">${esc(opts.heading)}</h1>
        ${p}${btn}${foot}
      </td></tr>
    </table>
    <p style="font-size:12px;color:#8a93a2;margin:16px 0 0">${esc(APP)} · <a href="${esc(appUrl())}" style="color:#8a93a2">${esc(appUrl().replace(/^https?:\/\//, ""))}</a></p>
  </td></tr></table></body></html>`;
}

function text(opts: { heading: string; paragraphs: string[]; button?: { label: string; url: string }; footnote?: string }) {
  return [opts.heading, "", ...opts.paragraphs, opts.button ? `\n${opts.button.label}: ${opts.button.url}` : "", opts.footnote ?? ""]
    .filter((x) => x !== undefined)
    .join("\n");
}

function build(to: string, subject: string, opts: Parameters<typeof layout>[0]): Mail {
  return { to, subject, html: layout(opts), text: text(opts) };
}

export const emails = {
  welcomeVerify: (to: string, name: string, link: string) =>
    build(to, `Welcome to ${APP}, confirm your email`, {
      heading: `Welcome, ${name.split(" ")[0]}`,
      paragraphs: [
        `Your ${APP} account is ready. Confirm your email so we can send you password resets and payment receipts.`,
        "Then run your first search: one city and one type of business is enough to start.",
      ],
      button: { label: "Confirm my email", url: link },
      footnote: "The link works for 3 days. If you didn't sign up, ignore this email.",
    }),

  verify: (to: string, link: string) =>
    build(to, "Confirm your email", {
      heading: "Confirm your email",
      paragraphs: ["Click the button to confirm this email address for your account."],
      button: { label: "Confirm my email", url: link },
      footnote: "The link works for 3 days.",
    }),

  reset: (to: string, link: string) =>
    build(to, "Reset your password", {
      heading: "Reset your password",
      paragraphs: ["Someone asked to reset the password for this account. If it was you, choose a new password below."],
      button: { label: "Choose a new password", url: link },
      footnote: "The link works for 1 hour and only once. If you didn't ask for this, you can ignore this email; your password stays the same.",
    }),

  invite: (to: string, ownerName: string, link: string) =>
    build(to, `${ownerName} invited you to ${APP}`, {
      heading: `Join ${ownerName}'s team`,
      paragraphs: [`${ownerName} wants you to work on their leads with them in ${APP}.`, "Create your sign-in with the button below."],
      button: { label: "Join the team", url: link },
      footnote: "This invite works once.",
    }),

  paymentReceived: (to: string, plan: string, amount: string, ref: string) =>
    build(to, `We got your payment details for ${plan}`, {
      heading: "Payment details received",
      paragraphs: [
        `Thanks. We received your payment details for the ${plan} plan (${amount}, transaction ${ref}).`,
        "We'll confirm it soon, usually within a few hours, and email you as soon as your plan is on.",
      ],
      button: { label: "See billing", url: appUrl("/billing") },
    }),

  paymentApproved: (to: string, plan: string, credits: number, until: Date) =>
    build(to, `Your ${plan} plan is on`, {
      heading: `Your ${plan} plan is on`,
      paragraphs: [
        `Your payment is confirmed. We added ${credits.toLocaleString("en-US")} credits to your account.`,
        `The plan is active until ${until.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`,
      ],
      button: { label: "Start searching", url: appUrl("/searches") },
    }),

  paymentRejected: (to: string, plan: string, reason: string | null) =>
    build(to, "We couldn't confirm your payment", {
      heading: "We couldn't confirm your payment",
      paragraphs: [
        `We couldn't confirm your payment for the ${plan} plan.`,
        reason ? `Reason: ${reason}` : "Please check the transaction ID and send it again.",
        "If you think this is a mistake, reply to this email or contact support.",
      ],
      button: { label: "Go to billing", url: appUrl("/billing") },
    }),

  adminNewPayment: (to: string, who: string, plan: string, amount: string, method: string, ref: string) =>
    build(to, `New payment: ${who}, ${plan}`, {
      heading: "A payment is waiting for review",
      paragraphs: [`${who} paid for ${plan}: ${amount} by ${method}, transaction ${ref}.`, "Check it in your account, then approve it."],
      button: { label: "Review payments", url: appUrl("/admin") },
    }),

  planExpiring: (to: string, plan: string, until: Date) =>
    build(to, `Your ${plan} plan ends soon`, {
      heading: `Your ${plan} plan ends on ${until.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`,
      paragraphs: ["Renew to keep your monthly credits, team seats and features. Your leads stay saved either way."],
      button: { label: "Renew now", url: appUrl("/billing") },
    }),

  watchFound: (to: string, watchName: string, count: number, link: string) =>
    build(to, `${count} new businesses in “${watchName}”`, {
      heading: `${count} new businesses found`,
      paragraphs: [
        `Your watch “${watchName}” found ${count} businesses you didn't have before.`,
        "New businesses are often the most open to offers. Reach out while they're still setting up.",
      ],
      button: { label: "See them", url: link },
      footnote: "You can turn these emails off in Settings.",
    }),

  weeklyReport: (to: string, name: string, d: { winRate: number; won: number; wonValue: number; newLeads: number; contacted: number }, link: string) =>
    build(to, `Your weekly report: ${d.newLeads} new leads`, {
      heading: `Your week, ${name.split(" ")[0]}`,
      paragraphs: [
        `New leads: ${d.newLeads}. Contacted: ${d.contacted}. Deals won: ${d.won} (value ${d.wonValue.toLocaleString("en-US")}). Win rate: ${d.winRate}%.`,
        "Open the full report for your funnel, best sending times and mailbox performance.",
      ],
      button: { label: "Open full report", url: link },
      footnote: "You get this every Monday. Turn it off in Analytics.",
    }),

  weeklyDigest: (
    to: string,
    name: string,
    d: { newLeads: number; contacted: number; interested: number; won: number; due: number; hot: { title: string; score: number }[] },
  ) =>
    build(to, `Your week: ${d.newLeads} new leads, ${d.due} follow-ups due`, {
      heading: `Your week, ${name.split(" ")[0]}`,
      paragraphs: [
        `In the last 7 days: ${d.newLeads} new leads, ${d.contacted} contacted, ${d.interested} interested, ${d.won} won.`,
        d.due > 0 ? `You have ${d.due} follow-up${d.due > 1 ? "s" : ""} due. A quick message today keeps them warm.` : "No follow-ups are due. A good week to reach new leads.",
        ...(d.hot.length ? ["Best leads you haven't contacted yet:", ...d.hot.map((h) => `• ${h.title} (score ${h.score})`)] : []),
      ],
      button: { label: "Open your dashboard", url: appUrl("/dashboard") },
      footnote: "You get this every Monday. Turn it off in Settings with the email alerts switch.",
    }),

  test: (to: string) =>
    build(to, `${APP} test email`, {
      heading: "Your email settings work",
      paragraphs: ["If you're reading this, the SMTP settings are correct and emails will be delivered."],
    }),
};
