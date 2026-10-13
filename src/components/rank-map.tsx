"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";

type Point = { lat: number; lng: number; status: string; rank: number | null };

function color(p: Point) {
  if (p.status === "pending") return "#8B9AB2";
  if (p.rank == null) return "#C83232";
  if (p.rank <= 3) return "#047857";
  if (p.rank <= 10) return "#B7791F";
  return "#C2410C";
}

export function RankMap({ points, center }: { points: Point[]; center: { lat: number; lng: number } }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current) return;
      if (!map.current) {
        map.current = L.map(el.current).setView([center.lat, center.lng], 13);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(map.current);
      }
      const m = map.current;
      m.eachLayer((layer) => {
        if ((layer as unknown as { options?: { pane?: string } }).options?.pane === "markerPane") m.removeLayer(layer);
      });
      const bounds: [number, number][] = [];
      for (const p of points) {
        bounds.push([p.lat, p.lng]);
        const label = p.status === "pending" ? "…" : p.rank == null ? "20+" : String(p.rank);
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:34px;height:34px;border-radius:50%;background:${color(p)};color:#fff;font:600 12px system-ui;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)">${label}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          }),
        }).addTo(m);
      }
      if (bounds.length) m.fitBounds(bounds, { padding: [40, 40] });
    })();
    return () => {
      cancelled = true;
    };
  }, [points, center.lat, center.lng]);

  useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
    },
    [],
  );

  return <div ref={el} className="h-[480px] w-full rounded-panel border border-line" aria-label="Rank grid map" />;
}
