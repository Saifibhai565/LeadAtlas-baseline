import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/leads";
import { notify } from "@/lib/notify";
import { whatsappNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ accountId: string }> };

/** Meta checks the webhook once with a GET when you save it in the app dashboard. */
export async function GET(req: Request, { params }: Ctx) {
  const { accountId } = await params;
  const p = new URL(req.url).searchParams;
  const acc = await db.waAccount.findUnique({ where: { id: accountId } });
  if (acc && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === acc.verifyToken) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type Change = {
  value?: {
    contacts?: { wa_id: string; profile?: { name?: string } }[];
    messages?: { from: string; id: string; type: string; text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string } } }[];
    statuses?: { id: string; status: string; errors?: { title?: string; message?: string }[] }[];
  };
};

export async function POST(req: Request, { params }: Ctx) {
  const { accountId } = await params;
  const acc = await db.waAccount.findUnique({ where: { id: accountId } });
  if (!acc) return new Response("Unknown", { status: 404 });
  const raw = await req.text();

  if (acc.appSecretEnc) {
    const sig = (req.headers.get("x-hub-signature-256") ?? "").replace(/^sha256=/, "");
    const expected = createHmac("sha256", decrypt(acc.appSecretEnc)).update(raw).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Bad signature", { status: 401 });
  }

  const payload = JSON.parse(raw) as { entry?: { changes?: Change[] }[] };
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};

      for (const st of v.statuses ?? []) {
        await db.waMessage
          .updateMany({ where: { waId: st.id }, data: { status: st.status, error: st.errors?.[0]?.message ?? st.errors?.[0]?.title ?? null } })
          .catch(() => undefined);
      }

      for (const m of v.messages ?? []) {
        if (await db.waMessage.findUnique({ where: { waId: m.id } })) continue; // Meta retries
        const contact = m.from.replace(/\D/g, "");
        const name = v.contacts?.find((c) => c.wa_id === m.from)?.profile?.name;
        const body = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? `[${m.type}]`;

        // Find the lead with this number, or add them as a new lead
        const candidates = await db.lead.findMany({
          where: { userId: acc.userId, phone: { not: null }, OR: [{ phone: { contains: contact.slice(-9) } }] },
          take: 20,
        });
        let lead = candidates.find((l) => whatsappNumber(l.phone) === contact) ?? null;
        if (!lead) {
          lead = await db.lead.create({
            data: {
              userId: acc.userId,
              placeKey: `wa|${contact}`,
              title: name || `+${contact}`,
              phone: `+${contact}`,
              source: "WHATSAPP",
              optIn: true,
              optInAt: new Date(),
            },
          }).catch(async () => db.lead.findUnique({ where: { userId_placeKey: { userId: acc.userId, placeKey: `wa|${contact}` } } }));
        } else if (!lead.optIn) {
          // Messaging you counts as agreeing to a conversation
          await db.lead.update({ where: { id: lead.id }, data: { optIn: true, optInAt: new Date() } });
        }

        await db.waMessage.create({
          data: { userId: acc.userId, leadId: lead?.id ?? null, contact, direction: "IN", kind: m.type === "text" ? "text" : "other", body, waId: m.id, status: "received" },
        });
        if (lead) {
          await logActivity(acc.userId, lead.id, "NOTE", `They replied on WhatsApp: ${body}`);
          // A reply stops their email sequences
          await db.sequenceEnrollment.updateMany({ where: { leadId: lead.id, status: "ACTIVE" }, data: { status: "REPLIED", endedAt: new Date() } });
        }
        await notify(acc.userId, `New WhatsApp from ${name || lead?.title || `+${contact}`}`, body.slice(0, 140), "/inbox");
      }
    }
  }
  return NextResponse.json({ ok: true });
}
