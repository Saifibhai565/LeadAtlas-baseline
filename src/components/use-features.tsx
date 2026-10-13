"use client";

import { useEffect, useState } from "react";

let cached: Promise<string[]> | null = null;

/** Feature keys the Super Admin allows for this person (cached per page load). */
export function useFeatures() {
  const [list, setList] = useState<string[] | null>(null);
  useEffect(() => {
    if (!cached) {
      cached = fetch("/api/me/features")
        .then((r) => r.json())
        .then((b) => (b.features ?? []) as string[])
        .catch(() => []);
    }
    cached.then(setList);
  }, []);
  return { has: (k: string) => list === null || list.includes(k), ready: list !== null };
}
