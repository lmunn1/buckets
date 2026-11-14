/**
 * Client for the Buckets vision server (vision/main.py).
 *
 * Set EXPO_PUBLIC_VISION_URL in app/.env, e.g. http://192.168.1.20:8000
 * (your laptop's LAN IP, not localhost: the phone has to reach it).
 * Nothing here fakes a result: if the server can't be reached, callers get a
 * VisionError and decide what to show.
 */
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const BASE = (process.env.EXPO_PUBLIC_VISION_URL ?? "").trim().replace(/\/+$/, "");
const LIST_TIMEOUT_MS = 5_000;
const ANALYZE_TIMEOUT_MS = 120_000;

export type VisionMetric = {
  name: string;
  label: string;
  value: number | null;
  unit: "deg" | "s" | "bool";
  target: [number, number];
  ok: boolean;
};

export type VisionResult = {
  graded: boolean;
  passed: boolean;
  score: number;
  spec: string | null;
  skill_id: string;
  attempt_id: string;
  analyzed_at: string;
  metrics: VisionMetric[];
  feedback: string[];
};

export type GradableSkill = {
  spec: string;
  name: string | null;
  setup: { stand?: string; camera?: string; camera_tip?: string } | null;
  criteria: string | null;
  mistakes: string[];
};

export type VisionErrorKind =
  | "not_configured"
  | "offline"
  | "timeout"
  | "bad_video"
  | "server";

export class VisionError extends Error {
  constructor(
    public kind: VisionErrorKind,
    message: string,
  ) {
    super(message);
  }
}

export const visionConfigured = () => BASE.length > 0;

async function request(path: string, init: RequestInit, timeoutMs: number) {
  if (!BASE)
    throw new VisionError(
      "not_configured",
      "The vision server address isn't set (EXPO_PUBLIC_VISION_URL).",
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const detail = typeof body?.detail === "string" ? body.detail : "";
      throw new VisionError(
        res.status === 400 ? "bad_video" : "server",
        detail || `The vision server returned an error (${res.status}).`,
      );
    }
    return await res.json();
  } catch (e) {
    if (e instanceof VisionError) throw e;
    if (controller.signal.aborted)
      throw new VisionError("timeout", "The vision server took too long to answer.");
    throw new VisionError("offline", "Can't reach the vision server.");
  } finally {
    clearTimeout(timer);
  }
}

let gradableCache: Record<string, GradableSkill> | null = null;

/** Skills the server can grade right now, keyed by app skill id. Cached after the first success. */
export async function getGradableSkills(): Promise<Record<string, GradableSkill>> {
  if (gradableCache) return gradableCache;
  gradableCache = (await request("/skills", {}, LIST_TIMEOUT_MS)) as Record<
    string,
    GradableSkill
  >;
  return gradableCache;
}

export type VideoFile = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  file?: File; // web only
};

/** Upload a clip for one skill and get the graded result. */
export async function analyzeSkill(
  skillId: string,
  video: VideoFile,
  hand: "auto" | "left" | "right" = "auto",
): Promise<VisionResult> {
  const form = new FormData();
  if (Platform.OS === "web" && video.file) {
    form.append("video", video.file);
  } else {
    const type = video.mimeType ?? "video/quicktime";
    const name = video.fileName ?? (type.includes("mp4") ? "clip.mp4" : "clip.mov");
    // React Native's FormData takes a { uri, name, type } object for files.
    form.append("video", { uri: video.uri, name, type } as unknown as Blob);
  }
  form.append("skill_id", skillId);
  form.append("hand", hand);
  return (await request(
    "/analyze",
    { method: "POST", body: form },
    ANALYZE_TIMEOUT_MS,
  )) as VisionResult;
}

export type GradableState =
  | { status: "loading" }
  | { status: "gradable"; skill: GradableSkill }
  | { status: "not_gradable" }
  | { status: "unavailable"; error: VisionError };

/** Whether a skill has a camera check, asking the server once per app session. */
export function useGradableSkill(skillId: string, attempt = 0): GradableState {
  // Each answer is stored with the request it belongs to; anything else is still loading.
  const key = `${skillId}#${attempt}`;
  const [answer, setAnswer] = useState<{ key: string; state: GradableState } | null>(null);
  useEffect(() => {
    let active = true;
    getGradableSkills()
      .then((all) => {
        if (!active) return;
        const skill = all[skillId];
        setAnswer({
          key,
          state: skill ? { status: "gradable", skill } : { status: "not_gradable" },
        });
      })
      .catch((e: unknown) => {
        if (!active) return;
        setAnswer({
          key,
          state: {
            status: "unavailable",
            error: e instanceof VisionError ? e : new VisionError("offline", String(e)),
          },
        });
      });
    return () => {
      active = false;
    };
  }, [key, skillId]);
  return answer?.key === key ? answer.state : { status: "loading" };
}

export function formatMetric(m: VisionMetric) {
  if (m.value === null) return "not measured";
  if (m.unit === "s") return `${m.value.toFixed(2)} s`;
  if (m.unit === "bool") return m.value ? "yes" : "no";
  return `${Math.round(m.value)}°`;
}
