"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toggleTheme } from "@/lib/theme";
import { useT } from "./i18n-provider";

const GO: [string, string, string][] = [
  ["d", "/dashboard", "nav.dashboard"],
  ["l", "/leads", "nav.leads"],
  ["s", "/searches", "nav.searches"],
  ["p", "/pipeline", "nav.pipeline"],
  ["i", "/inbox", "nav.inbox"],
  ["e", "/outreach", "nav.outreach"],
  ["b", "/billing", "nav.billing"],
  ["a", "/analytics", "nav.analytics"],
];

/** App-wide keyboard shortcuts. "g then d" = go to Dashboard; "?" = help; "t" = theme. */
export function Shortcuts() {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [goMode, setGoMode] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") {
        setOpen((v) => !v);
        return;
      }
      if (open && e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (goMode) {
        const match = GO.find(([k]) => k === e.key.toLowerCase());
        if (match) router.push(match[1]);
        setGoMode(false);
        if (timer) clearTimeout(timer);
        return;
      }
      if (e.key.toLowerCase() === "g") {
        setGoMode(true);
        timer = setTimeout(() => setGoMode(false), 1200);
        return;
      }
      if (e.key.toLowerCase() === "t") toggleTheme();
      if (e.key.toLowerCase() === "n") router.push("/searches");
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer) clearTimeout(timer);
    };
  }, [router, open, goMode]);

  if (!open) {
    return goMode ? (
      <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-control bg-night px-3 py-1.5 text-[13px] text-ink shadow-lg" dir="ltr">
        {t("sc.go", "Go to")}… (d, l, s, p, i, e, b, a)
      </div>
    ) : null;
  }

  const Row = ({ keys, label }: { keys: string; label: string }) => (
    <div className="flex items-center justify-between gap-6 py-1.5 text-sm">
      <span>{label}</span>
      <kbd className="rounded bg-raised px-2 py-0.5 font-mono text-[12px]" dir="ltr">
        {keys}
      </kbd>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-panel border border-line bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-[15px] font-semibold">{t("sc.title", "Keyboard shortcuts")}</h2>
        <p className="mb-2 text-[13px] font-medium text-muted">{t("sc.go", "Go to")}</p>
        {GO.map(([k, , key]) => (
          <div key={k}>
            <Row keys={"g " + k} label={String(t(key, key))} />
          </div>
        ))}
        <p className="mb-2 mt-4 text-[13px] font-medium text-muted">{t("sc.actions", "Actions")}</p>
        <Row keys="Ctrl K" label={t("sc.openSearch", "Open command menu")} />
        <Row keys="n" label={t("sc.newSearch", "New search")} />
        <Row keys="t" label={t("sc.toggleTheme", "Switch light/dark")} />
        <Row keys="?" label={t("sc.showShortcuts", "Show this help")} />
        <button onClick={() => setOpen(false)} className="mt-5 w-full rounded-control bg-pin py-2 text-sm font-semibold text-pin-ink">
          OK
        </button>
      </div>
    </div>
  );
}
