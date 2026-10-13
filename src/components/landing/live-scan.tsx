"use client";

import { useEffect, useMemo, useState } from "react";

/** Hero: a city map being scanned, pins appearing, and a live feed of businesses found. Sample data only. */
const FOUND = [
  { name: "Noor Dental Care", cat: "Dentist", rating: 4.6, reviews: 87, tag: "No website", score: 84, x: 22, y: 34 },
  { name: "Grill House", cat: "Restaurant", rating: 4.3, reviews: 412, tag: "Busy", score: 77, x: 61, y: 22 },
  { name: "Bloom Salon", cat: "Beauty salon", rating: 4.8, reviews: 36, tag: "Recently opened", score: 81, x: 44, y: 61 },
  { name: "City Pharmacy", cat: "Pharmacy", rating: 4.1, reviews: 129, tag: "Slow website", score: 66, x: 78, y: 48 },
  { name: "Aroma Café", cat: "Café", rating: 4.5, reviews: 203, tag: "Runs ads", score: 72, x: 30, y: 78 },
  { name: "Prime Motors", cat: "Car repair", rating: 3.8, reviews: 58, tag: "Rating dropped", score: 69, x: 69, y: 76 },
  { name: "Little Steps School", cat: "School", rating: 4.7, reviews: 91, tag: "Facebook only", score: 79, x: 14, y: 58 },
  { name: "Urban Fitness", cat: "Gym", rating: 4.4, reviews: 167, tag: "Not mobile-friendly", score: 74, x: 86, y: 30 },
];

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

export function LiveScan() {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(reduced ? FOUND.length : 0);

  useEffect(() => {
    if (reduced) return setCount(FOUND.length);
    setCount(0);
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % (FOUND.length + 3); // pause a moment on the full map, then rescan
      setCount(Math.min(i, FOUND.length));
    }, 1100);
    return () => clearInterval(t);
  }, [reduced]);

  // Street grid: a few irregular avenues so it reads as a city, not graph paper
  const streets = useMemo(() => {
    const v = [8, 19, 27, 38, 52, 59, 71, 83, 92];
    const h = [12, 26, 41, 50, 66, 79, 90];
    return { v, h };
  }, []);

  const shown = FOUND.slice(0, count);
  const feed = [...shown].reverse().slice(0, 4);

  return (
    <div className="scan-card relative w-full overflow-hidden rounded-[22px] border border-white/10 bg-[#0B1322] shadow-[0_40px_120px_-40px_rgba(242,180,60,0.35)]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-[12px] text-[#8592A8]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#3DD6B5]" aria-hidden />
          Scanning “dentist, salon, café” in Lahore
        </span>
        <span className="tabular text-[#E9EEF7]">{count} found</span>
      </div>

      <div className="relative aspect-[16/11] w-full">
        <svg viewBox="0 0 100 70" className="absolute inset-0 h-full w-full" aria-hidden>
          <rect width="100" height="70" fill="#0B1322" />
          {/* blocks */}
          {streets.v.slice(0, -1).map((x, i) =>
            streets.h.slice(0, -1).map((y, j) => (
              <rect
                key={`${i}-${j}`}
                x={x + 0.8}
                y={(y * 70) / 100 + 0.8}
                width={streets.v[i + 1] - x - 1.6}
                height={((streets.h[j + 1] - y) * 70) / 100 - 1.6}
                rx="0.6"
                fill={(i * 7 + j * 3) % 5 === 0 ? "#132034" : "#0F192A"}
              />
            )),
          )}
          {/* river */}
          <path d="M-2,58 C18,50 30,64 50,55 S80,44 102,50" stroke="#16304A" strokeWidth="3.2" fill="none" />
          {/* main roads */}
          <path d="M0,24 L100,30" stroke="#1E2C42" strokeWidth="1.2" />
          <path d="M44,0 L52,70" stroke="#1E2C42" strokeWidth="1.2" />
        </svg>

        {/* scan beam */}
        {!reduced && <div className="scan-beam absolute inset-y-0 w-1/3" aria-hidden />}

        {/* pins */}
        {shown.map((f, i) => (
          <div key={f.name} className="pin-drop absolute" style={{ left: `${f.x}%`, top: `${f.y}%`, animationDelay: reduced ? "0s" : `${i === count - 1 ? 0 : 0}s` }}>
            <span className="pin-ring" aria-hidden />
            <svg viewBox="0 0 24 24" className="relative h-6 w-6 -translate-x-1/2 -translate-y-full drop-shadow-[0_4px_10px_rgba(242,180,60,0.6)]" aria-hidden>
              <path d="M12 2c4.4 0 7 3.1 7 6.9C19 14.2 12 22 12 22S5 14.2 5 8.9C5 5.1 7.6 2 12 2Z" fill="#F2B43C" />
              <circle cx="12" cy="9" r="2.6" fill="#0B1322" />
            </svg>
          </div>
        ))}

        {/* latest find card */}
        {shown.length > 0 && (
          <div
            key={shown[shown.length - 1].name}
            className="find-card absolute rounded-xl border border-white/10 bg-[#0E1828]/95 px-3 py-2 text-[11px] text-[#E9EEF7] shadow-xl backdrop-blur"
            style={{
              left: `min(${shown[shown.length - 1].x}%, 62%)`,
              top: `calc(${shown[shown.length - 1].y}% + 8px)`,
            }}
          >
            <p className="font-semibold">{shown[shown.length - 1].name}</p>
            <p className="text-[#8592A8]">
              ★ {shown[shown.length - 1].rating} ({shown[shown.length - 1].reviews}) · <span className="text-[#F2B43C]">{shown[shown.length - 1].tag}</span>
            </p>
          </div>
        )}
      </div>

      {/* live feed */}
      <ul className="divide-y divide-white/5 border-t border-white/10" aria-label="Businesses found">
        {feed.map((f) => (
          <li key={f.name} className="feed-row flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]">
            <span className="min-w-0">
              <span className="block truncate font-medium text-[#E9EEF7]">{f.name}</span>
              <span className="text-[12px] text-[#8592A8]">
                {f.cat} · <span className="text-[#F2B43C]">{f.tag}</span>
              </span>
            </span>
            <span className="tabular shrink-0 rounded-md bg-[#F2B43C]/15 px-2 py-0.5 text-[12px] font-semibold text-[#F2B43C]">{f.score}</span>
          </li>
        ))}
        {feed.length === 0 && <li className="px-5 py-2.5 text-[13px] text-[#8592A8]">Starting scan…</li>}
      </ul>
    </div>
  );
}
