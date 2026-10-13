export function parseTemplate(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = String(b.name ?? "").trim().slice(0, 80);
  const channel = b.channel === "EMAIL" ? "EMAIL" : "WHATSAPP";
  const subject = channel === "EMAIL" ? String(b.subject ?? "").trim().slice(0, 200) || null : null;
  const text = String(b.body ?? "").trim().slice(0, 4000);
  if (!name) return { error: "Name the template." } as const;
  if (!text) return { error: "Write the message." } as const;
  return { data: { name, channel, subject, body: text } } as const;
}
