"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Audit = { score: number; platform?: string; checks: { key: string; ok: boolean; label: string; tip: string }[] };

export function AuditList({ json, empty }: { json: string | null; empty: string }) {
  let a: Audit | null = null;
  try {
    a = json ? (JSON.parse(json) as Audit) : null;
  } catch {
    a = null;
  }
  if (!a) return <p className="text-[13px] text-muted">{empty}</p>;
  return (
    <div className="space-y-2 text-[13px]">
      <p>
        <span className={cn("tabular font-semibold", a.score >= 75 ? "text-ok" : a.score >= 50 ? "text-pin" : "text-danger")}>{a.score}/100</span>
        {a.platform && <span className="text-muted"> · {a.platform} store</span>}
      </p>
      <ul className="space-y-1.5">
        {a.checks.map((c) => (
          <li key={c.key} className="flex gap-2">
            {c.ok ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" aria-hidden /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />}
            <span>
              {c.label}
              {!c.ok && <span className="block text-muted">{c.tip}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
