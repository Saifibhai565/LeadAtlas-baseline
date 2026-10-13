"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, LayerGroup } from "leaflet";

type Point = {
  id: string;
  title: string;
  category: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  mapsUrl: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  NEW: "#F2B43C",
  CONTACTED: "#6FA8FF",
  INTERESTED: "#F2B43C",
  WON: "#34C4A0",
  LOST: "#EF6B6B",
};

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function LeadsMap({ query, refreshKey }: { query: string; refreshKey: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const fitted = useRef<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  // Create the map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;
      const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([30.3753, 69.3451], 5);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(m);
      map.current = m;
      layer.current = L.layerGroup().addTo(m);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  // Load points whenever filters change (or new leads arrive)
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(`/api/leads/map?${query}`, { cache: "no-store" });
      if (!res.ok || !alive) return;
      const { points } = (await res.json()) as { points: Point[] };
      const L = (await import("leaflet")).default;
      // wait for the map to exist
      for (let i = 0; i < 20 && !map.current; i++) await new Promise((r) => setTimeout(r, 50));
      if (!alive || !map.current || !layer.current) return;

      layer.current.clearLayers();
      const bounds: [number, number][] = [];
      for (const p of points) {
        if (p.latitude == null || p.longitude == null) continue;
        bounds.push([p.latitude, p.longitude]);
        const color = STATUS_COLOR[p.status] ?? "#F2B43C";
        const rating = p.rating != null ? `★ ${p.rating.toFixed(1)} (${p.reviewCount ?? 0})` : "No reviews";
        L.circleMarker([p.latitude, p.longitude], {
          radius: 6,
          color: "#0C131F",
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.95,
        })
          .bindPopup(
            `<div style="min-width:180px">
              <strong>${esc(p.title)}</strong><br/>
              <span style="opacity:.75">${esc(p.category ?? "")}</span><br/>
              ${p.phone ? esc(p.phone) + "<br/>" : ""}
              ${esc(rating)}<br/>
              ${p.mapsUrl ? `<a href="${esc(p.mapsUrl)}" target="_blank" rel="noreferrer">Open in Google Maps</a>` : ""}
            </div>`,
          )
          .addTo(layer.current);
      }
      setCount(bounds.length);
      // Fit to results when the filters change, not on every live refresh
      if (bounds.length && fitted.current !== query) {
        map.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        fitted.current = query;
      }
    })();
    return () => {
      alive = false;
    };
  }, [query, refreshKey]);

  return (
    <div className="relative">
      <div ref={el} className="h-[620px] w-full" aria-label="Map of leads" />
      {count != null && (
        <span className="tabular pointer-events-none absolute right-3 top-3 z-[500] rounded-full border border-line bg-surface/90 px-3 py-1 text-[13px]">
          {count} on the map
        </span>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex gap-3 rounded-control border border-line bg-surface/90 px-3 py-1.5 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: "#F2B43C" }} />New / interested</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: "#6FA8FF" }} />Contacted</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: "#34C4A0" }} />Won</span>
      </div>
    </div>
  );
}
