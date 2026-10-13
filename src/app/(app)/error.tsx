"use client";

import { useEffect } from "react";
import { reportError } from "@/components/error-reporter";

/** Friendly screen instead of a blank page when something breaks inside the app. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error.message || "Page crashed", error.stack);
  }, [error]);
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <h1 className="text-xl font-semibold">Something went wrong on this page</h1>
      <p className="mt-2 text-muted">It's been reported automatically. Try again, or go back to the dashboard.</p>
      {error.digest && <p className="mt-2 font-mono text-[12px] text-muted">Reference: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="inline-flex h-10 items-center rounded-control bg-pin px-4 text-sm font-semibold text-pin-ink">
          Try again
        </button>
        <a href="/dashboard" className="inline-flex h-10 items-center rounded-control border border-line px-4 text-sm">
          Dashboard
        </a>
      </div>
    </div>
  );
}
