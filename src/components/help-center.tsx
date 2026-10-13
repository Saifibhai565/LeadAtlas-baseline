"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { HELP } from "@/lib/help";
import { cn } from "@/lib/utils";

export function HelpCenter() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>("start");
  const term = q.trim().toLowerCase();
  const list = term ? HELP.filter((a) => `${a.title} ${a.summary} ${a.steps.join(" ")}`.toLowerCase().includes(term)) : HELP;
  return (
    <div className="max-w-3xl space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the guides" className="pl-9" aria-label="Search the guides" />
      </div>
      {list.length === 0 && <p className="text-sm text-muted">No guide matches. Use the help button at the bottom right to ask us.</p>}
      <Panel className="divide-y divide-line">
        {list.map((a) => {
          const isOpen = open === a.id || Boolean(term);
          return (
            <div key={a.id}>
              <button onClick={() => setOpen(open === a.id ? null : a.id)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left" aria-expanded={isOpen}>
                <span>
                  <span className="block font-medium">{a.title}</span>
                  <span className="text-[13px] text-muted">{a.summary}</span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform", isOpen && "rotate-180")} aria-hidden />
              </button>
              {isOpen && (
                <div className="px-5 pb-5">
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                    {a.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  {a.link && (
                    <Link href={a.link} className="mt-3 inline-block text-[13px] font-medium text-pin hover:underline">
                      Go there
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Panel>
    </div>
  );
}
