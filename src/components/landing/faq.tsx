"use client";

import { useState } from "react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <dl className="divide-y divide-white/10 border-y border-white/10">
      {items.map((f, i) => (
        <div key={f.q}>
          <dt>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="flex w-full items-center justify-between gap-6 py-6 text-left text-[18px] font-medium text-[#E9EEF7] hover:text-[#F2B43C]"
            >
              {f.q}
              <span className={`text-2xl leading-none text-[#F2B43C] transition-transform ${open === i ? "rotate-45" : ""}`} aria-hidden>
                +
              </span>
            </button>
          </dt>
          {open === i && <dd className="max-w-2xl pb-6 text-[16px] leading-7 text-[#A3AEC2]">{f.a}</dd>}
        </div>
      ))}
    </dl>
  );
}
