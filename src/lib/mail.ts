import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export const SMTP_READY = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export function appUrl(path = "") {
  return `${(process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "")}${path}`;
}

let transport: Transporter | null = null;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

export type Mail = { to: string; subject: string; html: string; text: string };

/**
 * Sends an email. Never throws: returns false when it couldn't send.
 * Without SMTP settings the email is printed in the terminal, so you can still test every flow.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (!SMTP_READY) {
    console.log(`\n[email not sent: SMTP not set up]\nTo: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n`);
    return false;
  }
  try {
    await getTransport().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return true;
  } catch (err) {
    console.error("Email failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Fire-and-forget version for places where the email is a courtesy. */
export function sendMailLater(mail: Mail) {
  sendMail(mail).catch(() => undefined);
}

export function adminAlertEmail() {
  return process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || null;
}
