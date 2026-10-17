"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Badge, Panel } from "@/components/ui/panel";

export function TwoFactorPanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [qr, setQr] = useState("");

  const load = () =>
    fetch("/api/account/2fa")
      .then((r) => r.json())
      .then((b) => setEnabled(Boolean(b.enabled)));
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (setup) setQr(`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setup.otpauth)}`);
  }, [setup]);

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/account/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(b.error ?? "Something went wrong.");
      return null;
    }
    return b;
  }

  return (
    <Panel className="space-y-3 p-6">
      <div>
        <h2 className="text-[15px] font-semibold">
          Two-factor sign-in {enabled && <Badge tone="ok">On</Badge>}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Ask for a 6-digit code from an authenticator app (Google Authenticator, Authy, Microsoft Authenticator) every time you sign in. Even if someone learns
          your password, they can't get in without your phone.
        </p>
      </div>

      {enabled ? (
        <div className="flex flex-wrap items-end gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Current code" className="w-40 font-mono" inputMode="numeric" />
          <Button
            variant="ghost"
            onClick={async () => {
              if (await post({ action: "disable", code })) {
                toast.success("Two-factor turned off.");
                setCode("");
                load();
              }
            }}
          >
            Turn off
          </Button>
        </div>
      ) : setup ? (
        <div className="space-y-3">
          <p className="text-sm">1. Scan this with your authenticator app:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="2FA QR code" className="rounded border border-line bg-white p-2" width={180} height={180} />
          <p className="text-[13px] text-muted">
            Or type the key: <span className="font-mono">{setup.secret}</span>
          </p>
          <p className="text-sm">2. Enter the 6-digit code it shows:</p>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className="w-40 font-mono" inputMode="numeric" />
            <Button
              onClick={async () => {
                const b = await post({ action: "enable", secret: setup.secret, code });
                if (b) {
                  setCodes(b.backupCodes);
                  setSetup(null);
                  setCode("");
                  load();
                }
              }}
            >
              Turn on
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          onClick={async () => {
            const b = await post({ action: "setup" });
            if (b) setSetup(b);
          }}
        >
          Set up two-factor
        </Button>
      )}

      {codes && (
        <div className="rounded-control border border-pin/40 bg-pin/5 p-4">
          <p className="text-sm font-medium">Save these backup codes somewhere safe.</p>
          <p className="text-[13px] text-muted">Each one works once, for when you don't have your phone.</p>
          <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-[13px] sm:grid-cols-4">
            {codes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => navigator.clipboard.writeText(codes.join("\n")).then(() => toast.success("Copied."))}>
            Copy codes
          </Button>
        </div>
      )}
    </Panel>
  );
}
