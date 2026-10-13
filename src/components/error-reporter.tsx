"use client";

import { useEffect } from "react";

const sent = new Set<string>();

export function reportError(message: string, stack?: string) {
  const key = message.slice(0, 120);
  if (sent.has(key) || sent.size > 20) return;
  sent.add(key);
  fetch("/api/client-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, stack, path: window.location.pathname }),
    keepalive: true,
  }).catch(() => undefined);
}

/** Sends browser crashes to the server so the Super Admin can see them. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (!e.message || /ResizeObserver|Script error/i.test(e.message)) return;
      reportError(e.message, e.error?.stack);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string; stack?: string } | undefined;
      if (r?.message && !/abort|Failed to fetch|NetworkError/i.test(r.message)) reportError(r.message, r.stack);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
