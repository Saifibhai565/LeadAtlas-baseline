"use client";

import { useState } from "react";

export function PrivateFeedback({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [f, setF] = useState({ name: "", contact: "", message: "" });
  if (sent) return <p className="mt-6 text-sm text-[#047857]">Thank you. Your message went straight to the owner.</p>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-4 text-sm text-[#5B6575] underline">
        Or send a private message to the owner
      </button>
    );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch(`/api/public/feedback/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
        if (res.ok) setSent(true);
      }}
      className="mt-6 space-y-2 text-left"
    >
      <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Your name (optional)" className="h-11 w-full rounded-lg border border-[#D5DBE3] px-3 text-sm" />
      <input value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="Phone or email (optional)" className="h-11 w-full rounded-lg border border-[#D5DBE3] px-3 text-sm" />
      <textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Your message" rows={4} required className="w-full rounded-lg border border-[#D5DBE3] px-3 py-2 text-sm" />
      <button type="submit" className="h-11 w-full rounded-lg bg-[#141A23] text-sm font-semibold text-white">
        Send
      </button>
    </form>
  );
}
