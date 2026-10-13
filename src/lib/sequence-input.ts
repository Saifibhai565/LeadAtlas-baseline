export function parseSequenceInput(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = String(b.name ?? "").trim().slice(0, 80);
  const raw = Array.isArray(b.steps) ? b.steps : [];
  const steps = raw.slice(0, 6).map((s: Record<string, unknown>, i: number) => ({
    delayDays: i === 0 ? 0 : Math.min(60, Math.max(1, Math.round(Number(s?.delayDays ?? 3)))),
    subject: String(s?.subject ?? "").trim().slice(0, 200),
    body: String(s?.body ?? "").trim().slice(0, 5000),
  }));
  if (!name) return { error: "Name the sequence." } as const;
  if (steps.length === 0) return { error: "Add at least one email." } as const;
  if (!steps[0].subject) return { error: "The first email needs a subject." } as const;
  if (steps.some((s) => !s.body)) return { error: "Every email needs a message." } as const;
  return { data: { name, steps } } as const;
}
