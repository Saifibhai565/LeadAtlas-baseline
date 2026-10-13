"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label } from "@/components/ui/field";
import { Badge, Panel, PanelHeader } from "@/components/ui/panel";
import { timeAgo } from "@/lib/utils";

type Key = { id: string; name: string; prefix: string; lastUsedAt: string | null; createdAt: string };
type Hook = { id: string; url: string; events: string; secret: string; lastStatus: number | null; lastAt: string | null };

const EVENTS = [
  ["lead.created", "New leads saved"],
  ["search.finished", "Search finished"],
  ["lead.status_changed", "Lead moved stage"],
] as const;

function Code({ children }: { children: string }) {
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-control border border-line bg-night/60 p-3 text-[12px] leading-5 text-ink">{children}</pre>
      <button
        onClick={() => navigator.clipboard.writeText(children).then(() => toast.success("Copied."))}
        className="absolute right-2 top-2 rounded p-1 text-muted opacity-0 hover:text-ink group-hover:opacity-100"
        aria-label="Copy code"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function DevelopersView() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [hookUrl, setHookUrl] = useState("");
  const [hookEvents, setHookEvents] = useState<string[]>(["lead.created"]);
  const [origin, setOrigin] = useState("");

  const load = useCallback(() => {
    fetch("/api/developer/keys")
      .then((r) => r.json())
      .then((b) => {
        setKeys(b.keys ?? []);
        setAllowed(Boolean(b.allowed));
        setIsOwner(b.isOwner !== false);
      });
    fetch("/api/developer/webhooks")
      .then((r) => r.json())
      .then((b) => setHooks(b.hooks ?? []));
  }, []);
  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, [load]);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/developer/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName }),
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(b.error ?? "Couldn't create the key.");
    setNewKey(b.key);
    setKeyName("");
    load();
  }

  async function removeKey(k: Key) {
    if (!confirm(`Delete “${k.name}”? Anything using it stops working.`)) return;
    const res = await fetch(`/api/developer/keys/${k.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function addHook(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/developer/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: hookUrl, events: hookEvents }),
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(b.error ?? "Couldn't add the webhook.");
    setHookUrl("");
    toast.success("Webhook added.");
    load();
  }

  async function testHook(h: Hook) {
    const res = await fetch(`/api/developer/webhooks/${h.id}/test`, { method: "POST" });
    const b = await res.json().catch(() => ({}));
    if (b.status >= 200 && b.status < 300) toast.success(`Delivered (${b.status}).`);
    else toast.error(b.status ? `Your server answered ${b.status}.` : "Couldn't reach that address.");
    load();
  }

  async function removeHook(h: Hook) {
    const res = await fetch(`/api/developer/webhooks/${h.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (allowed === false) {
    return (
      <Panel className="max-w-2xl p-6">
        <h2 className="text-[15px] font-semibold">API, webhooks and the Chrome extension are part of Agency</h2>
        <p className="mt-1 text-sm text-muted">
          Connect your own tools, get new leads pushed to your CRM or Google Sheet, and save businesses from Google Maps with one click.
        </p>
        <Link href="/billing" className="mt-4 inline-flex h-10 items-center rounded-control bg-pin px-4 text-sm font-semibold text-pin-ink">
          See plans
        </Link>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="API keys" description="Each key gives full access to this account's leads. Keep them private." />
          {newKey && (
            <div className="border-b border-line bg-ok/5 p-4">
              <p className="text-sm font-medium text-ok">Copy your new key now. It won't be shown again.</p>
              <div className="mt-2 flex gap-2">
                <Input value={newKey} readOnly className="h-9 font-mono text-[12px]" onFocus={(e) => e.target.select()} />
                <Button size="sm" className="h-9" onClick={() => navigator.clipboard.writeText(newKey).then(() => toast.success("Key copied."))}>
                  Copy
                </Button>
              </div>
            </div>
          )}
          <ul className="divide-y divide-line">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium">{k.name}</p>
                  <p className="text-[13px] text-muted">
                    <span className="font-mono">{k.prefix}…</span>, {k.lastUsedAt ? `used ${timeAgo(k.lastUsedAt)}` : "never used"}
                  </p>
                </div>
                {isOwner && (
                  <button onClick={() => removeKey(k)} className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-danger" aria-label={`Delete ${k.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {isOwner && (
            <form onSubmit={createKey} className="flex gap-2 border-t border-line p-4">
              <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Name, like “Chrome extension”" className="h-9 text-[13px]" />
              <Button size="sm" className="h-9 shrink-0" type="submit">
                Create key
              </Button>
            </form>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Webhooks" description="We send a POST to your address when something happens." />
          <ul className="divide-y divide-line">
            {hooks.map((h) => (
              <li key={h.id} className="px-5 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{h.url}</p>
                    <p className="text-[13px] text-muted">{h.events.split(",").join(", ")}</p>
                    <p className="mt-1 text-[12px] text-muted">
                      Signing secret <span className="font-mono">{h.secret.slice(0, 8)}…</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(h.secret).then(() => toast.success("Secret copied."))}
                        className="ml-2 text-pin hover:underline"
                      >
                        copy
                      </button>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {h.lastStatus != null && (
                      <Badge tone={h.lastStatus >= 200 && h.lastStatus < 300 ? "ok" : "danger"}>{h.lastStatus || "failed"}</Badge>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => testHook(h)}>
                      Test
                    </Button>
                    {isOwner && (
                      <button onClick={() => removeHook(h)} className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-danger" aria-label="Delete webhook">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {isOwner && (
            <form onSubmit={addHook} className="space-y-3 border-t border-line p-4">
              <div>
                <Label htmlFor="hu" className="text-[12px]">
                  Address
                </Label>
                <Input id="hu" value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://hooks.zapier.com/…" className="h-9 text-[13px]" required />
                <Hint>Works with Zapier, Make, n8n, or your own server.</Hint>
              </div>
              <div className="flex flex-wrap gap-3 text-[13px]">
                {EVENTS.map(([v, l]) => (
                  <label key={v} className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      className="accent-[rgb(var(--pin))]"
                      checked={hookEvents.includes(v)}
                      onChange={(e) => setHookEvents((ev) => (e.target.checked ? [...ev, v] : ev.filter((x) => x !== v)))}
                    />
                    {l}
                  </label>
                ))}
              </div>
              <Button size="sm" type="submit">
                Add webhook
              </Button>
            </form>
          )}
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Chrome extension" description="Save a business from Google Maps, or any website, with one click." />
        <ol className="list-decimal space-y-2 p-5 pl-10 text-sm">
          <li>
            Open <span className="font-mono text-pin">chrome://extensions</span> in Chrome and switch on <strong>Developer mode</strong> (top right).
          </li>
          <li>
            Click <strong>Load unpacked</strong> and choose the <span className="font-mono text-pin">extension</span> folder inside the app's folder.
          </li>
          <li>Click the extension's icon, paste this address and an API key from above, and save.</li>
          <li>Open any business on Google Maps and click the icon. Its name, phone, address and website fill in. Press Save.</li>
        </ol>
        <div className="px-5 pb-5">
          <Code>{origin || "http://localhost:3000"}</Code>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="API reference" description="Send your key in the Authorization header. Responses are JSON." />
        <div className="space-y-5 p-5 text-sm">
          <div>
            <p className="mb-2 font-medium">List leads</p>
            <Code>{`curl "${origin}/api/v1/leads?limit=50&minScore=60" \\
  -H "Authorization: Bearer la_your_key"`}</Code>
            <Hint>Filters: q, status, category, phone=1, email=1, website=0 or 1, minRating, minScore, since (ISO date), page, limit (max 500).</Hint>
          </div>
          <div>
            <p className="mb-2 font-medium">Start a Google Maps search</p>
            <Code>{`curl -X POST "${origin}/api/v1/searches" \\
  -H "Authorization: Bearer la_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"keywords":["dentist in Lahore"],"depth":2}'`}</Code>
          </div>
          <div>
            <p className="mb-2 font-medium">Check a search</p>
            <Code>{`curl "${origin}/api/v1/searches/SEARCH_ID" -H "Authorization: Bearer la_your_key"`}</Code>
          </div>
          <div>
            <p className="mb-2 font-medium">Add a lead</p>
            <Code>{`curl -X POST "${origin}/api/v1/leads" \\
  -H "Authorization: Bearer la_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Al-Shifa Dental","phone":"0300 1234567","website":"alshifa.pk"}'`}</Code>
          </div>
          <div>
            <p className="mb-2 font-medium">Verifying webhooks</p>
            <p className="text-muted">
              Each request has an <span className="font-mono">X-LeadAtlas-Signature</span> header: <span className="font-mono">sha256=</span> followed by the
              HMAC-SHA256 of the raw body, using the webhook's signing secret.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
