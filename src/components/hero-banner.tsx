"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatNumber } from "@/lib/utils";

/** Animated dashboard banner: a radar sweeping a city grid, pins lighting up as leads are found. */
export function HeroBanner({ name, total, week, hot, due }: { name: string; total: number; week: number; hot: number; due: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1200);
      setShown(Math.round(total * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  const pins = [
    [18, 32], [34, 62], [52, 24], [66, 70], [78, 38], [44, 46], [88, 60], [26, 78], [60, 52], [72, 18],
  ];

  return (
    <section className="hero relative mb-6 overflow-hidden rounded-panel border border-line">
      <div className="hero-bg absolute inset-0" aria-hidden />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M5 0H0V5" fill="none" stroke="rgb(var(--pin))" strokeOpacity="0.12" strokeWidth="0.15" />
          </pattern>
          <radialGradient id="sweep" cx="0" cy="0" r="1">
            <stop offset="0" stopColor="rgb(var(--pin))" stopOpacity="0.35" />
            <stop offset="1" stopColor="rgb(var(--pin))" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
      </svg>
      <div className="radar absolute right-[6%] top-1/2 hidden h-[260px] w-[260px] -translate-y-1/2 md:block" aria-hidden>
        <div className="radar-ring" style={{ inset: "0%" }} />
        <div className="radar-ring" style={{ inset: "18%" }} />
        <div className="radar-ring" style={{ inset: "36%" }} />
        <div className="radar-sweep" />
        {pins.map(([x, y], i) => (
          <span key={i} className="radar-pin" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i * 0.37) % 3}s` }} />
        ))}
      </div>

      <div className="relative px-6 py-8 sm:px-8">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-pin">Live lead radar</p>
        <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[36px]">Welcome back, {name}</h1>
        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <p className="tabular text-[40px] font-semibold leading-none">{formatNumber(shown)}</p>
            <p className="mt-1 text-[13px] text-muted">leads on your map</p>
          </div>
          <div>
            <p className="tabular text-[40px] font-semibold leading-none text-ok">+{formatNumber(week)}</p>
            <p className="mt-1 text-[13px] text-muted">this week</p>
          </div>
          <div>
            <p className="tabular text-[40px] font-semibold leading-none text-pin">{formatNumber(hot)}</p>
            <p className="mt-1 text-[13px] text-muted">hot leads (70+)</p>
          </div>
          <div>
            <p className="tabular text-[40px] font-semibold leading-none">{formatNumber(due)}</p>
            <p className="mt-1 text-[13px] text-muted">follow-ups due</p>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/searches" className="glow-btn inline-flex h-10 items-center rounded-control bg-pin px-5 text-sm font-semibold text-pin-ink">
            Find new leads
          </Link>
          <Link href="/leads?sort=score&status=NEW" className="inline-flex h-10 items-center rounded-control border border-line bg-surface/70 px-5 text-sm backdrop-blur hover:border-pin/50">
            Contact the best ones
          </Link>
        </div>
      </div>
    </section>
  );
}
