"use client";

/** Small coloured buttons that open each social profile. */
const STYLE: Record<string, { label: string; cls: string; name: string }> = {
  facebook: { label: "f", cls: "bg-[#1877F2] text-white", name: "Facebook" },
  instagram: { label: "IG", cls: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white", name: "Instagram" },
  linkedin: { label: "in", cls: "bg-[#0A66C2] text-white", name: "LinkedIn" },
  x: { label: "X", cls: "bg-black text-white", name: "X (Twitter)" },
  youtube: { label: "▶", cls: "bg-[#FF0000] text-white", name: "YouTube" },
  tiktok: { label: "TT", cls: "bg-[#111] text-white", name: "TikTok" },
  whatsapp: { label: "WA", cls: "bg-[#25D366] text-white", name: "WhatsApp" },
  pinterest: { label: "P", cls: "bg-[#E60023] text-white", name: "Pinterest" },
  telegram: { label: "TG", cls: "bg-[#26A5E4] text-white", name: "Telegram" },
  snapchat: { label: "SC", cls: "bg-[#FFFC00] text-black", name: "Snapchat" },
  threads: { label: "@", cls: "bg-[#111] text-white", name: "Threads" },
};

export function SocialLinks({ json, size = "sm" }: { json: string | null; size?: "sm" | "md" }) {
  let s: Record<string, string> = {};
  try {
    s = json ? JSON.parse(json) : {};
  } catch {
    s = {};
  }
  const entries = Object.entries(s).filter(([, v]) => typeof v === "string" && v);
  if (!entries.length) return null;
  const dim = size === "md" ? "h-7 min-w-7 text-[12px]" : "h-6 min-w-6 text-[11px]";
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {entries.map(([k, url]) => {
        const st = STYLE[k] ?? { label: k.slice(0, 2).toUpperCase(), cls: "bg-raised text-ink", name: k };
        const href = url.startsWith("http") ? url : k === "whatsapp" ? `https://wa.me/${url.replace(/\D/g, "")}` : `https://${url}`;
        return (
          <a
            key={k}
            href={href}
            target="_blank"
            rel="noreferrer"
            title={`${st.name}: ${url}`}
            aria-label={`${st.name} profile`}
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex ${dim} items-center justify-center rounded-md px-1.5 font-bold leading-none transition-transform hover:-translate-y-0.5 ${st.cls}`}
          >
            {st.label}
          </a>
        );
      })}
    </span>
  );
}
