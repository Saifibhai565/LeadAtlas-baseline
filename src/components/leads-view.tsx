"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  List,
  Map as MapIcon,
  Plus,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge, Panel } from "@/components/ui/panel";
import { useAiAvailable } from "./ai-panels";
import { EnrollControls } from "./enroll-controls";
import { SocialLinks } from "./social-links";
import { useFeatures } from "./use-features";
import { SIGNAL_INFO } from "@/lib/signals";
import { useT } from "./i18n-provider";
import { ImportLeads } from "./import-leads";
import { LeadDrawer } from "./lead-drawer";
import { ISSUE_INFO, issueList, scoreTone } from "@/lib/issues";
import { cn, formatNumber, websiteHost, whatsappNumber } from "@/lib/utils";

const LeadsMap = dynamic(() => import("./leads-map").then((m) => m.LeadsMap), {
  ssr: false,
  loading: () => <div className="h-[620px] animate-pulse bg-raised/40" />,
});

type Lead = {
  id: string;
  title: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  emails: string | null;
  rating: number | null;
  reviewCount: number | null;
  mapsUrl: string | null;
  status: string;
  createdAt: string;
  emailStatus: string | null;
  socials: string | null;
  auditScore: number | null;
  auditIssues: string | null;
  enrichStatus: string;
  source: string;
  score: number | null;
  aiMessage: string | null;
  tags: string | null;
  signals: string | null;
  quality: number | null;
  pinned: boolean;
};

type Filters = {
  q: string;
  phone: boolean;
  email: boolean;
  website: "" | "1" | "0";
  minRating: string;
  minReviews: string;
  category: string;
  status: string;
  issue: string;
  socials: boolean;
  emailValid: boolean;
  source: string;
  followUp: boolean;
  sort: string;
  mine: boolean;
  unhappy: boolean;
  tag: string;
  pinned: boolean;
  signal: string;
  tech: string;
};

type SavedView = { id: string; name: string; query: string };

const EMPTY: Filters = {
  q: "",
  phone: false,
  email: false,
  website: "",
  minRating: "",
  minReviews: "",
  category: "",
  status: "",
  issue: "",
  socials: false,
  emailValid: false,
  source: "",
  followUp: false,
  sort: "",
  mine: false,
  unhappy: false,
  tag: "",
  pinned: false,
  signal: "",
  tech: "",
};

const STATUSES = [
  ["NEW", "New"],
  ["CONTACTED", "Contacted"],
  ["INTERESTED", "Interested"],
  ["WON", "Won"],
  ["LOST", "Lost"],
] as const;

const STATUS_COLOR: Record<string, string> = {
  NEW: "text-muted",
  CONTACTED: "text-info",
  INTERESTED: "text-pin",
  WON: "text-ok",
  LOST: "text-danger",
};

function filtersFromQuery(s: URLSearchParams): Filters {
  const w = s.get("website");
  return {
    q: s.get("q") ?? "",
    phone: s.get("phone") === "1",
    email: s.get("email") === "1",
    website: w === "1" || w === "0" ? w : "",
    minRating: s.get("minRating") ?? "",
    minReviews: s.get("minReviews") ?? "",
    category: s.get("category") ?? "",
    status: s.get("status") ?? "",
    issue: s.get("issue") ?? "",
    socials: s.get("socials") === "1",
    emailValid: s.get("emailValid") === "1",
    source: s.get("source") ?? "",
    followUp: s.get("followUp") === "due",
    sort: s.get("sort") ?? "",
    mine: s.get("assigned") === "me",
    unhappy: s.get("unhappy") === "1",
    tag: s.get("tag") ?? "",
    pinned: s.get("pinned") === "1",
    signal: s.get("signal") ?? "",
    tech: s.get("tech") ?? "",
  };
}

function filtersToQuery(f: Filters, q: string) {
  const s = new URLSearchParams();
  if (q.trim()) s.set("q", q.trim());
  if (f.phone) s.set("phone", "1");
  if (f.email) s.set("email", "1");
  if (f.website) s.set("website", f.website);
  if (f.minRating) s.set("minRating", f.minRating);
  if (f.minReviews) s.set("minReviews", f.minReviews);
  if (f.category) s.set("category", f.category);
  if (f.status) s.set("status", f.status);
  if (f.issue) s.set("issue", f.issue);
  if (f.socials) s.set("socials", "1");
  if (f.emailValid) s.set("emailValid", "1");
  if (f.source) s.set("source", f.source);
  if (f.followUp) s.set("followUp", "due");
  if (f.sort) s.set("sort", f.sort);
  if (f.mine) s.set("assigned", "me");
  if (f.unhappy) s.set("unhappy", "1");
  if (f.tag) s.set("tag", f.tag);
  if (f.pinned) s.set("pinned", "1");
  if (f.signal) s.set("signal", f.signal);
  if (f.tech) s.set("tech", f.tech);
  return s;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z" />
    </svg>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-8 rounded-full border px-3 text-[13px] transition-colors",
        active ? "border-pin/50 bg-pin/10 text-pin" : "border-line text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function LeadsView() {
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const jobId = params.get("jobId");

  const [filters, setFilters] = useState<Filters>(() => filtersFromQuery(params));
  const [debouncedQ, setDebouncedQ] = useState(filters.q);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"table" | "map">("table");

  const [data, setData] = useState<{ items: Lead[]; total: number; pageSize: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [tagList, setTagList] = useState<{ name: string; count: number }[]>([]);
  const [techList, setTechList] = useState<{ name: string; count: number }[]>([]);
  const [signalCounts, setSignalCounts] = useState<Record<string, number>>({});
  const feats = useFeatures();
  const [bulkTag, setBulkTag] = useState("");
  const [views, setViews] = useState<SavedView[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const firstIds = useRef<Set<string> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [importing, setImporting] = useState(params.get("import") === "1");
  const ai = useAiAvailable();
  const [ask, setAsk] = useState("");
  const [asking, setAsking] = useState(false);
  const [askNote, setAskNote] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [bulkLang, setBulkLang] = useState("roman_urdu");

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const filterQuery = useMemo(() => filtersToQuery(filters, debouncedQ), [filters, debouncedQ]);
  const query = useMemo(() => {
    const s = new URLSearchParams(filterQuery);
    if (jobId) s.set("jobId", jobId);
    return s.toString();
  }, [filterQuery, jobId]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [query]);

  // Leads for the table
  useEffect(() => {
    if (tab !== "table") return;
    let alive = true;
    setLoading(true);
    const s = new URLSearchParams(query);
    s.set("page", String(page));
    fetch(`/api/leads?${s}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((b: { items: Lead[]; total: number; pageSize: number }) => {
        if (!alive) return;
        if (!firstIds.current) firstIds.current = new Set(b.items.map((l) => l.id));
        setData(b);
      })
      .catch(() => alive && toast.error("Couldn't load leads."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query, page, tab, refreshKey]);

  // Categories and saved views
  const loadFacets = useCallback(() => {
    fetch("/api/leads/facets")
      .then((r) => r.json())
      .then((b) => {
        setCategories(b.categories ?? []);
        setTagList(b.tags ?? []);
        setTechList(b.tech ?? []);
        setSignalCounts(b.signals ?? {});
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    loadFacets();
    fetch("/api/views")
      .then((r) => r.json())
      .then((b) => setViews(b.views ?? []))
      .catch(() => undefined);
  }, [loadFacets]);

  // Live updates: while a search runs, new leads show up here on their own
  useEffect(() => {
    let alive = true;
    let wasLive = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/jobs", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const b = (await res.json()) as { jobs: { status: string }[] };
        const live = b.jobs.filter((j) => ["PENDING", "RUNNING", "IMPORTING"].includes(j.status)).length;
        setLiveCount(live);
        if (live > 0 || wasLive) {
          setRefreshKey((k) => k + 1);
          loadFacets();
        }
        if (wasLive && live === 0) router.refresh(); // credits in the top bar
        wasLive = live > 0;
      } catch {
        /* engine or server busy; try next tick */
      }
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [loadFacets, router]);

  // While website checks run on this page's leads, refresh to show their results
  useEffect(() => {
    if (!data?.items.some((l) => ["QUEUED", "RUNNING"].includes(l.enrichStatus))) return;
    const t = setInterval(() => setRefreshKey((k) => k + 1), 4000);
    return () => clearInterval(t);
  }, [data]);

  async function changeStatus(id: string, next: string) {
    setData((d) => d && { ...d, items: d.items.map((l) => (l.id === id ? { ...l, status: next } : l)) });
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    if (!res.ok) toast.error("Couldn't update the status.");
  }

  async function tagSelected(mode: "add" | "remove") {
    if (!bulkTag.trim()) return toast.error("Type a tag first.");
    const res = await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action: "tag", tag: bulkTag, mode }),
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(b.error ?? "Couldn't update tags.");
    toast.success(`${mode === "add" ? "Tagged" : "Untagged"} ${b.updated} leads.`);
    setBulkTag("");
    setRefreshKey((k) => k + 1);
    loadFacets();
  }

  async function bulk(action: "status" | "check" | "delete", status?: string) {
    const ids = Array.from(selected);
    if (action === "delete" && !confirm(`Delete ${ids.length} lead${ids.length > 1 ? "s" : ""}? This can't be undone.`)) return;
    const res = await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action, status }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(body.error ?? "Couldn't update these leads.");
    toast.success(
      action === "delete"
        ? `Deleted ${body.deleted} leads.`
        : action === "check"
          ? `Checking ${body.updated} websites. Results fill in on their own.`
          : `Updated ${body.updated} leads.`,
    );
    setSelected(new Set());
    setRefreshKey((k) => k + 1);
    if (action === "delete") loadFacets();
  }

  async function saveView() {
    const q = filterQuery.toString();
    if (!q) return toast.error("Set at least one filter first, then save it as a view.");
    const name = prompt("Name this view", filters.category || filters.q || "My view");
    if (!name) return;
    const res = await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, query: q }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(body.error ?? "Couldn't save the view.");
    setViews((v) => [...v, body.view]);
    toast.success(`Saved “${body.view.name}”.`);
  }

  async function deleteView(id: string) {
    const res = await fetch(`/api/views/${id}`, { method: "DELETE" });
    if (res.ok) setViews((v) => v.filter((x) => x.id !== id));
  }

  function applyView(v: SavedView) {
    const f = filtersFromQuery(new URLSearchParams(v.query));
    setFilters(f);
    setDebouncedQ(f.q);
    if (jobId) router.replace("/leads");
  }

  async function askAi(e: React.FormEvent) {
    e.preventDefault();
    if (!ask.trim()) return;
    setAsking(true);
    const res = await fetch("/api/ai/filter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: ask }),
    });
    const b = await res.json().catch(() => ({}));
    setAsking(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't understand that question.");
    const f = filtersFromQuery(new URLSearchParams(b.query));
    setFilters(f);
    setDebouncedQ(f.q);
    setAskNote(b.explanation ?? null);
    if (jobId) router.replace("/leads");
  }

  async function writeAll() {
    const ids = Array.from(selected);
    if (ids.length > 25) return toast.error("Select up to 25 leads at a time for AI messages.");
    setWriting(true);
    const res = await fetch("/api/ai/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, channel: "WHATSAPP", language: bulkLang }),
    });
    const b = await res.json().catch(() => ({}));
    setWriting(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't write the messages.");
    toast.success(
      `Wrote ${b.done} message${b.done === 1 ? "" : "s"}${b.failed ? `, ${b.failed} failed` : ""}. Open a lead to send, or export them.`,
    );
    setRefreshKey((k) => k + 1);
  }

  function clearAll() {
    setAskNote(null);
    setAsk("");
    setFilters(EMPTY);
    setDebouncedQ("");
    if (jobId) router.replace("/leads");
  }

  const items = data?.items ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const hasFilters = Boolean(filterQuery.toString() || jobId);
  const allOnPage = items.length > 0 && items.every((l) => selected.has(l.id));
  const activeView = views.find((v) => v.query === filterQuery.toString());

  function toggleAll() {
    setSelected((s) => {
      const n = new Set(s);
      if (allOnPage) items.forEach((l) => n.delete(l.id));
      else items.forEach((l) => n.add(l.id));
      return n;
    });
  }
  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="space-y-4">
      {liveCount > 0 && (
        <div className="flex items-center gap-2 rounded-panel border border-info/30 bg-info/5 px-4 py-2.5 text-sm text-info">
          <Radio className="h-4 w-4 animate-pulse" aria-hidden />
          {liveCount === 1 ? "A search is running." : `${liveCount} searches are running.`} New leads appear here as
          they're found.
        </div>
      )}

      {ai && (
        <form onSubmit={askAi} className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pin" aria-hidden />
            <Input
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              placeholder="Ask AI: “clinics in Multan with good reviews but no website”"
              className="pl-9"
              aria-label="Ask AI to filter your leads"
              dir="auto"
            />
          </div>
          <Button type="submit" variant="secondary" loading={asking} disabled={!ask.trim()}>
            Find
          </Button>
          {askNote && <p className="w-full text-[13px] text-muted">{askNote}</p>}
        </form>
      )}

      {views.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-muted">Saved views</span>
          {views.map((v) => (
            <span
              key={v.id}
              className={cn(
                "group inline-flex h-8 items-center rounded-full border text-[13px]",
                activeView?.id === v.id ? "border-pin/50 bg-pin/10 text-pin" : "border-line text-ink",
              )}
            >
              <button onClick={() => applyView(v)} className="h-full pl-3 pr-1.5">
                {v.name}
              </button>
              <button
                onClick={() => deleteView(v.id)}
                className="mr-1.5 rounded-full p-0.5 text-muted opacity-60 hover:text-danger group-hover:opacity-100"
                aria-label={`Delete view ${v.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Panel>
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input
                value={filters.q}
                onChange={(e) => set("q", e.target.value)}
                placeholder={t("leads.searchPh","Search name, address, phone, email…")}
                className="pl-9"
                aria-label="Search leads"
              />
            </div>
            <Select
              value={filters.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-auto max-w-[220px]"
              aria-label="Category"
            >
              <option value="">{t("leads.allCategories","All categories")}</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count})
                </option>
              ))}
            </Select>
            <Select value={filters.sort} onChange={(e) => set("sort", e.target.value)} className="w-auto" aria-label="Sort">
              <option value="">{t("leads.newestFirst","Newest first")}</option>
              <option value="score">Best leads first</option>
            </Select>
            <Select value={filters.status} onChange={(e) => set("status", e.target.value)} className="w-auto" aria-label="Status">
              <option value="">{t("leads.anyStatus","Any status")}</option>
              {STATUSES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <Select value={filters.minRating} onChange={(e) => set("minRating", e.target.value)} className="w-auto" aria-label="Rating">
              <option value="">{t("leads.anyRating","Any rating")}</option>
              <option value="3">3.0 and up</option>
              <option value="4">4.0 and up</option>
              <option value="4.5">4.5 and up</option>
            </Select>
            <Select value={filters.minReviews} onChange={(e) => set("minReviews", e.target.value)} className="w-auto" aria-label="Reviews">
              <option value="">{t("leads.anyReviews","Any reviews")}</option>
              <option value="10">10+ reviews</option>
              <option value="50">50+ reviews</option>
              <option value="200">200+ reviews</option>
            </Select>
            {feats.has("signals") && (
              <Select value={filters.signal} onChange={(e) => set("signal", e.target.value)} className="w-auto max-w-[200px]" aria-label="Signal">
                <option value="">Any signal</option>
                {Object.entries(SIGNAL_INFO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                    {signalCounts[k] ? ` (${signalCounts[k]})` : ""}
                  </option>
                ))}
              </Select>
            )}
            {techList.length > 0 && (
              <Select value={filters.tech} onChange={(e) => set("tech", e.target.value)} className="w-auto max-w-[180px]" aria-label="Built with">
                <option value="">Any technology</option>
                {techList.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.count})
                  </option>
                ))}
              </Select>
            )}
            {tagList.length > 0 && (
              <Select value={filters.tag} onChange={(e) => set("tag", e.target.value)} className="w-auto max-w-[180px]" aria-label="Tag">
                <option value="">Any tag</option>
                {tagList.map((t) => (
                  <option key={t.name} value={t.name}>
                    #{t.name} ({t.count})
                  </option>
                ))}
              </Select>
            )}
            <Select value={filters.issue} onChange={(e) => set("issue", e.target.value)} className="w-auto" aria-label="Website problem">
              <option value="">Any website</option>
              {Object.entries(ISSUE_INFO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={filters.phone} onClick={() => set("phone", !filters.phone)}>
              Has phone
            </FilterChip>
            <FilterChip active={filters.email} onClick={() => set("email", !filters.email)}>
              Has email
            </FilterChip>
            <FilterChip active={filters.website === "1"} onClick={() => set("website", filters.website === "1" ? "" : "1")}>
              Has website
            </FilterChip>
            <FilterChip active={filters.website === "0"} onClick={() => set("website", filters.website === "0" ? "" : "0")}>
              No website
            </FilterChip>
            <FilterChip active={filters.unhappy} onClick={() => set("unhappy", !filters.unhappy)}>
              Unhappy reviews
            </FilterChip>
            <FilterChip active={filters.mine} onClick={() => set("mine", !filters.mine)}>
              Assigned to me
            </FilterChip>
            <FilterChip active={filters.followUp} onClick={() => set("followUp", !filters.followUp)}>
              Follow-up due
            </FilterChip>
            <FilterChip active={filters.pinned} onClick={() => set("pinned", !filters.pinned)}>
              ★ Starred
            </FilterChip>
            <FilterChip active={filters.socials} onClick={() => set("socials", !filters.socials)}>
              Has social pages
            </FilterChip>
            <FilterChip active={filters.emailValid} onClick={() => set("emailValid", !filters.emailValid)}>
              Email domain OK
            </FilterChip>
            {filters.source === "WEB" && (
              <FilterChip active onClick={() => set("source", "")}>
                From web extractor
              </FilterChip>
            )}
            {jobId && (
              <FilterChip active onClick={() => router.replace("/leads")}>
                From one search
              </FilterChip>
            )}
            {hasFilters && (
              <>
                <button onClick={clearAll} className="ml-1 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Clear
                </button>
                {!activeView && filterQuery.toString() && (
                  <button onClick={saveView} className="inline-flex items-center gap-1 text-[13px] text-pin hover:underline">
                    <Bookmark className="h-3.5 w-3.5" aria-hidden />
                    Save view
                  </button>
                )}
              </>
            )}

            <div className="ml-auto flex items-center gap-3">
              <span className="tabular text-[13px] text-muted">
                {data ? `${formatNumber(data.total)} lead${data.total === 1 ? "" : "s"}` : ""}
              </span>
              <div className="flex rounded-control border border-line p-0.5" role="tablist" aria-label="Layout">
                {(
                  [
                    ["table", "Table", List],
                    ["map", "Map", MapIcon],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-[13px]",
                      tab === key ? "bg-raised text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setImporting(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-raised px-3 text-[13px] hover:border-muted/50"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Merge duplicates? Leads with the same phone or website are combined into one, keeping all notes and history.")) return;
                  const res = await fetch("/api/leads/merge", { method: "POST" });
                  const b = await res.json().catch(() => ({}));
                  if (!res.ok) return toast.error("Couldn't merge.");
                  toast.success(b.merged ? `Merged ${b.merged} duplicate${b.merged > 1 ? "s" : ""}.` : "No duplicates found.");
                  setRefreshKey((k) => k + 1);
                }}
                className="inline-flex h-8 items-center rounded-control border border-line bg-raised px-3 text-[13px] hover:border-muted/50"
                title="Combine the same business saved more than once"
              >
                {t("leads.mergeDupes","Merge duplicates")}
              </button>
              <a
                href={`/api/leads/export?${query}`}
                download
                className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-raised px-3 text-[13px] hover:border-muted/50"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Export
              </a>
            </div>
          </div>
        </div>

        {selected.size > 0 && tab === "table" && (
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-pin/5 px-4 py-2.5 text-sm">
            <span className="tabular font-medium">{selected.size} selected</span>
            <Select
              value=""
              onChange={(e) => e.target.value && bulk("status", e.target.value)}
              className="h-8 w-auto text-[13px]"
              aria-label="Set status for selected"
            >
              <option value="">Set status…</option>
              {STATUSES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <a
              href={`/api/leads/export?ids=${Array.from(selected).join(",")}`}
              download
              className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-raised px-3 text-[13px]"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export selected
            </a>
            {ai && (
              <span className="inline-flex items-center gap-1">
                <Select value={bulkLang} onChange={(e) => setBulkLang(e.target.value)} className="h-8 w-auto text-[13px]" aria-label="Message language">
                  <option value="roman_urdu">Roman Urdu</option>
                  <option value="urdu">Urdu</option>
                  <option value="english">English</option>
                </Select>
                <Button variant="secondary" size="sm" onClick={writeAll} loading={writing}>
                  <Sparkles className="h-3.5 w-3.5 text-pin" aria-hidden />
                  Write messages
                </Button>
              </span>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const res = await fetch("/api/leads/hubspot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selected) }) });
                const b = await res.json().catch(() => ({}));
                if (!res.ok) return toast.error(b.error ?? "Couldn't send to HubSpot.");
                if (b.error && !b.ok) return toast.error(b.error);
                toast.success(`Sent ${b.ok} to HubSpot${b.failed ? `, ${b.failed} failed` : ""}.`);
              }}
            >
              To HubSpot
            </Button>
            <span className="inline-flex items-center gap-1">
              <Input
                value={bulkTag}
                onChange={(e) => setBulkTag(e.target.value)}
                placeholder="tag"
                className="h-8 w-28 text-[13px]"
                aria-label="Tag to add or remove"
                list="known-tags"
              />
              <datalist id="known-tags">
                {tagList.map((t) => (
                  <option key={t.name} value={t.name} />
                ))}
              </datalist>
              <Button size="sm" variant="secondary" onClick={() => tagSelected("add")}>
                Tag
              </Button>
              <Button size="sm" variant="ghost" onClick={() => tagSelected("remove")}>
                Untag
              </Button>
            </span>
            <a
              href={`/campaigns?query=${encodeURIComponent(`ids=${Array.from(selected).join(",")}`)}`}
              className="inline-flex h-8 items-center rounded-control border border-line bg-raised px-3 text-[13px] hover:border-muted/50"
            >
              WhatsApp/SMS campaign
            </a>
            <EnrollControls ids={Array.from(selected)} onDone={() => setRefreshKey((k) => k + 1)} />
            <Button variant="secondary" size="sm" onClick={() => bulk("check")}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Check websites
            </Button>
            <Button variant="danger" size="sm" onClick={() => bulk("delete")}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete
            </Button>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-[13px] text-muted hover:text-ink">
              Clear selection
            </button>
          </div>
        )}

        {tab === "map" ? (
          <LeadsMap query={query} refreshKey={refreshKey} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className={cn("w-full min-w-[960px] text-sm", loading && !data && "opacity-60")}>
                <thead>
                  <tr className="border-b border-line text-left text-[13px] text-muted">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allOnPage}
                        onChange={toggleAll}
                        aria-label="Select all on this page"
                        className="accent-[rgb(var(--pin))]"
                      />
                    </th>
                    <th className="px-2 py-3 font-medium">{t("leads.business","Business")}</th>
                    <th className="px-4 py-3 font-medium">{t("leads.contact","Contact")}</th>
                    <th className="px-4 py-3 font-medium">{t("leads.rating","Rating")}</th>
                    <th className="px-4 py-3 font-medium">{t("leads.status","Status")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("leads.reachOut","Reach out")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((l) => {
                    const wa = whatsappNumber(l.phone);
                    const host = websiteHost(l.website);
                    const isNew = firstIds.current != null && !firstIds.current.has(l.id) && Date.now() - new Date(l.createdAt).getTime() < 120_000;
                    return (
                      <tr
                        key={l.id}
                        className={cn(
                          "align-top transition-colors hover:bg-raised/30",
                          selected.has(l.id) && "bg-pin/5",
                          isNew && "shadow-[inset_3px_0_0_rgb(var(--pin))]",
                        )}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(l.id)}
                            onChange={() => toggle(l.id)}
                            aria-label={`Select ${l.title}`}
                            className="mt-1 accent-[rgb(var(--pin))]"
                          />
                        </td>
                        <td className="max-w-[340px] px-2 py-3">
                          <p className="font-medium">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await fetch(`/api/leads/${l.id}/pin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinned: !l.pinned }) });
                                setRefreshKey((k) => k + 1);
                              }}
                              className={cn("mr-1.5 align-middle", l.pinned ? "text-pin" : "text-muted/40 hover:text-muted")}
                              title={l.pinned ? "Unstar" : "Star this lead"}
                              aria-label={l.pinned ? "Unstar" : "Star"}
                            >
                              {l.pinned ? "\u2605" : "\u2606"}
                            </button>
                            <button onClick={() => setOpenId(l.id)} className="text-left hover:text-pin hover:underline">
                              {l.title}
                            </button>
                            {l.score != null && (
                              <span
                                className={cn(
                                  "tabular ml-2 rounded px-1.5 align-middle text-[11px] font-semibold",
                                  l.score >= 70 ? "bg-pin/15 text-pin" : l.score >= 45 ? "bg-info/15 text-info" : "bg-line text-muted",
                                )}
                                title="Lead score (0-100)"
                              >
                                {l.score}
                              </span>
                            )}
                            {isNew && <span className="ml-2 align-middle text-[11px] font-semibold text-pin">new</span>}
                          </p>
                          {l.category && <p className="text-[13px] text-muted">{l.category}</p>}
                          {l.tags && (
                            <p className="mt-1 flex flex-wrap gap-1">
                              {l.tags
                                .split(",")
                                .filter(Boolean)
                                .map((t) => (
                                  <button
                                    key={t}
                                    onClick={() => set("tag", t)}
                                    className="rounded bg-raised px-1.5 text-[11px] text-muted hover:text-pin"
                                    title={`Show leads tagged ${t}`}
                                  >
                                    #{t}
                                  </button>
                                ))}
                            </p>
                          )}
                          {l.address && (
                            <p className="mt-1 flex gap-1 text-[13px] text-muted">
                              <MapPin className="mt-1 h-3 w-3 shrink-0" aria-hidden />
                              <span className="line-clamp-2">{l.address}</span>
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {l.phone ? <p className="tabular">{l.phone}</p> : <p className="text-muted">No phone</p>}
                          {l.emails && (
                            <p className="flex max-w-[260px] items-center gap-1 text-[13px] text-info">
                              <span className="truncate">{l.emails.split(",")[0]}</span>
                              {l.emailStatus === "VALID" && <span className="text-ok" title="The email's domain accepts mail">✓</span>}
                              {l.emailStatus === "INVALID" && <span className="text-danger" title="The email's domain can't receive mail">✕</span>}
                            </p>
                          )}
                          {host ? (
                            <a
                              href={l.website!.startsWith("http") ? l.website! : `https://${l.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex max-w-[240px] items-center gap-1 truncate text-[13px] text-muted hover:text-ink"
                            >
                              {host}
                              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                            </a>
                          ) : (
                            <p className="text-[13px] text-pin">{t("leads.noWebsite","No website")}</p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {["QUEUED", "RUNNING"].includes(l.enrichStatus) && (
                              <Badge tone="info">
                                <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
                                Checking
                              </Badge>
                            )}
                            {l.enrichStatus === "DONE" && l.auditScore != null && (
                              <Badge
                                tone={scoreTone(l.auditScore)}
                                title={issueList(l.auditIssues).map((i) => ISSUE_INFO[i].label).join(", ") || "No problems found"}
                              >
                                Site {l.auditScore}
                              </Badge>
                            )}
                            {feats.has("signals") &&
                              (l.signals ?? "")
                                .split(",")
                                .filter((sg) => SIGNAL_INFO[sg])
                                .map((sg) => (
                                  <Badge key={sg} tone={["RATING_DROP", "BAD_REVIEW"].includes(sg) ? "danger" : "pin"} title={SIGNAL_INFO[sg].tip}>
                                    {SIGNAL_INFO[sg].label}
                                  </Badge>
                                ))}
                            {l.aiMessage && (
                              <Badge tone="pin" title="An AI-written message is ready. Open the lead to send it.">
                                Message ready
                              </Badge>
                            )}
                            {l.socials && <SocialLinks json={l.socials} />}
                            {l.quality != null && (
                              <Badge tone={l.quality >= 70 ? "ok" : l.quality >= 40 ? "pin" : "danger"} title="How reliable the contact details are">
                                Q {l.quality}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {l.rating != null ? (
                            <span className="tabular inline-flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-pin text-pin" aria-hidden />
                              {l.rating.toFixed(1)}
                              <span className="text-muted">({formatNumber(l.reviewCount ?? 0)})</span>
                            </span>
                          ) : (
                            <span className="text-muted">No reviews</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={l.status}
                            onChange={(e) => changeStatus(l.id, e.target.value)}
                            aria-label={`Status for ${l.title}`}
                            className={cn(
                              "rounded-control border border-line bg-raised px-2 py-1 text-[13px] focus:border-pin focus:outline-none",
                              STATUS_COLOR[l.status],
                            )}
                          >
                            {STATUSES.map(([v, lab]) => (
                              <option key={v} value={v}>
                                {lab}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            {wa && (
                              <a
                                href={`https://wa.me/${wa}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => l.status === "NEW" && changeStatus(l.id, "CONTACTED")}
                                className="inline-flex h-8 items-center gap-1.5 rounded-control border border-ok/30 bg-ok/10 px-2.5 text-[13px] text-ok hover:bg-ok/20"
                                title="Open a WhatsApp chat (marks the lead as contacted)"
                              >
                                <WhatsAppIcon className="h-3.5 w-3.5" />
                                Chat
                              </a>
                            )}
                            {l.phone && (
                              <a
                                href={`sms:${l.phone.replace(/[^\d+]/g, "")}`}
                                className="inline-flex h-8 items-center rounded-control border border-line px-2.5 text-[13px] text-muted hover:text-ink"
                                title="Send an SMS from your phone"
                              >
                                SMS
                              </a>
                            )}
                            {l.mapsUrl && (
                              <a
                                href={l.mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 items-center rounded-control border border-line px-2.5 text-[13px] text-muted hover:text-ink"
                                title="Open in Google Maps"
                              >
                                Map
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {data && items.length === 0 && (
                <div className="px-6 py-14 text-center">
                  <p className="font-medium">
                    {liveCount > 0 ? "Waiting for the first results" : hasFilters ? "No leads match these filters" : "No leads yet"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {liveCount > 0
                      ? "Leads will appear here within a minute or two."
                      : hasFilters
                        ? "Loosen a filter or clear them all."
                        : "Run a search and the businesses it finds will be listed here."}
                  </p>
                </div>
              )}
            </div>

            {data && data.total > data.pageSize && (
              <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-muted">
                <span className="tabular">
                  Page {page} of {pages}
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Previous
                  </Button>
                  <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>
      {importing && (
        <ImportLeads
          onClose={() => {
            setImporting(false);
            if (params.get("import")) router.replace("/leads");
          }}
          onDone={() => {
            setRefreshKey((k) => k + 1);
            loadFacets();
          }}
        />
      )}
      {openId && (
        <LeadDrawer id={openId} onClose={() => setOpenId(null)} onChanged={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}
