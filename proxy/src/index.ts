// Buckets proxy — a Cloudflare Worker that sits between the app and Gemini.
//
// Why it exists: an API key shipped inside an app can be extracted by anyone.
// Here the key lives only in Cloudflare (as the GEMINI_API_KEY secret).
//
// Abuse protection:
// - The system prompt is built HERE from our own curriculum, so callers can't
//   repurpose the proxy as a general-purpose chatbot.
// - Requests must name a real lesson, and messages are capped in count/length.
// - Per-IP rate limiting via Cloudflare's rate limit binding.
import curriculum from "../../app/src/lib/hooptree/curriculum.json";
import { buildSystemPrompt } from "../../app/src/lib/buckets-prompt";
import type { SkillNode } from "../../app/src/lib/hooptree/skillTree";

interface Env {
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  ALLOWED_ORIGINS: string; // comma-separated, or "*"
  LIMITER: RateLimit;
}

type Msg = { role: "user" | "buckets"; text: string };

const MAX_MESSAGES = 10;
const MAX_CHARS = 1000;
const PER_MODEL_TIMEOUT_MS = 12_000;
// Tried in order. Override with the GEMINI_MODEL var (comma-separated).
const DEFAULT_MODELS = "gemini-flash-lite-latest,gemini-3.8-flash,gemini-flash-latest";
const skills = new Map(
  (curriculum.nodes as SkillNode[]).map((n) => [n.id, n]),
);

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(req, env);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const { pathname } = new URL(req.url);
    if (pathname === "/health") return json({ ok: true });
    if (pathname !== "/chat" || req.method !== "POST")
      return json({ error: "not_found" }, 404);

    const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
    const { success } = await env.LIMITER.limit({ key: ip });
    if (!success) return json({ error: "rate_limited" }, 429);

    const body = await req.json().catch(() => null);
    const parsed = parseBody(body);
    if (!parsed) return json({ error: "bad_request" }, 400);
    const skill = skills.get(parsed.skillId);
    if (!skill) return json({ error: "unknown_skill" }, 400);

    const contents = parsed.messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));
    // Gemini requires the conversation to start with a user turn.
    while (contents.length && contents[0].role !== "user") contents.shift();

    const payload = JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt(skill) }] },
      contents,
      generationConfig: {
        temperature: 0.8,
        // Short coaching replies don't need long "thinking" — keeps it fast.
        thinkingConfig: { thinkingLevel: "low" },
      },
    });

    // Free-tier requests get dropped first when a model is busy (503) or out
    // of quota (429), so fall through a list of models until one answers.
    const models = (env.GEMINI_MODEL || DEFAULT_MODELS)
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    let upstream: Response | null = null;
    let lastStatus = 0;
    for (const model of models) {
      const started = Date.now();
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          signal: AbortSignal.timeout(PER_MODEL_TIMEOUT_MS),
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY,
          },
          body: payload,
        },
      ).catch((e: Error) => {
        console.error("Gemini fetch failed", model, e.name, e.message);
        return null;
      });
      console.log("Gemini", model, res?.status ?? "no response", `${Date.now() - started}ms`);
      if (res?.ok) {
        upstream = res;
        break;
      }
      lastStatus = res?.status ?? 504;
      // Log details for `wrangler tail`, but never echo Google's error to clients.
      if (res) console.error("Gemini error", model, res.status, (await res.text()).slice(0, 500));
      // Only retry on "busy/limited/timeout/not found"; a bad key won't fix itself.
      if (res && ![404, 429, 500, 503].includes(res.status)) break;
    }

    if (!upstream)
      return lastStatus === 429
        ? json({ error: "rate_limited" }, 429)
        : json({ error: "upstream_error" }, 502);

    const data = (await upstream.json()) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
    };
    const reply = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => (p.thought ? "" : (p.text ?? "")))
      .join("")
      .trim();
    if (!reply) return json({ error: "empty_reply" }, 502);
    return json({ reply });
  },
};

function parseBody(body: unknown): { skillId: string; messages: Msg[] } | null {
  if (!body || typeof body !== "object") return null;
  const { skillId, messages } = body as Record<string, unknown>;
  if (typeof skillId !== "string" || !Array.isArray(messages)) return null;
  if (messages.length === 0 || messages.length > MAX_MESSAGES) return null;
  for (const m of messages) {
    if (!m || typeof m !== "object") return null;
    const { role, text } = m as Record<string, unknown>;
    if (role !== "user" && role !== "buckets") return null;
    if (typeof text !== "string" || !text.trim() || text.length > MAX_CHARS)
      return null;
  }
  const msgs = messages as Msg[];
  if (msgs[msgs.length - 1].role !== "user") return null;
  return { skillId, messages: msgs.map(({ role, text }) => ({ role, text })) };
}

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = (env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim());
  const allow = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : "";
  return {
    ...(allow ? { "Access-Control-Allow-Origin": allow } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
