import "server-only";

/**
 * Client for the Go scraping engine (gosom/google-maps-scraper web mode).
 * Start it with:  go run main.go   (it listens on :8080)
 */
const ENGINE_URL = (process.env.ENGINE_URL ?? "http://localhost:8080").replace(/\/$/, "");

export const ENGINE_OFFLINE_MESSAGE =
  "The scraping engine isn't running. Start it with `go run main.go` in the scraper folder, then try again.";

export class EngineError extends Error {}

export type EngineStatus = "pending" | "working" | "ok" | "failed";

export type EngineJobInput = {
  name: string;
  keywords: string[];
  lang: string;
  depth: number;
  zoom: number;
  email: boolean;
  maxTimeMinutes: number;
  extraReviews?: boolean;
  lat?: number;
  lon?: number;
};

async function call(path: string, init?: RequestInit & { timeoutMs?: number }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init?.timeoutMs ?? 15000);
  try {
    return await fetch(`${ENGINE_URL}${path}`, { ...init, signal: controller.signal, cache: "no-store" });
  } catch {
    throw new EngineError(ENGINE_OFFLINE_MESSAGE);
  } finally {
    clearTimeout(timer);
  }
}

async function errorText(res: Response) {
  try {
    const body = await res.json();
    return String(body?.message ?? body?.error ?? res.statusText);
  } catch {
    return res.statusText;
  }
}

export async function enginePing(): Promise<boolean> {
  try {
    const res = await call("/api/v1/jobs", { timeoutMs: 2500 });
    return res.ok;
  } catch {
    return false;
  }
}

export async function engineCreateJob(input: EngineJobInput): Promise<string> {
  const res = await call("/api/v1/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      keywords: input.keywords,
      lang: input.lang,
      zoom: input.zoom,
      lat: input.lat != null ? String(input.lat) : "",
      lon: input.lon != null ? String(input.lon) : "",
      fast_mode: false,
      radius: 10000,
      depth: input.depth,
      email: input.email,
      extra_reviews: Boolean(input.extraReviews),
      max_time: Math.max(3, input.maxTimeMinutes) * 60, // engine expects seconds
      // Optional: ENGINE_PROXIES="http://user:pass@host:port,socks5://host:port" (helps when Google blocks a server's IP)
      proxies: (process.env.ENGINE_PROXIES ?? "").split(",").map((p) => p.trim()).filter(Boolean),
    }),
  });
  if (!res.ok) throw new EngineError(`The engine rejected this search: ${await errorText(res)}`);
  const body = (await res.json()) as { id?: string };
  if (!body.id) throw new EngineError("The engine didn't return a job id.");
  return body.id;
}

export async function engineJobStatus(engineJobId: string): Promise<EngineStatus | "missing"> {
  const res = await call(`/api/v1/jobs/${encodeURIComponent(engineJobId)}`);
  if (res.status === 404) return "missing";
  if (!res.ok) throw new EngineError(await errorText(res));
  const job = (await res.json()) as { Status?: string; status?: string };
  return String(job.Status ?? job.status ?? "pending").toLowerCase() as EngineStatus;
}

export async function engineDownloadCsv(engineJobId: string): Promise<string> {
  const res = await call(`/api/v1/jobs/${encodeURIComponent(engineJobId)}/download`, { timeoutMs: 60000 });
  if (!res.ok) throw new EngineError(`Couldn't download results: ${await errorText(res)}`);
  return res.text();
}
