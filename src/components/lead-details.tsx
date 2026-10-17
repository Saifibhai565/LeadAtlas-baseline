"use client";

import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { LeadDetails } from "@/lib/lead-details";
import { SocialLinks } from "./social-links";

type L = {
  title: string;
  phone: string | null;
  extraPhones?: string | null;
  emails: string | null;
  website: string | null;
  socials: string | null;
  ownerName?: string | null;
  builtBy?: string | null;
  mapsUrl: string | null;
  priceRange?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  details?: string | null;
  tech?: string | null;
  id?: string;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5">
      <dt className="w-36 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-pin hover:underline">
      {children}
      <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}

function CopyText({ value }: { value: string }) {
  return (
    <button onClick={() => navigator.clipboard.writeText(value).then(() => toast.success("Copied."))} className="inline-flex items-center gap-1 font-mono text-[12px] hover:text-pin">
      {value}
      <Copy className="h-3 w-3 text-muted" aria-hidden />
    </button>
  );
}

/** Everything we know about the business, A to Z, with clickable links. */
export function LeadDetailsPanel({ lead }: { lead: L }) {
  let d: LeadDetails = {};
  try {
    d = lead.details ? JSON.parse(lead.details) : {};
  } catch {
    d = {};
  }
  const emails = (lead.emails ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const phones = Array.from(new Set([lead.phone, ...(lead.extraPhones ?? "").split(",")].map((p) => p?.trim()).filter(Boolean))) as string[];
  const addr = d.address;

  return (
    <div className="space-y-4 text-[13px]">
      <dl className="divide-y divide-line/60">
        {(lead.ownerName || d.owner?.name) && (
          <Row label="Owner">
            {lead.ownerName && <span className="block">{lead.ownerName} (from their website)</span>}
            {d.owner?.name && (
              <span className="block">
                {d.owner.name} (Google profile){" "}
                {d.owner.link && <Ext href={d.owner.link}>open</Ext>}
              </span>
            )}
          </Row>
        )}
        {phones.length > 0 && (
          <Row label={phones.length > 1 ? "Phones" : "Phone"}>
            {phones.map((p) => (
              <a key={p} href={`tel:${p.replace(/[^\d+]/g, "")}`} className="mr-3 inline-block tabular hover:text-pin">
                {p}
              </a>
            ))}
          </Row>
        )}
        {emails.length > 0 && (
          <Row label={emails.length > 1 ? "Emails" : "Email"}>
            {emails.map((e) => (
              <a key={e} href={`mailto:${e}`} className="mr-3 inline-block text-info hover:underline">
                {e}
              </a>
            ))}
          </Row>
        )}
        {lead.website && (
          <Row label="Website">
            <Ext href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}>{lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</Ext>
          </Row>
        )}
        {lead.socials && (
          <Row label="Social profiles">
            <SocialLinks json={lead.socials} size="md" />
          </Row>
        )}
        {lead.builtBy && <Row label="Website made by">{lead.builtBy}</Row>}
        {lead.tech && <Row label="Website built with">{lead.tech}</Row>}
      </dl>

      <dl className="divide-y divide-line/60">
        {lead.mapsUrl && (
          <Row label="Google Maps">
            <Ext href={lead.mapsUrl}>open listing</Ext>
            {d.reviewsLink && (
              <>
                {" · "}
                <Ext href={d.reviewsLink}>all reviews</Ext>
              </>
            )}
          </Row>
        )}
        {d.status && <Row label="Status on Google">{d.status}</Row>}
        {lead.priceRange && <Row label="Price range">{lead.priceRange}</Row>}
        {d.menu && (
          <Row label="Menu">
            <Ext href={d.menu}>open menu</Ext>
          </Row>
        )}
        {!!d.reservations?.length && (
          <Row label="Bookings">
            {d.reservations.map((r) => (
              <span key={r.link} className="mr-3 inline-block">
                <Ext href={r.link}>{r.source || "book"}</Ext>
              </span>
            ))}
          </Row>
        )}
        {!!d.orderOnline?.length && (
          <Row label="Order online">
            {d.orderOnline.map((r) => (
              <span key={r.link} className="mr-3 inline-block">
                <Ext href={r.link}>{r.source || "order"}</Ext>
              </span>
            ))}
          </Row>
        )}
        {addr && (addr.city || addr.street) && (
          <Row label="Address parts">{[addr.street, addr.borough, addr.city, addr.state, addr.postal, addr.country].filter(Boolean).join(" · ")}</Row>
        )}
        {d.plusCode && <Row label="Plus code">{d.plusCode}</Row>}
        {lead.latitude != null && (
          <Row label="Coordinates">
            <CopyText value={`${lead.latitude.toFixed(6)}, ${lead.longitude?.toFixed(6)}`} />
          </Row>
        )}
        {d.timezone && <Row label="Time zone">{d.timezone}</Row>}
        {d.placeId && (
          <Row label="Place ID">
            <CopyText value={d.placeId} />
          </Row>
        )}
        {d.cid && (
          <Row label="CID">
            <CopyText value={d.cid} />
          </Row>
        )}
      </dl>

      {!!d.about?.length && (
        <div className="space-y-2">
          <p className="font-medium">From their Google profile</p>
          {d.about.map((g) => (
            <div key={g.group}>
              <p className="text-[12px] text-muted">{g.group}</p>
              <p className="mt-0.5 flex flex-wrap gap-1">
                {g.items.map((i) => (
                  <span key={i} className="rounded bg-raised px-1.5 py-0.5 text-[12px]">
                    {i}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
      )}

      {!!d.images?.length && (
        <div>
          <p className="mb-1.5 font-medium">Photos {d.imageCount ? <span className="font-normal text-muted">({d.imageCount} on Google)</span> : null}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {d.images.map((src) => (
              <a key={src} href={src} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-square w-full rounded object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {lead.id && (
        <button
          onClick={async () => {
            if (!confirm("Remove this business's personal contact details (emails, phones, owner name, socials)? The record stays so you know not to contact them again. This is for privacy/GDPR requests and can't be undone.")) return;
            const res = await fetch(`/api/leads/${lead.id}/privacy`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forget" }) });
            if (res.ok) {
              toast.success("Personal details removed and the addresses suppressed.");
              window.location.reload();
            } else toast.error("Couldn't do that.");
          }}
          className="text-[12px] text-danger hover:underline"
        >
          Privacy request: remove personal details
        </button>
      )}
      {!lead.details && <p className="text-[12px] text-muted">More Google details (owner profile, menu, bookings, photos, features) are saved for leads from new searches.</p>}
    </div>
  );
}
