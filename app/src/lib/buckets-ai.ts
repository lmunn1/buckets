// Buckets — the in-lesson AI coach.
//
// The app never talks to Gemini directly and never holds the API key. It sends
// the lesson id + chat history to our proxy (proxy/ in the repo root), which
// builds the system prompt, adds the secret key, and calls Gemini.
import type { SkillNode } from "@/lib/hooptree/skillTree";

export type ChatMessage = { role: "user" | "buckets"; text: string };

const API_URL = (process.env.EXPO_PUBLIC_BUCKETS_API_URL ?? "").replace(/\/+$/, "");
const HISTORY_LIMIT = 10;

export const isBucketsConfigured = API_URL.length > 0;

export class BucketsError extends Error {}

export async function askBuckets(
  skill: SkillNode,
  history: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  if (!isBucketsConfigured)
    throw new BucketsError(
      "Coach is offline — set EXPO_PUBLIC_BUCKETS_API_URL in app/.env.local.",
    );

  let res: Response;
  try {
    res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skillId: skill.id,
        messages: history.slice(-HISTORY_LIMIT),
      }),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new BucketsError("Couldn't reach the gym — check your connection.");
  }

  if (res.status === 429)
    throw new BucketsError("I'm out of breath 😮‍💨 Give me a minute and ask again.");
  if (!res.ok)
    throw new BucketsError(`Something went wrong on my end (${res.status}).`);

  const data = (await res.json().catch(() => null)) as { reply?: string } | null;
  const reply = data?.reply?.trim();
  if (!reply)
    throw new BucketsError("I blanked on that one — try asking another way.");
  return reply;
}
