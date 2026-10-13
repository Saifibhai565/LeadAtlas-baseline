"use client";

import { useState } from "react";

export function AcceptProposal({ token, accepted, accent }: { token: string; accepted: boolean; accent: string }) {
  const [done, setDone] = useState(accepted);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const rgb = [1, 3, 5].map((i) => parseInt(accent.slice(i, i + 2), 16) / 255);
  const textColor = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] > 0.55 ? "#141A23" : "#FFFFFF";

  if (done) {
    return <p className="rounded-xl bg-[#E3F6EF] px-4 py-3 font-medium text-[#047857]">Accepted. Thank you! We'll be in touch shortly to get started.</p>;
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await fetch(`/api/public/proposals/${token}/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        setBusy(false);
        if (res.ok) setDone(true);
      }}
      className="flex flex-wrap gap-2"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        required
        className="h-12 flex-1 rounded-xl border border-[#D5DBE3] bg-white px-4 text-[15px] outline-none focus:border-[#141A23]"
      />
      <button type="submit" disabled={busy} className="h-12 rounded-xl px-6 font-semibold" style={{ background: accent, color: textColor }}>
        {busy ? "Accepting…" : "Accept proposal"}
      </button>
    </form>
  );
}
