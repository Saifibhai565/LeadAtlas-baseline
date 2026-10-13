import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  const name = s.platform_name || "LeadAtlas";
  return {
    name,
    short_name: name,
    description: s.seo_description,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F4F6F9",
    theme_color: "#0C131F",
    icons: s.platform_favicon
      ? [{ src: "/brand/favicon", sizes: "any", type: s.platform_favicon.slice(5, s.platform_favicon.indexOf(";")) }]
      : [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
  };
}
