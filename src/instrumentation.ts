/**
 * Next.js calls onRequestError for every unhandled server error (pages and API routes).
 * We save them so the Super Admin can see them under Super Admin > Errors.
 * The import sits inside the nodejs check so it never ends up in the edge (middleware) build.
 */
export async function onRequestError(err: unknown, request: { path: string; method: string }) {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { recordError } = await import("./lib/errors");
    const e = err as { message?: string; stack?: string };
    await recordError({ source: "SERVER", message: e?.message ?? String(err), stack: e?.stack ?? null, path: `${request.method} ${request.path}` });
  }
}
