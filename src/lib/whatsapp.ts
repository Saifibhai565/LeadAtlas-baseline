import "server-only";
import { decrypt } from "./crypto";
import { db } from "./db";

const VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";
const GRAPH = `https://graph.facebook.com/${VERSION}`;

export type WaAccountRow = { id: string; userId: string; phoneNumberId: string; wabaId: string; accessTokenEnc: string };

async function graph(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string } };
  if (!res.ok) throw new Error(body.error?.message ?? `WhatsApp answered ${res.status}`);
  return body;
}

export async function waPhoneInfo(phoneNumberId: string, token: string) {
  return graph(`/${phoneNumberId}?fields=display_phone_number,verified_name`, token) as Promise<{ display_phone_number?: string; verified_name?: string }>;
}

export async function waTemplates(acc: WaAccountRow) {
  const out = (await graph(`/${acc.wabaId}/message_templates?fields=name,language,status,category,components&limit=200`, decrypt(acc.accessTokenEnc))) as {
    data?: { name: string; language: string; status: string; category: string; components?: { type: string; text?: string }[] }[];
  };
  return (out.data ?? [])
    .filter((t) => t.status === "APPROVED")
    .map((t) => {
      const body = t.components?.find((c) => c.type === "BODY")?.text ?? "";
      const params = (body.match(/\{\{\d+\}\}/g) ?? []).length;
      return { name: t.name, language: t.language, category: t.category, body, params };
    });
}

async function send(acc: WaAccountRow, payload: object) {
  const out = (await graph(`/${acc.phoneNumberId}/messages`, decrypt(acc.accessTokenEnc), {
    method: "POST",
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  })) as { messages?: { id: string }[] };
  return out.messages?.[0]?.id ?? null;
}

export function waSendText(acc: WaAccountRow, to: string, body: string) {
  return send(acc, { to, type: "text", text: { preview_url: true, body } });
}

export function waSendTemplate(acc: WaAccountRow, to: string, name: string, language: string, params: string[]) {
  return send(acc, {
    to,
    type: "template",
    template: {
      name,
      language: { code: language },
      ...(params.length ? { components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text: text || "-" })) }] } : {}),
    },
  });
}

/** WhatsApp only allows free-form messages within 24 hours of the contact's last message. */
export async function windowOpen(wsId: string, contact: string) {
  const last = await db.waMessage.findFirst({ where: { userId: wsId, contact, direction: "IN" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  return Boolean(last && Date.now() - last.createdAt.getTime() < 24 * 3600_000);
}
