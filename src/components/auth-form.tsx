"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { BrandMark, useBrand } from "./brand";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";
  const brand = useBrand();
  const [need2fa, setNeed2fa] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.need2fa) {
        setNeed2fa(true);
        return;
      }
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Try again.");
        return;
      }
      const next = params.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch {
      setError("Can't reach the server. Check that the app is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8 lg:hidden">
        <BrandMark />
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.01em]">
        {isLogin ? "Sign in" : "Create your account"}
      </h2>
      <p className="mt-1.5 text-muted">
        {isLogin ? "Welcome back. Pick up where you left off." : "Start finding leads in a couple of minutes."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {!isLogin && (
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" autoComplete="name" required />
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="password" className="mb-0">
              Password
            </Label>
            {isLogin && (
              <Link href="/forgot" className="text-[13px] text-muted hover:text-ink">
                Forgot it?
              </Link>
            )}
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            minLength={isLogin ? undefined : 8}
            required
          />
        </div>

        {!isLogin && (
          <label className="flex items-start gap-2 text-[13px] text-muted">
            <input type="checkbox" name="agree" required className="mt-1 accent-[rgb(var(--pin))]" />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="text-pin hover:underline">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="text-pin hover:underline">
                privacy policy
              </Link>
              .
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        )}

        {isLogin && need2fa && (
        <div>
          <Label htmlFor="code">Authenticator code</Label>
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" autoFocus className="font-mono" />
          <p className="mt-1 text-[12px] text-muted">Enter the 6-digit code from your authenticator app, or a backup code.</p>
        </div>
      )}
      <Button type="submit" loading={loading} className="w-full">
          {isLogin ? "Sign in" : "Create account"}
        </Button>
      </form>

      {!(isLogin && brand.custom) && (
      <p className="mt-6 text-center text-[13px] text-muted">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link href={isLogin ? "/register" : "/login"} className="font-medium text-pin hover:underline">
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
      )}
      {isLogin && brand.custom && (
        <p className="mt-6 text-center text-[13px] text-muted">New here? Ask the account owner to send you an invite link.</p>
      )}
    </div>
  );
}
