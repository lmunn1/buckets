/** Local capture contract. Never put video bytes or temporary URIs in player progress. */
export type PracticeRecording = {
  uri: string;
  mimeType: string;
  durationMs: number;
  recordedAt: string;
  facing: "front" | "back";
  platform: "ios" | "android" | "web";
};
export type VisionRequest = {
  skillId: string;
  template: string;
  checks: string;
  passRule: string;
  recording: PracticeRecording;
};
export type VisionResult =
  | { status: "unavailable"; message: string }
  | {
      status: "assessed";
      passed: boolean;
      feedback: string[];
      assessmentId: string;
    };
export interface VisionService {
  assess(request: VisionRequest, signal: AbortSignal): Promise<VisionResult>;
}
/** Teammate seam: replace this adapter with upload/inference, retaining cancellation. */
export const visionService: VisionService = {
  async assess(_request, _signal) {
    return {
      status: "unavailable",
      message:
        "Your video is recorded. Technique analysis is not connected yet; no skill has been marked complete.",
    };
  },
};
export const POSITION_COUNTDOWN_SECONDS = 10;
export const RECORDING_LIMIT_SECONDS = 20;
export function countdownRemaining(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
