"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, CornerDownLeft, Search } from "lucide-react";
import { toggleTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Item = { id: string; label: string; hint?: string; run: () => void; group: string };

export function CommandPalette({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [leads, setLeads] = useState<{ id: string; title: string; category: string | null }[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setLeads([]);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);

  // Search leads by name as you type
  useEffect(() => {
    if (!open || q.trim().length < 2) return setLeads([]);
    const t = setTimeout(() => {
      fetch(`/api/leads?q=${encodeURIComponent(q.trim())}&page=1`)
        .then((r) => r.json())
        .then((b) => setLeads((b.items ?? []).slice(0, 5)))
        .catch(() => undefined);
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  const go = (href: string) => () => {
    setOpen(false);
    router.push(href);
  };

  const items: Item[] = useMemo(() => {
    const pages: Item[] = [
      { id: "new", label: "New search", group: "Actions", run: go("/searches") },
      { id: "import", label: "Import or add leads", group: "Actions", run: go("/leads?import=1") },
      { id: "watch", label: "New watch", group: "Actions", run: go("/watches") },
      { id: "check", label: "Check websites", group: "Actions", run: go("/enrich") },
      {
        id: "theme",
        label: "Switch light or dark theme",
        group: "Actions",
        run: () => {
          toggleTheme();
          setOpen(false);
          router.refresh();
        },
      },
      { id: "dashboard", label: "Dashboard", group: "Go to", run: go("/dashboard") },
      { id: "leads", label: "Leads", group: "Go to", run: go("/leads") },
      { id: "best", label: "Best leads first", hint: "Leads sorted by score", group: "Go to", run: go("/leads?sort=score&status=NEW") },
      { id: "nosite", label: "Leads with no website", group: "Go to", run: go("/leads?website=0") },
      { id: "due", label: "Follow-ups due", group: "Go to", run: go("/leads?followUp=due") },
      { id: "pipeline", label: "Pipeline", group: "Go to", run: go("/pipeline") },
      { id: "templates", label: "Templates", group: "Go to", run: go("/templates") },
      { id: "extract", label: "Web extractor", group: "Go to", run: go("/extract") },
      { id: "team", label: "Team", group: "Go to", run: go("/team") },
      { id: "billing", label: "Billing", group: "Go to", run: go("/billing") },
      { id: "dev", label: "API and extension", group: "Go to", run: go("/developers") },
      { id: "settings", label: "Settings", group: "Go to", run: go("/settings") },
      ...(isAdmin ? [{ id: "admin", label: "Admin", group: "Go to", run: go("/admin") }] : []),
    ];
    const term = q.trim().toLowerCase();
    const filtered = term ? pages.filter((p) => p.label.toLowerCase().includes(term) || p.hint?.toLowerCase().includes(term)) : pages;
    const leadItems: Item[] = leads.map((l) => ({
      id: `lead-${l.id}`,
      label: l.title,
      hint: l.category ?? undefined,
      group: "Leads",
      run: go(`/leads?q=${encodeURIComponent(l.title)}`),
    }));
    return [...leadItems, ...filtered];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, leads, isAdmin]);

  useEffect(() => setActive(0), [q, leads.length]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    }
  }

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal aria-label="Command menu">
      <button className="absolute inset-0 bg-night/70" onClick={() => setOpen(false)} aria-label="Close" />
      <div className="relative w-full max-w-lg overflow-hidden rounded-panel border border-line bg-surface shadow-2xl" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Go to a page, run an action, or find a lead"
            className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-muted/70"
            aria-label="Command"
          />
          <kbd className="rounded border border-line px-1.5 text-[11px] text-muted">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Nothing matches “{q}”.</li>}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            return (
              <li key={it.id}>
                {header && <p className="px-3 pb-1 pt-2 text-[12px] text-muted">{header}</p>}
                <button
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={it.run}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-sm",
                    i === active ? "bg-raised text-ink" : "text-muted",
                  )}
                >
                  {it.group === "Leads" && <Building2 className="h-4 w-4 shrink-0" aria-hidden />}
                  <span className="truncate">{it.label}</span>
                  {it.hint && <span className="truncate text-[12px] text-muted">{it.hint}</span>}
                  {i === active && <CornerDownLeft className="ml-auto h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
