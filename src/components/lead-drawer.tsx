"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/panel";
import { AiBrief, ReplyAssistant, useAiAvailable } from "./ai-panels";
import { LeadActivity, type ActivityItem } from "./lead-activity";
import { MessageComposer } from "./message-composer";
import { CallPanel } from "./call-panel";
import { Competitors, GbpCheck, SalesTools } from "./sales-tools";
import { SignalsPanel } from "./signals-panel";
import { ReviewTools } from "./review-tools";
import { AuditList } from "./audit-panels";
import { useFeatures } from "./use-features";
import { ReviewsPanel } from "./reviews-panel";
import { scoreLabel } from "@/lib/score";
import { ISSUE_INFO, issueList, scoreTone } from "@/lib/issues";
import { formatNumber, timeAgo, websiteHost, whatsappNumber } from "@/lib/utils";

type Detail = {
  id: string;
  title: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  extraPhones: string | null;
  website: string | null;
  emails: string | null;
  emailStatus: string | null;
  socials: string | null;
  rating: number | null;
  reviewCount: number | null;
  mapsUrl: string | null;
  status: string;
  source: string;
  sourceUrl: string | null;
  enrichStatus: string;
  enrichedAt: string | null;
  auditScore: number | null;
  auditIssues: string | null;
  tech: string | null;
  siteLoadMs: number | null;
  siteTitle: string | null;
  createdAt: string;
  score: number | null;
  followUpAt: string | null;
  dealValue: number | null;
  assignedTo: { id: string; name: string } | null;
  aiBrief: string | null;
  aiBriefAt: string | null;
  aiMessage: string | null;
  reviews: string | null;
  ratingDist: string | null;
  aiReviews: string | null;
  aiReviewsAt: string | null;
  description: string | null;
  tags: string | null;
  lowReviews: number | null;
  openHours: string | null;
  thumbnail: string | null;
  demoToken: string | null;
  demoAt: string | null;
  demoViewedAt: string | null;
  proposalToken: string | null;
  proposalAt: string | null;
  proposalViewedAt: string | null;
  proposalAcceptedAt: string | null;
  optIn: boolean;
  igFollowers: number | null;
  igPosts: number | null;
  igCheckedAt: string | null;
  signals: string | null;
  bestTime: string | null;
  ownerName: string | null;
  builtBy: string | null;
  domainExpiresAt: string | null;
  branches: number | null;
  seo: string | null;
  ecom: string | null;
  enrollments: { id: string; status: string; currentStep: number; nextAt: string; sequence: { name: string; steps: string } }[];
  emailMessages: { id: string; subject: string; status: string; sentAt: string | null; openedAt: string | null; error: string | null; createdAt: string }[];
  job: { name: string } | null;
  activities: ActivityItem[];
};

const STAGES = [
  ["NEW", "New"],
  ["CONTACTED", "Contacted"],
  ["INTERESTED", "Interested"],
  ["WON", "Won"],
  ["LOST", "Lost"],
] as const;

function toDateInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const SOCIAL_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  youtube: "YouTube",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-6 py-5">
      <h3 className="mb-3 text-[13px] font-medium text-muted">{title}</h3>
      {children}
    </section>
  );
}

export function LeadDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged?: () => void }) {
  const [lead, setLead] = useState<Detail | null>(null);
  const [checking, setChecking] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [team, setTeam] = useState<{ id: string; name: string }[]>([]);
  const ai = useAiAvailable();
  const feats = useFeatures();

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((b) => setTeam([b.owner, ...(b.members ?? [])].filter(Boolean)))
      .catch(() => undefined);
  }, []);
  const reload = () => {
    setReloadKey((k) => k + 1);
    onChanged?.();
  };

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return void toast.error(b.error ?? "Couldn't save.");
    reload();
  }

  async function setStage(status: string) {
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) return void toast.error("Couldn't change the stage.");
    reload();
  }

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/leads/${id}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((b) => alive && b.lead && setLead(b.lead));
    load();
    const t = setInterval(() => {
      if (lead && !["QUEUED", "RUNNING"].includes(lead.enrichStatus)) return;
      load();
    }, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id, lead?.enrichStatus, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function shareReport() {
    const res = await fetch(`/api/leads/${id}/report`, { method: "POST" });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return void toast.error(b.error ?? "Couldn't create the report link.");
    const url = `${window.location.origin}${b.path}`;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    toast.success("Report link copied. Paste it into your message.", {
      action: { label: "Open", onClick: () => window.open(url, "_blank", "noopener") },
    });
  }

  async function checkNow() {
    setChecking(true);
    const res = await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], action: "check" }),
    });
    setChecking(false);
    if (!res.ok) return toast.error("Couldn't start the check.");
    setLead((l) => l && { ...l, enrichStatus: "QUEUED" });
  }

  const socials: Record<string, string> = (() => {
    try {
      return lead?.socials ? JSON.parse(lead.socials) : {};
    } catch {
      return {};
    }
  })();
  const issues = issueList(lead?.auditIssues);
  const busy = lead && ["QUEUED", "RUNNING"].includes(lead.enrichStatus);
  const phones = [lead?.phone, ...(lead?.extraPhones ?? "").split(",")].map((p) => p?.trim()).filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label="Lead details">
      <button className="absolute inset-0 bg-night/60" onClick={onClose} aria-label="Close" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-line bg-surface">
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-snug">{lead?.title ?? "Loading…"}</h2>
            {lead?.category && <p className="text-sm text-muted">{lead.category}</p>}
            {lead?.score != null && (
              <p className="mt-1 text-[13px]">
                <span className="tabular font-semibold text-pin">{lead.score}</span>
                <span className="text-muted"> / 100, {scoreLabel(lead.score).toLowerCase()} lead</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!lead ? (
          <div className="grid flex-1 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <Section title="Next step">
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 text-[13px] text-muted">
                  Stage
                  <Select value={lead.status} onChange={(e) => setStage(e.target.value)} className="mt-1 h-9 text-[13px]">
                    {STAGES.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </label>
                {team.length > 1 && (
                  <label className="col-span-2 text-[13px] text-muted">
                    Assigned to
                    <Select
                      value={lead.assignedTo?.id ?? ""}
                      onChange={(e) => patch({ assignedToId: e.target.value || null })}
                      className="mt-1 h-9 text-[13px]"
                    >
                      <option value="">Nobody</option>
                      {team.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                )}
                <label className="col-span-2 flex items-start gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={lead.optIn}
                    onChange={(e) => patch({ optIn: e.target.checked })}
                    className="mt-1 accent-[rgb(var(--pin))]"
                  />
                  <span>
                    Agreed to receive WhatsApp/SMS messages
                    <span className="block text-muted">Needed for automatic WhatsApp Business and SMS provider messages.</span>
                  </span>
                </label>
                <div className="col-span-2 text-[13px] text-muted">
                  Tags
                  <TagEditor
                    key={lead.tags ?? ""}
                    tags={(lead.tags ?? "").split(",").filter(Boolean)}
                    onChange={(tags) => patch({ tags })}
                  />
                </div>
                <label className="text-[13px] text-muted">
                  Follow up on
                  <Input
                    type="date"
                    defaultValue={toDateInput(lead.followUpAt)}
                    key={`f-${lead.followUpAt}`}
                    onChange={(e) => patch({ followUpAt: e.target.value ? `${e.target.value}T09:00:00` : null })}
                    className="mt-1 h-9 text-[13px] [color-scheme:dark]"
                  />
                </label>
                <label className="text-[13px] text-muted">
                  Deal value
                  <Input
                    type="number"
                    min={0}
                    defaultValue={lead.dealValue ?? ""}
                    key={`d-${lead.dealValue}`}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if ((v === "" ? null : Number(v)) !== lead.dealValue) patch({ dealValue: v === "" ? null : Number(v) });
                    }}
                    placeholder="0"
                    className="tabular mt-1 h-9 text-[13px]"
                  />
                </label>
              </div>
            </Section>

            {ai && (
              <Section title="AI brief">
                <AiBrief key={lead.id} leadId={lead.id} initial={lead.aiBrief} at={lead.aiBriefAt} />
              </Section>
            )}

            <Section title="Write a message">
              <MessageComposer
                leadId={lead.id}
                lead={lead}
                phones={phones}
                email={(lead.emails ?? "").split(",")[0]?.trim() || null}
                onSent={reload}
                initialBody={lead.aiMessage}
                optIn={lead.optIn}
              />
            </Section>

            {phones[0] && (
              <Section title="Phone call">
                <CallPanel leadId={lead.id} phone={phones[0]} ai={Boolean(ai)} onLogged={reload} />
              </Section>
            )}

            {(lead.enrollments?.length > 0 || lead.emailMessages?.length > 0) && (
              <Section title="Emails and sequences">
                <ul className="space-y-3 text-[13px]">
                  {lead.enrollments.map((en) => {
                    let total = 0;
                    try {
                      total = JSON.parse(en.sequence.steps).length;
                    } catch {
                      total = 0;
                    }
                    const label: Record<string, string> = {
                      ACTIVE: `Running: email ${Math.min(en.currentStep + 1, total)} of ${total} on ${new Date(en.nextAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
                      REPLIED: "Stopped: they replied",
                      FINISHED: "Finished: all emails sent",
                      STOPPED: "Stopped",
                      UNSUBSCRIBED: "Stopped: they unsubscribed",
                      BOUNCED: "Stopped: the email bounced",
                    };
                    return (
                      <li key={en.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <span className="font-medium">{en.sequence.name}</span>
                          <span className="text-muted"> · {label[en.status] ?? en.status.toLowerCase()}</span>
                        </span>
                        {en.status === "ACTIVE" && (
                          <span className="flex gap-2">
                            <button
                              onClick={async () => {
                                await fetch(`/api/outreach/enrollments/${en.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "replied" }),
                                });
                                reload();
                              }}
                              className="text-pin hover:underline"
                            >
                              They replied
                            </button>
                            <button
                              onClick={async () => {
                                await fetch(`/api/outreach/enrollments/${en.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "stop" }),
                                });
                                reload();
                              }}
                              className="text-muted hover:text-ink"
                            >
                              Stop
                            </button>
                          </span>
                        )}
                      </li>
                    );
                  })}
                  {lead.emailMessages.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{m.subject}</span>
                      <span className="shrink-0 text-muted">
                        {m.status === "SENT"
                          ? `${m.openedAt ? "Opened" : "Sent"} ${timeAgo(m.openedAt ?? m.sentAt!)}`
                          : m.status === "QUEUED"
                            ? "Waiting to send"
                            : m.status.toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {ai && (
              <Section title="They replied?">
                <ReplyAssistant leadId={lead.id} phone={phones[0] ?? null} onChanged={reload} />
              </Section>
            )}

            <Section title="Contact">
              <ul className="space-y-2 text-sm">
                {phones.length === 0 && <li className="text-muted">No phone number</li>}
                {phones.map((p) => {
                  const wa = whatsappNumber(p);
                  return (
                    <li key={p} className="flex items-center justify-between gap-3">
                      <span className="tabular">{p}</span>
                      {wa && (
                        <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="text-[13px] text-ok hover:underline">
                          WhatsApp
                        </a>
                      )}
                    </li>
                  );
                })}
                {(lead.emails ?? "")
                  .split(",")
                  .map((e) => e.trim())
                  .filter(Boolean)
                  .map((e, i) => (
                    <li key={e} className="flex items-center justify-between gap-3">
                      <a href={`mailto:${e}`} className="truncate text-info hover:underline">
                        {e}
                      </a>
                      {i === 0 && lead.emailStatus && (
                        <Badge tone={lead.emailStatus === "VALID" ? "ok" : lead.emailStatus === "INVALID" ? "danger" : "neutral"}>
                          {lead.emailStatus === "VALID" ? "Domain accepts mail" : lead.emailStatus === "INVALID" ? "Domain can't receive mail" : "Not sure"}
                        </Badge>
                      )}
                    </li>
                  ))}
                {lead.address && <li className="text-muted">{lead.address}</li>}
              </ul>
            </Section>

            <Section title="Online">
              <ul className="space-y-2 text-sm">
                {lead.website ? (
                  <li>
                    <a
                      href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-pin"
                    >
                      {websiteHost(lead.website)}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </li>
                ) : (
                  <li className="text-pin">No website</li>
                )}
                {Object.entries(socials).map(([k, v]) => (
                  <li key={k}>
                    <a
                      href={k === "whatsapp" ? `https://wa.me/${v}` : v}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-muted hover:text-ink"
                    >
                      {SOCIAL_LABEL[k] ?? k}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </li>
                ))}
                {lead.mapsUrl && (
                  <li>
                    <a href={lead.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-ink">
                      Google Maps listing
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </li>
                )}
                {socials.instagram && (
                  <li className="flex flex-wrap items-center gap-2 text-muted">
                    {lead.igFollowers != null ? (
                      <span className="tabular">
                        Instagram: {formatNumber(lead.igFollowers)} followers, {formatNumber(lead.igPosts ?? 0)} posts
                      </span>
                    ) : (
                      <span>Instagram numbers not checked</span>
                    )}
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/leads/${lead.id}/instagram`, { method: "POST" });
                        const b = await res.json().catch(() => ({}));
                        if (!res.ok) return void toast.error(b.error ?? "Couldn't check Instagram.");
                        reload();
                      }}
                      className="text-[13px] text-pin hover:underline"
                    >
                      {lead.igFollowers != null ? "Refresh" : "Check"}
                    </button>
                  </li>
                )}
                {lead.rating != null && (
                  <li className="tabular text-muted">
                    ★ {lead.rating.toFixed(1)} from {formatNumber(lead.reviewCount ?? 0)} reviews
                  </li>
                )}
              </ul>
            </Section>

            {feats.has("signals") && (
              <Section title="Why now">
                <SignalsPanel lead={lead} />
              </Section>
            )}

            {feats.has("salestools") && (
              <Section title="Win this deal">
                <SalesTools lead={lead} ai={Boolean(ai)} onChanged={reload} />
              </Section>
            )}

            <Section title="Nearby competitors">
              <Competitors leadId={lead.id} title={lead.title} />
            </Section>

            <Section title="Google profile check">
              <GbpCheck lead={lead} />
            </Section>

            <Section title="Reviews">
              {lead.description && <p className="mb-3 text-[13px] text-muted">{lead.description}</p>}
              <ReviewsPanel
                key={lead.id}
                leadId={lead.id}
                reviewsJson={lead.reviews}
                distJson={lead.ratingDist}
                insightsJson={lead.aiReviews}
                insightsAt={lead.aiReviewsAt}
                ai={Boolean(ai)}
              />
            </Section>

            {feats.has("reviews") && (
              <Section title="Review tools">
                <ReviewTools leadId={lead.id} />
              </Section>
            )}

            {lead.website && (
              <Section title="SEO audit">
                <AuditList json={lead.seo} empty="Run a website check to see the SEO audit." />
              </Section>
            )}

            {lead.ecom && (
              <Section title="Online store check">
                <AuditList json={lead.ecom} empty="" />
              </Section>
            )}

            <Section title="Website check">
              {busy ? (
                <p className="inline-flex items-center gap-2 text-sm text-info">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Checking the website…
                </p>
              ) : lead.enrichStatus === "DONE" && lead.website ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge tone={scoreTone(lead.auditScore)} className="tabular text-[13px]">
                      Score {lead.auditScore ?? "-"} / 100
                    </Badge>
                    {lead.siteLoadMs != null && (
                      <span className="tabular text-muted">Loaded in {(lead.siteLoadMs / 1000).toFixed(1)} s</span>
                    )}
                  </div>
                  {issues.length > 0 ? (
                    <ul className="space-y-2">
                      {issues.map((i) => (
                        <li key={i}>
                          <p className="font-medium text-pin">{ISSUE_INFO[i].label}</p>
                          <p className="text-[13px] text-muted">{ISSUE_INFO[i].pitch}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-ok">No common problems found.</p>
                  )}
                  {lead.tech && <p className="text-muted">Built with: {lead.tech}</p>}
                  <p className="text-[12px] text-muted">Checked {timeAgo(lead.enrichedAt!)}</p>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  {lead.website ? "Not checked yet." : "There's no website to check."}
                </p>
              )}
              {!busy && (lead.enrichStatus === "DONE" || !lead.website) && (
                <Button variant="secondary" size="sm" className="mr-2 mt-4" onClick={shareReport}>
                  <Share2 className="h-3.5 w-3.5" aria-hidden />
                  Share report
                </Button>
              )}
              {!busy && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={checkNow} loading={checking}>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  {lead.enrichStatus === "DONE" ? "Check again" : "Check now"}
                </Button>
              )}
            </Section>

            <Section title="Notes and history">
              <LeadActivity leadId={lead.id} items={lead.activities ?? []} onChange={reload} />
            </Section>

            <Section title="Where it came from">
              <p className="text-sm text-muted">
                {lead.source === "IMPORT" ? (
                  <>Added by your team</>
                ) : lead.source === "WEB" && lead.sourceUrl ? (
                  <>
                    Web extractor:{" "}
                    <a href={lead.sourceUrl} target="_blank" rel="noreferrer" className="break-all hover:text-ink">
                      {lead.sourceUrl}
                    </a>
                  </>
                ) : (
                  <>Map search{lead.job ? `: ${lead.job.name}` : ""}</>
                )}
                , added {timeAgo(lead.createdAt)}
              </p>
            </Section>
          </div>
        )}
      </aside>
    </div>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [value, setValue] = useState("");
  function add() {
    const t = value.trim().toLowerCase();
    if (!t || tags.includes(t)) return setValue("");
    onChange([...tags, t]);
    setValue("");
  }
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-control border border-line bg-raised px-2 py-1.5">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-[12px] text-ink">
          #{t}
          <button onClick={() => onChange(tags.filter((x) => x !== t))} className="text-muted hover:text-danger" aria-label={`Remove tag ${t}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={tags.length ? "" : "Add a tag and press Enter"}
        className="min-w-[120px] flex-1 bg-transparent py-0.5 text-[13px] text-ink outline-none placeholder:text-muted/70"
        aria-label="Add tag"
      />
    </div>
  );
}
