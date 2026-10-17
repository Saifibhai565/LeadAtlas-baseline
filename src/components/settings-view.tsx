"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Select, Textarea, Toggle } from "@/components/ui/field";
import { Badge, Panel } from "@/components/ui/panel";
import { toggleTheme } from "@/lib/theme";
import { setLanguage, useT } from "./i18n-provider";
import { TwoFactorPanel } from "./two-factor";

type Me = { name: string; email: string; businessName: string | null; offer: string | null; signature: string | null; emailAlerts?: boolean };

export function SettingsView() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((b) => setMe(b.me));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(me),
    });
    const b = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't save.");
    toast.success("Settings saved.");
    router.refresh();
  }

  if (!me) return <div className="h-80 max-w-2xl animate-pulse rounded-panel bg-surface" />;

  return (
    <div className="max-w-2xl space-y-6">
    <Panel>
      <form onSubmit={save} className="space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Your name</Label>
            <Input id="name" value={me.name} onChange={(e) => setMe({ ...me, name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={me.email} disabled />
          </div>
        </div>
        <div>
          <Label htmlFor="biz">Your business name</Label>
          <Input
            id="biz"
            value={me.businessName ?? ""}
            onChange={(e) => setMe({ ...me, businessName: e.target.value })}
            placeholder="Bright Web Studio"
          />
        </div>
        <div>
          <Label htmlFor="offer">What you sell</Label>
          <Textarea
            id="offer"
            rows={4}
            value={me.offer ?? ""}
            onChange={(e) => setMe({ ...me, offer: e.target.value })}
            placeholder="Websites for clinics and restaurants, from Rs 35,000, ready in 7 days. Also Google Business Profile setup."
            dir="auto"
          />
          <Hint>The AI writer uses this to explain your offer in each message. Be specific.</Hint>
        </div>
        <div>
          <Label htmlFor="sig">Email signature</Label>
          <Textarea
            id="sig"
            rows={3}
            value={me.signature ?? ""}
            onChange={(e) => setMe({ ...me, signature: e.target.value })}
            placeholder={"Ali Khan\nBright Web Studio\n0300 0000000"}
          />
        </div>
        <Toggle
          checked={me.emailAlerts !== false}
          onChange={(v) => setMe({ ...me, emailAlerts: v })}
          label="Email me when a watch finds new businesses"
        />
        <Button type="submit" loading={saving}>
          Save settings
        </Button>
      </form>
    </Panel>
    <BrandingPanel />
    <SheetsPanel />
    <HubspotPanel />
    <InstagramPanel />
    <SmsPanel />
    <SecurityPanel />
    <LanguagePanel />
    <AppearancePanel />
    <PasswordPanel />
    <DataPanel />
    </div>
  );
}

function PasswordPanel() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    const b = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't change the password.");
    setCurrent("");
    setNext("");
    toast.success("Password changed.");
  }

  return (
    <Panel>
      <form onSubmit={save} className="space-y-4 p-6">
        <h2 className="text-[15px] font-semibold">Change password</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cur">Current password</Label>
            <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
          </div>
          <div>
            <Label htmlFor="new">New password</Label>
            <Input id="new" type="password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
          </div>
        </div>
        <Button type="submit" variant="secondary" loading={saving}>
          Change password
        </Button>
      </form>
    </Panel>
  );
}

function BrandingPanel() {
  const [b, setB] = useState<{ brandName: string; brandColor: string; brandWhatsapp: string; customDomain: string } | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [wl, setWl] = useState<{ can: boolean; target: string | null; dnsOk: boolean | null; saved: string }>({ can: false, target: null, dnsOk: null, saved: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/branding")
      .then((r) => r.json())
      .then((d) => {
        setIsOwner(Boolean(d.isOwner));
        setWl({ can: Boolean(d.canWhiteLabel), target: d.target ?? null, dnsOk: d.dnsOk ?? null, saved: d.branding?.customDomain ?? "" });
        setB({
          customDomain: d.branding?.customDomain ?? "",
          brandName: d.branding?.brandName ?? "",
          brandColor: d.branding?.brandColor ?? "#2563EB",
          brandWhatsapp: d.branding?.brandWhatsapp ?? "",
        });
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(d.error ?? "Couldn't save branding.");
    toast.success("Branding saved.");
  }

  if (!b || !isOwner) return null;
  return (
    <Panel>
      <form onSubmit={save} className="space-y-4 p-6">
        <div>
          <h2 className="text-[15px] font-semibold">Your brand on shared reports</h2>
          <p className="mt-1 text-sm text-muted">
            When you share a website report with a business, it shows your name and colour, and a button to message you.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div>
            <Label htmlFor="bn">Brand name</Label>
            <Input id="bn" value={b.brandName} onChange={(e) => setB({ ...b, brandName: e.target.value })} placeholder="Bright Web Studio" />
          </div>
          <div>
            <Label htmlFor="bc">Colour</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={b.brandColor || "#2563EB"}
                onChange={(e) => setB({ ...b, brandColor: e.target.value })}
                className="h-10 w-10 shrink-0 cursor-pointer rounded-control border border-line bg-raised"
                aria-label="Pick colour"
              />
              <Input id="bc" value={b.brandColor} onChange={(e) => setB({ ...b, brandColor: e.target.value })} className="font-mono text-[13px]" />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="bw">WhatsApp number for replies</Label>
          <Input id="bw" value={b.brandWhatsapp} onChange={(e) => setB({ ...b, brandWhatsapp: e.target.value })} placeholder="923001234567" />
          <Hint>With country code, no spaces. Leave empty to hide the button.</Hint>
        </div>
        {wl.can && (
          <div className="rounded-control border border-line p-4">
            <Label htmlFor="cd">Your own domain (white-label)</Label>
            <Input
              id="cd"
              value={b.customDomain}
              onChange={(e) => setB({ ...b, customDomain: e.target.value })}
              placeholder="leads.youragency.com"
              className="font-mono text-[13px]"
            />
            <Hint>
              Your team signs in at this address and sees your brand name and colour instead of ours. Sign-ups there are by invite only.
            </Hint>
            {wl.saved && (
              <div className="mt-3 text-[13px]">
                <p>
                  In your domain's DNS settings, add a <strong>CNAME</strong> record for <span className="font-mono">{wl.saved}</span> pointing to{" "}
                  <span className="font-mono text-pin">{wl.target ?? "this app's domain"}</span>.
                </p>
                <p className={wl.dnsOk ? "mt-1 text-ok" : "mt-1 text-muted"}>
                  {wl.dnsOk === null
                    ? "Save, then come back here to check the connection."
                    : wl.dnsOk
                      ? "Connected. The secure certificate is created on the first visit, which takes a few seconds."
                      : "Not pointing here yet. DNS changes can take up to a few hours."}
                </p>
              </div>
            )}
          </div>
        )}
        <Button type="submit" variant="secondary" loading={saving}>
          Save branding
        </Button>
      </form>
    </Panel>
  );
}

function AppearancePanel() {
  const router = useRouter();
  const [theme, setTheme] = useState<string>("dark");
  useEffect(() => setTheme(document.documentElement.dataset.theme ?? "dark"), []);
  return (
    <Panel className="flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <h2 className="text-[15px] font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted">You're using the {theme} theme. Ctrl+K also switches it.</p>
      </div>
      <Button
        variant="secondary"
        onClick={() => {
          setTheme(toggleTheme());
          router.refresh();
        }}
      >
        Switch to {theme === "light" ? "dark" : "light"}
      </Button>
    </Panel>
  );
}

function DataPanel() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Delete your account for good? This can't be undone.")) return;
    setDeleting(true);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const b = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't delete the account.");
    router.replace("/");
    router.refresh();
  }

  return (
    <Panel className="space-y-4 p-6">
      <div>
        <h2 className="text-[15px] font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-muted">Download a copy of everything stored for your account, or delete it.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href="/api/account/export"
          className="inline-flex h-10 items-center rounded-control border border-line bg-raised px-4 text-sm hover:border-muted/50"
        >
          Download my data
        </a>
        {!open && (
          <Button variant="danger" onClick={() => setOpen(true)}>
            Delete account
          </Button>
        )}
      </div>
      {open && (
        <form onSubmit={remove} className="space-y-3 rounded-control border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm">
            If you own the account, this deletes all leads, searches, templates and your team's access. Team members only remove
            their own sign-in.
          </p>
          <div>
            <Label htmlFor="delpw">Your password</Label>
            <Input id="delpw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="danger" loading={deleting}>
              Delete for good
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Panel>
  );
}

function SheetsPanel() {
  const [url, setUrl] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    fetch("/api/feed")
      .then((r) => r.json())
      .then((b) => {
        setUrl(b.url);
        setIsOwner(Boolean(b.isOwner));
      });
  }, []);
  async function make() {
    if (url && !confirm("Make a new link? The old one stops working, so update your sheet afterwards.")) return;
    const res = await fetch("/api/feed", { method: "POST" });
    const b = await res.json().catch(() => ({}));
    if (res.ok) setUrl(b.url);
    else toast.error(b.error ?? "Couldn't create the link.");
  }
  const formula = url ? `=IMPORTDATA("${url}")` : "";
  return (
    <Panel className="space-y-3 p-6">
      <div>
        <h2 className="text-[15px] font-semibold">Google Sheets</h2>
        <p className="mt-1 text-sm text-muted">
          Keep a Google Sheet in sync with your leads. Paste the formula into cell A1 of a new sheet. Google refreshes it about every hour. Works once the app is
          live on the internet.
        </p>
      </div>
      {url ? (
        <div className="flex gap-2">
          <Input value={formula} readOnly onFocus={(e) => e.target.select()} className="font-mono text-[12px]" />
          <Button variant="secondary" onClick={() => navigator.clipboard.writeText(formula).then(() => toast.success("Formula copied."))}>
            Copy
          </Button>
        </div>
      ) : null}
      {isOwner && (
        <Button variant="secondary" size="sm" onClick={make}>
          {url ? "Make a new link" : "Create the sheet link"}
        </Button>
      )}
      <p className="text-[12px] text-muted">Anyone with this link can read your leads. Don't share it.</p>
    </Panel>
  );
}

function InstagramPanel() {
  const [st, setSt] = useState<{ connected: boolean; igUserId: string | null; isOwner: boolean } | null>(null);
  const [f, setF] = useState({ igUserId: "", token: "" });
  const [busy, setBusy] = useState(false);
  const load = () =>
    fetch("/api/integrations/instagram")
      .then((r) => r.json())
      .then(setSt);
  useEffect(() => {
    load();
  }, []);
  if (!st?.isOwner) return null;
  return (
    <Panel className="space-y-3 p-6">
      <div>
        <h2 className="text-[15px] font-semibold">Instagram (official)</h2>
        <p className="mt-1 text-sm text-muted">
          Shows followers and posts for leads whose Instagram was found on their website, using Instagram's Business Discovery API. Needs your own Instagram
          Business account linked to a Facebook page, and an access token from a Meta app.
        </p>
      </div>
      {st.connected ? (
        <div className="flex items-center gap-3 text-sm">
          <Badge tone="ok">Connected</Badge> account {st.igUserId}
          <button
            onClick={async () => {
              await fetch("/api/integrations/instagram", { method: "DELETE" });
              load();
            }}
            className="text-[13px] text-danger hover:underline"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const res = await fetch("/api/integrations/instagram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
            const b = await res.json().catch(() => ({}));
            setBusy(false);
            if (!res.ok) return toast.error(b.error ?? "Couldn't connect.");
            toast.success("Instagram connected.");
            load();
          }}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <Input value={f.igUserId} onChange={(e) => setF({ ...f, igUserId: e.target.value })} placeholder="Instagram Business account ID" />
          <Input type="password" value={f.token} onChange={(e) => setF({ ...f, token: e.target.value })} placeholder="Access token" autoComplete="off" />
          <Button type="submit" variant="secondary" loading={busy}>
            Connect
          </Button>
        </form>
      )}
    </Panel>
  );
}

function SmsPanel() {
  const [s, setS] = useState<{ smsUrl: string; smsMethod: string; smsBody: string; isOwner: boolean } | null>(null);
  const [testTo, setTestTo] = useState("");
  useEffect(() => {
    fetch("/api/integrations/sms")
      .then((r) => r.json())
      .then((b) => setS({ smsUrl: b.smsUrl ?? "", smsMethod: b.smsMethod ?? "GET", smsBody: b.smsBody ?? "", isOwner: Boolean(b.isOwner) }));
  }, []);
  if (!s?.isOwner) return null;
  return (
    <Panel className="space-y-3 p-6">
      <div>
        <h2 className="text-[15px] font-semibold">SMS provider</h2>
        <p className="mt-1 text-sm text-muted">
          Connect a PTA-registered SMS company, or an Android SMS gateway app, through its web address. Used only for leads who agreed to receive messages.
          Put {"{to}"} where the number goes and {"{message}"} where the text goes.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
        <Select value={s.smsMethod} onChange={(e) => setS({ ...s, smsMethod: e.target.value })} aria-label="Method">
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </Select>
        <Input
          value={s.smsUrl}
          onChange={(e) => setS({ ...s, smsUrl: e.target.value })}
          placeholder="https://provider.pk/api/send?key=YOURKEY&to={to}&text={message}"
          className="font-mono text-[12px]"
        />
      </div>
      {s.smsMethod === "POST" && (
        <Textarea
          rows={3}
          value={s.smsBody}
          onChange={(e) => setS({ ...s, smsBody: e.target.value })}
          placeholder={'{"to": "{to}", "message": "{message}"}'}
          className="font-mono text-[12px]"
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            const res = await fetch("/api/integrations/sms", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
            const b = await res.json().catch(() => ({}));
            if (res.ok) toast.success("SMS provider saved.");
            else toast.error(b.error ?? "Couldn't save.");
          }}
        >
          Save
        </Button>
        <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Your number for a test" className="w-48" />
        <Button
          variant="ghost"
          onClick={async () => {
            const res = await fetch("/api/integrations/sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: testTo }) });
            const b = await res.json().catch(() => ({}));
            if (res.ok) toast.success("Test sent. Check your phone.");
            else toast.error(b.error ?? "Test failed.");
          }}
        >
          Send test
        </Button>
      </div>
    </Panel>
  );
}

function HubspotPanel() {
  const [st, setSt] = useState<{ connected: boolean; isOwner: boolean } | null>(null);
  const [token, setToken] = useState("");
  const load = () =>
    fetch("/api/integrations/hubspot")
      .then((r) => r.json())
      .then(setSt);
  useEffect(() => {
    load();
  }, []);
  if (!st?.isOwner) return null;
  return (
    <Panel className="space-y-3 p-6">
      <div>
        <h2 className="text-[15px] font-semibold">HubSpot CRM</h2>
        <p className="mt-1 text-sm text-muted">
          Send leads to HubSpot as companies and contacts (select leads, then “To HubSpot”). In HubSpot: Settings, Integrations, Private apps, create one with
          companies and contacts read/write, and paste its token here. For Zoho, Pipedrive and others, use webhooks with Zapier or Make (API and extension page).
        </p>
      </div>
      {st.connected ? (
        <div className="flex items-center gap-3 text-sm">
          <Badge tone="ok">Connected</Badge>
          <button
            onClick={async () => {
              await fetch("/api/integrations/hubspot", { method: "DELETE" });
              load();
            }}
            className="text-[13px] text-danger hover:underline"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="pat-na1-…" autoComplete="off" />
          <Button
            variant="secondary"
            onClick={async () => {
              const res = await fetch("/api/integrations/hubspot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
              const b = await res.json().catch(() => ({}));
              if (!res.ok) return toast.error(b.error ?? "Couldn't connect.");
              toast.success("HubSpot connected.");
              setToken("");
              load();
            }}
          >
            Connect
          </Button>
        </div>
      )}
    </Panel>
  );
}

function SecurityPanel() {
  const [s, setS] = useState<{ ipAllow: string; isOwner: boolean } | null>(null);
  useEffect(() => {
    fetch("/api/account/security")
      .then((r) => r.json())
      .then(setS);
  }, []);
  return (
    <>
      <TwoFactorPanel />
      {s?.isOwner && (
        <Panel className="space-y-3 p-6">
          <div>
            <h2 className="text-[15px] font-semibold">Allowed networks (optional)</h2>
            <p className="mt-1 text-sm text-muted">
              Restrict sign-in to certain IP addresses, like your office or VPN. One per line. A prefix like <span className="font-mono">203.0.113.</span> allows a whole
              range. Leave empty to allow everywhere. Be careful: a wrong value can lock you out.
            </p>
          </div>
          <Textarea rows={3} value={s.ipAllow} onChange={(e) => setS({ ...s, ipAllow: e.target.value })} placeholder={"203.0.113.45\n41.90."} className="font-mono text-[13px]" />
          <Button
            variant="secondary"
            onClick={async () => {
              const res = await fetch("/api/account/security", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ipAllow: s.ipAllow }) });
              const b = await res.json().catch(() => ({}));
              if (res.ok) toast.success("Saved.");
              else toast.error(b.error ?? "Couldn't save.");
            }}
          >
            Save networks
          </Button>
        </Panel>
      )}
    </>
  );
}

function LanguagePanel() {
  const { lang, t } = useT();
  return (
    <Panel className="space-y-3 p-6">
      <div>
        <h2 className="text-[15px] font-semibold">{t("set.language", "Language")}</h2>
        <p className="mt-1 text-sm text-muted">{t("set.languageHint", "Choose the language for the app.")}</p>
      </div>
      <div className="flex gap-2">
        {(["en", "ur"] as const).map((l) => (
          <button
            key={l}
            onClick={() => lang !== l && setLanguage(l)}
            className={`rounded-control border px-4 py-2 text-sm ${lang === l ? "border-pin bg-pin/10 font-medium" : "border-line hover:border-muted/50"}`}
          >
            {l === "en" ? t("set.english", "English") : t("set.urdu", "اردو")}
          </button>
        ))}
      </div>
    </Panel>
  );
}
