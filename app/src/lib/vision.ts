/**
 * Client for the Buckets vision server (vision/main.py).
 *
 * Set EXPO_PUBLIC_VISION_URL in app/.env, e.g. http://192.168.1.20:8000
 * (your laptop's LAN IP, not localhost: the phone has to reach it).
 * Nothing here fakes a result: if the server can't be reached, callers get a
 * VisionError (or an "unavailable" result from serverVisionService).
 */
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { visionService, type VisionService } from "./vision-service";

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

/** The server's grade for one upload (POST /analyze). */
export type VisionReport = {
  graded: boolean;
  passed: boolean;
  score: number;
  spec: string | null;
  skill_id: string;
  attempt_id: string;
  analyzed_at: string;
  metrics: VisionMetric[];
  feedback: string[];
  /** Server path of the annotated replay ("/replays/<id>.mp4"), null if it couldn't be rendered. */
  replay_url: string | null;
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
  | "cancelled"
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

/** Full URL of a report's annotated replay, or null. */
export const replayUri = (report: VisionReport) =>
  report.replay_url && BASE ? `${BASE}${report.replay_url}` : null;

async function request(
  path: string,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
) {
  if (!BASE)
    throw new VisionError(
      "not_configured",
      "The vision server address isn't set (EXPO_PUBLIC_VISION_URL).",
    );
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forward = () => controller.abort();
  signal?.addEventListener("abort", forward);
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, signal: controller.signal });
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
    console.log(`[vision] ${init.method ?? "GET"} ${BASE}${path} failed:`, e);
    if (timedOut)
      throw new VisionError("timeout", "The vision server took too long to answer.");
    if (signal?.aborted) throw new VisionError("cancelled", "Analysis was cancelled.");
    throw new VisionError(
      "offline",
      "Can't reach the vision server. Check that it's running and on the same Wi-Fi.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forward);
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

export type AnalyzeOptions = {
  /** e.g. "video/mp4"; defaults to video/quicktime (iPhone .mov). */
  mimeType?: string | null;
  fileName?: string | null;
  /** Web only: the File to upload instead of reading the uri. */
  file?: File;
  /** Shooting hand. "auto" picks the arm facing the camera. */
  hand?: "auto" | "left" | "right";
  /** Abort the upload / analysis. */
  signal?: AbortSignal;
};

/**
 * Upload a clip for one skill and get the graded result.
 * skillId is the app's skill id (e.g. "sh-beef"); uri is a local video file uri
 * (expo-camera, expo-image-picker) or, on web, a blob: URL.
 */
export async function analyzeSkill(
  skillId: string,
  uri: string,
  options: AnalyzeOptions = {},
): Promise<VisionReport> {
  const { mimeType, fileName, file, hand = "auto", signal } = options;
  if (!BASE)
    throw new VisionError(
      "not_configured",
      "The vision server address isn't set (EXPO_PUBLIC_VISION_URL).",
    );
  const type = mimeType ?? "video/quicktime";
  const name =
    fileName ??
    uri.split(/[/?#]/).filter(Boolean).pop()?.match(/^[\w.-]+\.\w+$/)?.[0] ??
    (type.includes("mp4") ? "clip.mp4" : type.includes("webm") ? "clip.webm" : "clip.mov");
  const url = `${BASE}/analyze`;
  console.log(
    `[vision] POST ${url} skill=${skillId} uri=${uri.slice(0, 120)} type=${type} name=${name}`,
  );
  const form = new FormData();
  if (Platform.OS === "web") {
    form.append("video", file ?? (await (await fetch(uri)).blob()), name);
  } else {
    // React Native's FormData file part: XHR streams the file from disk.
    form.append("video", { uri, name, type } as unknown as Blob);
  }
  form.append("skill_id", skillId);
  form.append("hand", hand);
  return (await upload(url, form, ANALYZE_TIMEOUT_MS, signal)) as VisionReport;
}

/**
 * POST multipart form data with XMLHttpRequest.
 *
 * Not fetch: Expo SDK 58 replaces global fetch with expo/fetch, which builds the
 * multipart body itself and throws "Unsupported FormDataPart implementation"
 * for React Native { uri, name, type } file parts, so nothing is ever sent.
 * React Native's XHR uploads those parts natively.
 */
function upload(url: string, form: FormData, timeoutMs: number, signal?: AbortSignal) {
  return new Promise<unknown>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const started = Date.now();
    const fail = (kind: VisionErrorKind, message: string, cause?: unknown) => {
      console.log(
        `[vision] upload failed after ${((Date.now() - started) / 1000).toFixed(1)}s: ${kind} (status ${xhr.status})`,
        cause ?? "",
      );
      reject(new VisionError(kind, message));
    };
    const onAbort = () => xhr.abort();
    signal?.addEventListener("abort", onAbort);
    const done = () => signal?.removeEventListener("abort", onAbort);
    xhr.open("POST", url);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onload = () => {
      done();
      let body: { detail?: unknown } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch (e) {
        if (xhr.status >= 200 && xhr.status < 300)
          return fail("server", "The vision server sent an unreadable answer.", e);
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log(`[vision] analyzed in ${((Date.now() - started) / 1000).toFixed(1)}s`);
        return resolve(body);
      }
      const detail = typeof body?.detail === "string" ? body.detail : "";
      fail(
        xhr.status === 400 ? "bad_video" : "server",
        detail || `The vision server returned an error (${xhr.status}).`,
        xhr.responseText.slice(0, 300),
      );
    };
    xhr.onerror = () => {
      done();
      fail(
        "offline",
        "Can't reach the vision server. Check that it's running and on the same Wi-Fi.",
        "network error",
      );
    };
    xhr.ontimeout = () => {
      done();
      fail("timeout", "The vision server took too long to answer.");
    };
    xhr.onabort = () => {
      done();
      fail("cancelled", "Analysis was cancelled.");
    };
    if (signal?.aborted) {
      done();
      return fail("cancelled", "Analysis was cancelled.");
    }
    try {
      xhr.send(form);
    } catch (e) {
      done();
      fail("offline", `The video could not be sent: ${String(e)}`, e);
    }
  });
}

/**
 * VisionService (lib/vision-service.ts) backed by this server. Skills without a
 * camera check, or no server configured, get the same "unavailable" result as
 * the default adapter. Graded results carry the full report.
 */
export const serverVisionService: VisionService = {
  async assess(request, signal) {
    if (!visionConfigured()) return visionService.assess(request, signal);
    const gradable = await getGradableSkills();
    if (!gradable[request.skillId])
      return {
        status: "unavailable",
        message:
          "Your video is recorded. This skill doesn't have a camera check yet; no skill has been marked complete.",
      };
    const report = await analyzeSkill(request.skillId, request.recording.uri, {
      mimeType: request.recording.mimeType,
      signal,
    });
    if (!report.graded)
      return { status: "unavailable", message: report.feedback.join("\n") };
    return {
      status: "assessed",
      passed: report.passed,
      feedback: report.feedback,
      assessmentId: report.attempt_id,
      report,
    };
  },
};

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

/** Human-readable target range, e.g. "90–140°", "at least 0.30 s", "yes". */
export function formatTarget(m: VisionMetric) {
  const [lo, hi] = m.target;
  if (m.unit === "bool") return hi >= 1 && lo >= 1 ? "yes" : "no";
  const unit = m.unit === "s" ? " s" : "°";
  const fmt = (v: number) => (m.unit === "s" ? v.toFixed(2) : String(Math.round(v)));
  if (m.unit === "s" && hi >= 60) return `at least ${fmt(lo)}${unit}`;
  if (lo <= 0) return `at most ${fmt(hi)}${unit}`;
  return `${fmt(lo)}–${fmt(hi)}${unit}`;
}
