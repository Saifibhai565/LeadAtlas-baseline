import "server-only";
import nodemailer from "nodemailer";
import { decrypt } from "./crypto";
import { db } from "./db";

/**
 * Warmup network: enrolled mailboxes send friendly emails to each other and reply to them.
 * This builds a real sending history so the inbox provider trusts the mailbox.
 * Everything stays between the user's own enrolled mailboxes (and, if they opt in, other users').
 */
const SUBJECTS = ["Quick question about next week", "Following up", "Re: our chat", "Project update", "Thanks for earlier", "Catching up", "A quick note", "Re: the proposal"];
const BODIES = [
  "Hi,\n\nThanks for the note earlier. Let's catch up next week, I'm free most mornings.\n\nBest",
  "Hello,\n\nJust confirming we're on track. Let me know if anything changed.\n\nCheers",
  "Hi there,\n\nAppreciated your help. I'll send the details over shortly.\n\nThanks",
  "Hi,\n\nSounds good to me. Talk soon and have a great week.\n\nRegards",
];
const REPLIES = ["Thanks, that works for me.", "Great, talk soon.", "Perfect, appreciate it.", "Sounds good, thank you.", "Noted, thanks for the update."];
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/** How many warmup emails a mailbox sends per day, ramping up over four weeks. */
export function warmupCap(stage: number) {
  return Math.min(40, 4 + stage * 4);
}

function transport(m: { host: string; port: number; username: string; passEnc: string }) {
  return nodemailer.createTransport({ host: m.host, port: m.port, secure: m.port === 465, auth: { user: m.username, pass: decrypt(m.passEnc) } });
}

/** One warmup tick: each enrolled mailbox sends a few emails to peers and replies to a couple it received. */
export async function runWarmup() {
  const boxes = await db.mailbox.findMany({ where: { warmup: true, active: true } });
  if (boxes.length < 2) return; // need at least two to talk to each other
  const dayAgo = new Date(Date.now() - 24 * 3600_000);

  for (const mb of boxes) {
    const peers: typeof boxes = boxes.filter((p) => p.id !== mb.id && (p.userId === mb.userId || true)); // own mailboxes always; others form the shared network
    if (peers.length === 0) continue;
    const sentToday = await db.warmupEmail.count({ where: { fromId: mb.id, createdAt: { gte: dayAgo } } });
    const cap = warmupCap(mb.warmupStage);
    const toSend = Math.min(2, cap - sentToday); // a couple per tick, spread through the day
    if (toSend <= 0) continue;

    let t;
    try {
      t = transport(mb);
    } catch {
      continue;
    }
    for (let i = 0; i < toSend; i++) {
      const peer: (typeof boxes)[number] = pick(peers);
      const subject = pick(SUBJECTS);
      try {
        await t.sendMail({ from: `${mb.fromName} <${mb.fromEmail}>`, to: peer.fromEmail, subject, text: pick(BODIES), headers: { "X-Warmup": "1" } });
        await db.warmupEmail.create({ data: { fromId: mb.id, toId: peer.id, subject } });
      } catch {
        /* skip this one */
      }
    }

    // Reply to a couple of warmup emails this mailbox received, so conversations look real
    const incoming = await db.warmupEmail.findMany({ where: { toId: mb.id, replied: false, createdAt: { gte: new Date(Date.now() - 3 * 86400_000) } }, take: 2 });
    for (const w of incoming) {
      const sender = boxes.find((b) => b.id === w.fromId);
      if (!sender) continue;
      try {
        await t.sendMail({ from: `${mb.fromName} <${mb.fromEmail}>`, to: sender.fromEmail, subject: `Re: ${w.subject}`, text: pick(REPLIES), headers: { "X-Warmup": "1" } });
        await db.warmupEmail.update({ where: { id: w.id }, data: { replied: true } });
      } catch {
        /* ignore */
      }
    }
  }

  // Advance each mailbox's stage once a day (ramps the cap up)
  for (const mb of boxes) {
    const last = await db.warmupEmail.findFirst({ where: { fromId: mb.id }, orderBy: { createdAt: "asc" } });
    const days = last ? Math.floor((Date.now() - last.createdAt.getTime()) / 86400_000) : 0;
    const stage = Math.min(8, Math.floor(days / 3));
    if (stage !== mb.warmupStage) await db.mailbox.update({ where: { id: mb.id }, data: { warmupStage: stage } });
  }
}
