"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const b = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(b.error ?? "Something went wrong.");
    setSent(true);
  }

  if (sent) {
    return (
      <p className="mt-6 rounded-control border border-ok/30 bg-ok/10 px-3 py-3 text-sm text-ok">
        If that email has an account, a reset link is on its way. Check your inbox and spam folder. The link works for 1 hour.
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        Send reset link
      </Button>
    </form>
  );
}
