"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { useAiAvailable } from "./ai-panels";
import { useFeatures } from "./use-features";
import { toast } from "sonner";
import { JobStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Select, Textarea, Toggle } from "@/components/ui/field";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

type Job = {
  goal?: number | null;
  groupId?: string | null;
  id: string;
  name: string;
  keywords: string[];
  status: string;
  depth: number;
  withEmails: boolean;
  resultCount: number;
  newCount: number;
  error: string | null;
  createdAt: string;
};

const LIVE = new Set(["PENDING", "RUNNING", "IMPORTING"]);

const LANGUAGES = [
  ["en", "English"],
  ["ur", "Urdu"],
  ["ar", "Arabic"],
  ["hi", "Hindi"],
  ["tr", "Turkish"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
];

function NewSearchForm({ onCreated }: { onCreated: () => void }) {
  const [keywords, setKeywords] = useState("");
  const [name, setName] = useState("");
  const [lang, setLang] = useState("en");
  const [depth, setDepth] = useState(1);
  const [maxTime, setMaxTime] = useState(10);
  const [zoom, setZoom] = useState(15);
  const [withEmails, setWithEmails] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);
  const [extraReviews, setExtraReviews] = useState(false);
  const [goal, setGoal] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const ai = useAiAvailable();
  const [planOpen, setPlanOpen] = useState(false);
  const [planText, setPlanText] = useState("");
  const [planning, setPlanning] = useState(false);
  const [planNote, setPlanNote] = useState<string | null>(null);

  async function plan() {
    setPlanning(true);
    const res = await fetch("/api/ai/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: planText }),
    });
    const b = await res.json().catch(() => ({}));
    setPlanning(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't plan the searches.");
    setKeywords((b.keywords ?? []).join("\n"));
    setPlanNote(b.note ?? null);
    setPlanOpen(false);
  }

  const lines = keywords.split("\n").map((l) => l.trim()).filter(Boolean);
  const missingPlace = lines.filter((l) => !/\b(in|near)\b/i.test(l));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, name, lang, depth, maxTime, zoom, withEmails, autoCheck, extraReviews, goal: Number(goal) || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? "Couldn't start the search.");
        return;
      }
      toast.success("Search started. Leads will appear when it finishes.");
      setKeywords("");
      setName("");
      onCreated();
    } catch {
      toast.error("Can't reach the app server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel>
      <PanelHeader title="New search" description="One search per line. Add the city to each one." />
      <form onSubmit={submit} className="space-y-5 p-5">
        {ai && (
          <div className="rounded-control border border-line">
            <button
              type="button"
              onClick={() => setPlanOpen((v) => !v)}
              aria-expanded={planOpen}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted hover:text-ink"
            >
              <Sparkles className="h-4 w-4 text-pin" aria-hidden />
              Plan searches with AI
              <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", planOpen && "rotate-180")} aria-hidden />
            </button>
            {planOpen && (
              <div className="space-y-2 border-t border-line p-3">
                <Textarea
                  rows={3}
                  value={planText}
                  onChange={(e) => setPlanText(e.target.value)}
                  placeholder="I sell websites to clinics and dentists in South Punjab"
                  className="text-[13px]"
                  dir="auto"
                  aria-label="Who you want to find"
                />
                <Button type="button" size="sm" variant="secondary" onClick={plan} loading={planning} disabled={planText.trim().length < 5}>
                  Suggest searches
                </Button>
              </div>
            )}
          </div>
        )}
        {planNote && <p className="-mt-2 text-[13px] text-muted">{planNote}</p>}

        <div>
          <Label htmlFor="keywords">What and where</Label>
          <Textarea
            id="keywords"
            rows={5}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder={"dentist in Lahore\nbakery in Multan\nhotel near Faisal Mosque Islamabad"}
            required
          />
          {missingPlace.length > 0 ? (
            <Hint className="flex items-start gap-1.5 text-pin">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {missingPlace.length === 1 ? `“${missingPlace[0]}” has` : `${missingPlace.length} lines have`} no city.
              Add “in [city]” so results come from the right place.
            </Hint>
          ) : (
            <Hint>
              {lines.length ? `${lines.length} search${lines.length > 1 ? "es" : ""} ready` : "Up to 50 lines at a time"}
            </Hint>
          )}
        </div>

        <div>
          <Label htmlFor="goal">How many new leads do you want? (optional)</Label>
          <Input id="goal" type="number" min={1} max={5000} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. 50" />
          <Hint>Only businesses you don't have yet count. If one round finds fewer, it searches deeper and further out on its own (up to 5 rounds).</Hint>
        </div>

        <div>
          <Label htmlFor="name">Name this search (optional)</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Lahore dentists, October" />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="depth" className="mb-0">
              How deep to search
            </Label>
            <span className="tabular text-[13px] text-muted">{depth}</span>
          </div>
          <input
            id="depth"
            type="range"
            min={1}
            max={20}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-full accent-[rgb(var(--pin))]"
          />
          <Hint>Higher finds more businesses per search but takes longer. Start with 1 to 3.</Hint>
        </div>

        <Toggle
          checked={withEmails}
          onChange={setWithEmails}
          label="Find emails on websites"
          description="Visits each business website. Noticeably slower."
        />

        <Toggle
          checked={autoCheck}
          onChange={setAutoCheck}
          label="Check websites as leads arrive"
          description="Finds emails and social pages and scores each website, without slowing the search."
        />

        <Toggle
          checked={extraReviews}
          onChange={setExtraReviews}
          label="Collect more reviews"
          description="Up to 20 reviews per business for review insights. Slower."
        />

        <div className="rounded-control border border-line">
          <button
            type="button"
            onClick={() => setAdvanced((v) => !v)}
            aria-expanded={advanced}
            className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-muted hover:text-ink"
          >
            More options
            <ChevronDown className={cn("h-4 w-4 transition-transform", advanced && "rotate-180")} aria-hidden />
          </button>
          {advanced && (
            <div className="grid gap-4 border-t border-line p-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="lang">Results language</Label>
                <Select id="lang" value={lang} onChange={(e) => setLang(e.target.value)}>
                  {LANGUAGES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="maxTime">Time limit (min)</Label>
                <Input
                  id="maxTime"
                  type="number"
                  min={3}
                  max={240}
                  value={maxTime}
                  onChange={(e) => setMaxTime(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="zoom">Map zoom</Label>
                <Input id="zoom" type="number" min={1} max={21} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
              </div>
            </div>
          )}
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Start search
        </Button>
      </form>
    </Panel>
  );
}

function JobRow({ job, onDelete }: { job: Job; onDelete: (id: string) => void }) {
  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{job.name}</p>
          <p className="mt-0.5 text-[13px] text-muted">
            {job.goal ? `Goal ${job.goal} new leads · ` : ""}
            {job.keywords.length} search{job.keywords.length > 1 ? "es" : ""}, depth {job.depth}
            {job.withEmails ? ", with emails" : ""}, {timeAgo(job.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <JobStatusBadge status={job.status} />
          {!LIVE.has(job.status) && (
            <button
              onClick={() => onDelete(job.id)}
              className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-danger"
              aria-label={`Remove ${job.name}`}
              title="Remove from list (leads stay saved)"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {job.status === "DONE" && (
        <p className="mt-2 text-sm">
          Found <span className="tabular font-medium">{formatNumber(job.resultCount)}</span> businesses,{" "}
          <Link href={`/leads?jobId=${job.id}`} className="font-medium text-pin hover:underline">
            {formatNumber(job.newCount)} new leads saved
          </Link>
          {job.resultCount > job.newCount && (
            <span className="text-muted"> ({formatNumber(job.resultCount - job.newCount)} you already had)</span>
          )}
        </p>
      )}
      {job.error && <p className="mt-2 text-[13px] text-danger">{job.error}</p>}
      {LIVE.has(job.status) && (
        <p className="mt-2 text-sm text-muted">
          {job.newCount > 0 ? (
            <>
              <Link href={`/leads?jobId=${job.id}`} className="tabular font-medium text-pin hover:underline">
                {formatNumber(job.newCount)} leads saved so far
              </Link>
              , more on the way
            </>
          ) : job.status === "PENDING" ? (
            "Waiting to start…"
          ) : (
            "Looking for businesses. The first leads usually arrive within a minute or two."
          )}
        </p>
      )}
      {LIVE.has(job.status) && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-raised">
          <div className="h-full w-1/3 animate-[slide_1.6s_ease-in-out_infinite] rounded-full bg-info" />
        </div>
      )}
    </li>
  );
}

function ProductPanel({ onDone }: { onDone: () => void }) {
  const [product, setProduct] = useState("");
  const [intent, setIntent] = useState("sell");
  const [cities, setCities] = useState("");
  const [goal, setGoal] = useState("50");
  const [busy, setBusy] = useState(false);
  return (
    <Panel>
      <PanelHeader title="Find by product" description="Type what you sell or need. We work out which businesses to look for." />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const res = await fetch("/api/sources/product", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product, intent, cities, goal: Number(goal) || null }),
          });
          const b = await res.json().catch(() => ({}));
          setBusy(false);
          if (!res.ok) return toast.error(b.error ?? "Couldn't start.");
          toast.success(`Searching for: ${(b.types ?? []).join(", ")}`);
          onDone();
        }}
        className="space-y-3 p-5"
      >
        <div>
          <Label htmlFor="pp">Product</Label>
          <Input id="pp" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="hair oil" required />
        </div>
        <Select value={intent} onChange={(e) => setIntent(e.target.value)} aria-label="What you want">
          <option value="sell">I sell it: find shops and businesses that could buy or stock it</option>
          <option value="buy">I need it: find suppliers, wholesalers and shops that sell it</option>
        </Select>
        <div className="grid grid-cols-[1fr_100px] gap-3">
          <div>
            <Label htmlFor="pc">Cities</Label>
            <Input id="pc" value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Lahore, Faisalabad" required />
          </div>
          <div>
            <Label htmlFor="pg">New leads</Label>
            <Input id="pg" type="number" min={1} value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>
        </div>
        <Button type="submit" variant="secondary" loading={busy} className="w-full">
          Find businesses
        </Button>
      </form>
    </Panel>
  );
}

function OsmPanel({ onDone }: { onDone: () => void }) {
  const [cats, setCats] = useState<{ key: string; label: string }[]>([]);
  const [city, setCity] = useState("");
  const [cat, setCat] = useState("restaurant");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/sources/osm")
      .then((r) => r.json())
      .then((b) => setCats(b.categories ?? []));
  }, []);
  return (
    <Panel>
      <PanelHeader title="OpenStreetMap" description="A second, free source of businesses. Good for filling gaps Google misses." />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const res = await fetch("/api/sources/osm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city, category: cat }) });
          const b = await res.json().catch(() => ({}));
          setBusy(false);
          if (!res.ok) return toast.error(b.error ?? "Search failed.");
          toast.success(`Found ${b.found}, saved ${b.saved} new${b.already ? `, ${b.already} you already had` : ""}.`);
          onDone();
        }}
        className="space-y-3 p-5"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="osm-city">City</Label>
            <Input id="osm-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lahore" required />
          </div>
          <div>
            <Label htmlFor="osm-cat">Type</Label>
            <Select id="osm-cat" value={cat} onChange={(e) => setCat(e.target.value)}>
              {cats.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <Button type="submit" variant="secondary" loading={busy} className="w-full">
          Search OpenStreetMap
        </Button>
        <Hint>Results arrive at once (no engine needed). Each new lead uses 1 credit.</Hint>
      </form>
    </Panel>
  );
}

export function SearchesView() {
  const feats = useFeatures();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [engineOnline, setEngineOnline] = useState(true);
  const liveRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { jobs: Job[]; engineOnline: boolean };
      const wasLive = liveRef.current;
      const nowLive = body.jobs.some((j) => LIVE.has(j.status));
      liveRef.current = nowLive;
      setJobs(body.jobs);
      setEngineOnline(body.engineOnline);
      if (wasLive && !nowLive) router.refresh(); // update credits in the top bar
    } catch {
      setEngineOnline(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (liveRef.current) load();
    }, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function remove(id: string) {
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (res.ok) {
      setJobs((js) => js?.filter((j) => j.id !== id) ?? null);
      toast.success("Search removed. Its leads are still saved.");
    } else toast.error("Couldn't remove this search.");
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[400px_1fr]">
      <div className="space-y-6">
        <NewSearchForm onCreated={() => { liveRef.current = true; load(); }} />
        <ProductPanel onDone={() => { liveRef.current = true; load(); }} />
        {feats.has("osm") && <OsmPanel onDone={() => router.refresh()} />}
      </div>

      <Panel>
        <PanelHeader title="Your searches" description="Running searches update on their own." />
        {!engineOnline && (
          <div className="flex gap-2 border-b border-line bg-danger/5 px-5 py-3 text-[13px] text-danger">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              The scraping engine isn't reachable. Run <code className="text-ink">go run main.go</code> in the scraper
              folder and keep that terminal open.
            </span>
          </div>
        )}
        {jobs == null ? (
          <div className="space-y-3 p-5" aria-busy>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-control bg-raised/60" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            No searches yet. Describe what you're looking for on the left to run your first one.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {jobs.map((j) => (
              <JobRow key={j.id} job={j} onDelete={remove} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
