"use client";

import { createContext, useContext } from "react";
import { APP_NAME } from "@/lib/utils";

const BrandContext = createContext<{ name: string; custom: boolean; logo?: boolean }>({ name: APP_NAME, custom: false });

export function BrandProvider({ value, children }: { value: { name: string; custom: boolean; logo?: boolean }; children: React.ReactNode }) {
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext);
}

/** The uploaded logo when there is one, otherwise the pin mark and the name. */
export function BrandMark({ className = "h-7" }: { className?: string }) {
  const b = useBrand();
  if (b.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/brand/logo" alt={b.name} className={`${className} w-auto max-w-[160px] object-contain`} />;
  }
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path d="M12 2c4.4 0 7 3.1 7 6.9C19 14.2 12 22 12 22S5 14.2 5 8.9C5 5.1 7.6 2 12 2Z" fill="rgb(var(--pin))" />
        <circle cx="12" cy="9" r="2.6" fill="rgb(var(--night))" />
      </svg>
      <span className="truncate text-[16px] font-semibold tracking-[-0.01em]">{b.name}</span>
    </span>
  );
}
