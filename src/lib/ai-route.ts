import "server-only";
import { AI_ENABLED, AiError } from "./ai";
import type { CurrentUser } from "./auth";
import { fail } from "./http";

/** Returns an error response when AI can't be used by this person, otherwise null. */
export function aiBlocked(user: CurrentUser) {
  if (!AI_ENABLED) return fail("AI features need ANTHROPIC_API_KEY in the server's .env file.", 503);
  if (!user.canUseAI) return fail("AI features are part of the Pro and Agency plans. Upgrade on the Billing page.", 402);
  return null;
}

export function aiFail(err: unknown) {
  if (err instanceof AiError) return fail(err.message, err.status);
  return fail("The AI request failed. Try again.", 502);
}
