"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Select, Toggle } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";

type Booking = { id: string; name: string; email: string | null; phone: string | null; startsAt: string; note: string | null };
type Data = {
  meetingSlug: string | null;
  meetingTitle: string | null;
  meetingMinutes: number;
  meetingDays: string | null;
  meetingTz: string;
  link: string | null;
  isOwner: boolean;
  bookings: Booking[];
};

const DAYS: [string, string][] = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]];

export function MeetingView() {
  const [d, setD] = useState<Data | null>(null);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [days, setDays] = useState<Record<string, [number, number]>>({});

  const load = useCallback(() => {
    fetch("/api/meeting")
      .then((r) => r.json())
      .then((b: Data) => {
        setD(b);
        setTitle(b.meetingTitle ?? "");
        setMinutes(String(b.meetingMinutes));
        try {
          setDays(b.meetingDays ? JSON.parse(b.meetingDays) : { mon: [9, 17], tue: [9, 17], wed: [9, 17], thu: [9, 17], fri: [9, 17] });
        } catch {
          setDays({ mon: [9, 17], tue: [9, 17], wed: [9, 17], thu: [9, 17], fri: [9, 17] });
        }
      });
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (!d) return <div className="h-64 animate-pulse rounded-panel bg-surface" />;
  if (!d.isOwner) return <Panel className="p-6 text-sm text-muted">Ask the account owner to set up the booking page.</Panel>;

  async function save(enable = false) {
    const res = await fetch("/api/meeting", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enable, title, minutes: Number(minutes), days }) });
    if (res.ok) {
      toast.success("Saved.");
      load();
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Panel className="space-y-4 p-5">
        <PanelHeader title="Your booking page" description="Share the link in messages and emails. People pick a free time and book themselves." />
        {d.link ? (
          <div className="flex gap-2">
            <Input value={d.link} readOnly onFocus={(e) => e.target.select()} className="font-mono text-[13px]" />
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(d.link!).then(() => toast.success("Link copied."))}>
              Copy
            </Button>
            <a href={d.link} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-control border border-line px-3 text-sm">
              Open
            </a>
          </div>
        ) : (
          <Button onClick={() => save(true)}>Create my booking link</Button>
        )}
        <div>
          <Label htmlFor="mt">Meeting title</Label>
          <Input id="mt" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Intro call" />
        </div>
        <div>
          <Label htmlFor="mm">Length</Label>
          <Select id="mm" value={minutes} onChange={(e) => setMinutes(e.target.value)}>
            {[15, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Available hours</Label>
          <div className="space-y-1.5">
            {DAYS.map(([k, label]) => {
              const on = Boolean(days[k]);
              const [from, to] = days[k] ?? [9, 17];
              return (
                <div key={k} className="flex items-center gap-3 text-sm">
                  <Toggle
                    checked={on}
                    onChange={(v) => setDays((cur) => (v ? { ...cur, [k]: [9, 17] } : Object.fromEntries(Object.entries(cur).filter(([x]) => x !== k))))}
                    label={label}
                  />
                  {on && (
                    <span className="flex items-center gap-1 text-muted">
                      <Select value={from} onChange={(e) => setDays((c) => ({ ...c, [k]: [Number(e.target.value), to] }))} className="h-8 w-auto text-[13px]">
                        {Array.from({ length: 24 }, (_, h) => (
                          <option key={h} value={h}>
                            {h}:00
                          </option>
                        ))}
                      </Select>
                      to
                      <Select value={to} onChange={(e) => setDays((c) => ({ ...c, [k]: [from, Number(e.target.value)] }))} className="h-8 w-auto text-[13px]">
                        {Array.from({ length: 24 }, (_, h) => (
                          <option key={h} value={h}>
                            {h}:00
                          </option>
                        ))}
                      </Select>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <Hint>Times are in {d.meetingTz.replace("_", " ")}.</Hint>
        </div>
        <Button onClick={() => save(false)}>Save</Button>
      </Panel>

      <Panel>
        <PanelHeader title="Upcoming meetings" />
        {d.bookings.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">No meetings booked yet.</p>}
        <ul className="divide-y divide-line">
          {d.bookings.map((bk) => (
            <li key={bk.id} className="px-5 py-3 text-sm">
              <p className="font-medium">
                {bk.name} <Badge tone="info">{new Date(bk.startsAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Badge>
              </p>
              <p className="text-[13px] text-muted">
                {[bk.email, bk.phone].filter(Boolean).join(" · ")}
                {bk.note ? ` — ${bk.note}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
