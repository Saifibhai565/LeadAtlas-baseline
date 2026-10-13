"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { timeAgo } from "@/lib/utils";

type Person = { id: string; name: string; email: string; createdAt?: string };
type Invite = { id: string; email: string; token: string; createdAt: string };
type Data = { owner: Person; members: Person[]; invites: Invite[]; seats: number; isOwner: boolean };

export function TeamView() {
  const [data, setData] = useState<Data | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/team", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData);
  }, []);
  useEffect(load, [load]);

  const link = (token: string) => `${window.location.origin}/invite/${token}`;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const b = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't create the invite.");
    setEmail("");
    await navigator.clipboard.writeText(link(b.invite.token)).catch(() => undefined);
    toast.success(
      b.emailed
        ? "Invite emailed to them. The link is also copied, in case you want to send it on WhatsApp."
        : "Invite link copied. Send it to them on WhatsApp or email.",
    );
    load();
  }

  async function removeMember(p: Person) {
    if (!confirm(`Remove ${p.name} from your team? They won't be able to sign in. Their notes stay.`)) return;
    const res = await fetch(`/api/team/${p.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Couldn't remove this person.");
    toast.success(`${p.name} was removed.`);
    load();
  }

  async function cancelInvite(i: Invite) {
    const res = await fetch(`/api/team/invites/${i.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (!data) return <div className="h-64 max-w-3xl animate-pulse rounded-panel bg-surface" />;
  const used = 1 + data.members.length + data.invites.length;

  return (
    <div className="grid max-w-5xl items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Panel>
        <PanelHeader title="People" description={`${used} of ${data.seats} seat${data.seats === 1 ? "" : "s"} used`} />
        <ul className="divide-y divide-line">
          <li className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <p className="truncate font-medium">{data.owner.name}</p>
              <p className="truncate text-[13px] text-muted">{data.owner.email}</p>
            </div>
            <Badge tone="pin">Owner</Badge>
          </li>
          {data.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-medium">{m.name}</p>
                <p className="truncate text-[13px] text-muted">
                  {m.email}, joined {timeAgo(m.createdAt!)}
                </p>
              </div>
              {data.isOwner && (
                <button
                  onClick={() => removeMember(m)}
                  className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-danger"
                  aria-label={`Remove ${m.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
          {data.invites.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-muted">{i.email}</p>
                <p className="text-[13px] text-muted">Invited {timeAgo(i.createdAt)}, hasn't joined yet</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => navigator.clipboard.writeText(link(i.token)).then(() => toast.success("Invite link copied."))}
                  className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-ink"
                  aria-label={`Copy invite link for ${i.email}`}
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => cancelInvite(i)}
                  className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-danger"
                  aria-label={`Cancel invite for ${i.email}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {data.isOwner ? (
        <Panel className="p-5">
          <h2 className="text-[15px] font-semibold">Invite someone</h2>
          <p className="mt-1 text-sm text-muted">
            Team members share your leads, searches, templates and credits. You can assign leads to them from the lead panel.
          </p>
          <form onSubmit={invite} className="mt-5 space-y-3">
            <div>
              <Label htmlFor="invite-email">Their email</Label>
              <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Hint>You'll get a link to send them. It works once.</Hint>
            </div>
            <Button type="submit" loading={busy} className="w-full">
              <UserPlus className="h-4 w-4" aria-hidden />
              Create invite link
            </Button>
          </form>
        </Panel>
      ) : (
        <Panel className="p-5 text-sm text-muted">Only the account owner can invite or remove people.</Panel>
      )}
    </div>
  );
}
