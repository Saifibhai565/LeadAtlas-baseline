"use client";

import { useEffect, useState } from "react";

type Day = { date: string; label: string; slots: { iso: string; label: string }[] };
type Data = { host: string; title: string; minutes: number; tz: string; days: Day[] };

export function BookingForm({ slug }: { slug: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", email: "", phone: "", note: "" });
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/meeting/slots?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(setD);
  }, [slug]);

  if (!d) return <p className="mx-auto max-w-lg text-center text-[#5B6575]">Loading…</p>;

  if (done) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-2xl font-semibold text-[#047857]">You're booked!</p>
        <p className="mt-2 text-[#2b3442]">Your meeting with {d.host} is confirmed for {done}. {f.email ? "A confirmation email is on its way." : ""}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-sm text-[#5B6575]">{d.host}</p>
        <h1 className="mt-1 text-2xl font-semibold">{d.title}</h1>
        <p className="mt-1 text-sm text-[#5B6575]">{d.minutes} minutes · times shown in {d.tz.replace("_", " ")}</p>

        {d.days.length === 0 ? (
          <p className="mt-6 text-[#5B6575]">No times are open right now. Please check back later.</p>
        ) : !slot ? (
          <div className="mt-6 space-y-5">
            {d.days.map((day) => (
              <div key={day.date}>
                <p className="mb-2 text-sm font-medium">{day.label}</p>
                <div className="flex flex-wrap gap-2">
                  {day.slots.map((s) => (
                    <button key={s.iso} onClick={() => setSlot(s.iso)} className="rounded-lg border border-[#D5DBE3] px-3 py-2 text-sm hover:border-[#141A23]">
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const res = await fetch("/api/meeting/slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, iso: slot, ...f }) });
              const b = await res.json().catch(() => ({}));
              setBusy(false);
              if (!res.ok) {
                alert(b.error ?? "Couldn't book. Try another time.");
                if (res.status === 409) {
                  setSlot(null);
                  fetch(`/api/meeting/slots?slug=${encodeURIComponent(slug)}`).then((r) => r.json()).then(setD);
                }
                return;
              }
              setDone(new Date(slot).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }));
            }}
            className="mt-6 space-y-3"
          >
            <p className="text-sm">
              Selected: <strong>{new Date(slot).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</strong>{" "}
              <button type="button" onClick={() => setSlot(null)} className="text-[#1A73E8] underline">
                change
              </button>
            </p>
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Your name" required className="h-12 w-full rounded-lg border border-[#D5DBE3] px-3" />
            <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} type="email" placeholder="Email (for confirmation)" className="h-12 w-full rounded-lg border border-[#D5DBE3] px-3" />
            <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Phone (optional)" className="h-12 w-full rounded-lg border border-[#D5DBE3] px-3" />
            <textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Anything we should know? (optional)" rows={3} className="w-full rounded-lg border border-[#D5DBE3] px-3 py-2" />
            <button type="submit" disabled={busy} className="h-12 w-full rounded-lg bg-[#141A23] font-semibold text-white">
              {busy ? "Booking…" : "Confirm meeting"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
