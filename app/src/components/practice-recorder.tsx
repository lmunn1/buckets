import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect, useIsFocused, useRouter } from "expo-router";
import { Action, Copy, ErrorNotice, Icon, palette, ui } from "./hoop-ui";
import { CaptureSurface } from "./capture-surface";
import { RecordingReview } from "./recording-review";
import { VisionReportView } from "./vision-assessment";
import { Spacing } from "@/constants/theme";
import { replayUri, VisionError, type VisionReport } from "@/lib/vision";
import type { CaptureHandle } from "./capture-types";
import {
  countdownRemaining,
  POSITION_COUNTDOWN_SECONDS,
  RECORDING_LIMIT_SECONDS,
  visionService,
  type PracticeRecording,
  type VisionService,
} from "@/lib/vision-service";
import { sourceNodeFor, type SkillNode } from "@/lib/learning-service";

type Phase = "prepare" | "countdown" | "recording" | "review";
function release(clip: PracticeRecording | null) {
  if (clip?.platform === "web") URL.revokeObjectURL(clip.uri);
}
export function PracticeRecorder({
  node,
  service = visionService,
}: {
  node: SkillNode;
  service?: VisionService;
}) {
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(
    AppState.currentState !== "background" &&
      AppState.currentState !== "inactive",
  );
  const camera = useRef<CaptureHandle>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("prepare");
  const phaseRef = useRef<Phase>("prepare");
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [remaining, setRemaining] = useState(POSITION_COUNTDOWN_SECONDS);
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<PracticeRecording | null>(null);
  const clipRef = useRef<PracticeRecording | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [assessed, setAssessed] = useState(false);
  // Vision server result: shown as UI, and its annotated replay replaces the clip.
  const [report, setReport] = useState<VisionReport | null>(null);
  const [replayFailed, setReplayFailed] = useState(false);
  const onReplayError = useCallback(() => setReplayFailed(true), []);
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const session = useRef(0);
  const clock = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const abort = useRef<AbortController | null>(null);
  const transition = (value: Phase) => {
    phaseRef.current = value;
    setPhase(value);
  };
  const onReady = useCallback((value: boolean) => setReady(value), []);
  const cancel = useCallback(() => {
    session.current++;
    clearInterval(clock.current);
    abort.current?.abort();
    camera.current?.stop();
    phaseRef.current = "prepare";
    setPhase("prepare");
    setAnalyzing(false);
  }, []);
  const onError = useCallback(
    (value: string) => {
      cancel();
      setError(value);
      setReady(false);
    },
    [cancel],
  );
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
      if (state !== "active") {
        setReady(false);
        if (
          phaseRef.current === "countdown" ||
          phaseRef.current === "recording"
        )
          cancel();
      }
    });
    return () => {
      listener.remove();
      cancel();
      release(clipRef.current);
    };
  }, [cancel]);
  useFocusEffect(useCallback(() => () => cancel(), [cancel]));
  // Browser tab backgrounding must not finish a delayed countdown unexpectedly.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const hide = () => {
      setAppActive(!document.hidden);
      if (document.hidden) {
        setReady(false);
        if (
          phaseRef.current === "countdown" ||
          phaseRef.current === "recording"
        )
          cancel();
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [cancel]);
  const startRecording = async (token: number) => {
    if (session.current !== token || !camera.current) return;
    transition("recording");
    setElapsed(0);
    const started = Date.now();
    clock.current = setInterval(
      () =>
        setElapsed(
          Math.min(
            RECORDING_LIMIT_SECONDS,
            Math.floor((Date.now() - started) / 1000),
          ),
        ),
      200,
    );
    try {
      const recording = await camera.current.record();
      if (session.current !== token) {
        release(recording);
        return;
      }
      clearInterval(clock.current);
      clipRef.current = recording;
      setClip(recording);
      transition("review");
    } catch (e) {
      if (session.current !== token) return;
      clearInterval(clock.current);
      transition("prepare");
      setError(
        e instanceof Error
          ? e.message
          : "The video could not be recorded. Please try again.",
      );
    }
  };
  const start = () => {
    if (!ready || phaseRef.current !== "prepare") return;
    const token = ++session.current;
    setError(null);
    setMessage(null);
    setRemaining(POSITION_COUNTDOWN_SECONDS);
    transition("countdown");
    const deadline = Date.now() + POSITION_COUNTDOWN_SECONDS * 1000;
    clock.current = setInterval(() => {
      const seconds = countdownRemaining(deadline, Date.now());
      setRemaining(seconds);
      if (seconds === 0) {
        clearInterval(clock.current);
        void startRecording(token);
      }
    }, 100);
  };
  const retake = () => {
    cancel();
    release(clipRef.current);
    clipRef.current = null;
    setClip(null);
    setMessage(null);
    setError(null);
    setReady(false);
    setAssessed(false);
    setReport(null);
    setReplayFailed(false);
  };
  const assess = async () => {
    if (!clip || analyzing) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setAnalyzing(true);
    setError(null);
    const cv = sourceNodeFor(node.id)!.lesson.practice.cvActivity;
    try {
      const result = await service.assess(
        {
          skillId: node.id,
          template: cv.template,
          checks: cv.checks,
          passRule: cv.passRule,
          recording: clip,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setAssessed(result.status === "assessed");
        setReport(result.status === "assessed" ? (result.report ?? null) : null);
        setReplayFailed(false);
        setMessage(
          result.status === "unavailable"
            ? result.message
            : result.feedback.join("\n"),
        );
      }
      // Persist verified completion only after the teammate's result validation is connected.
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof VisionError
            ? `${e.message} Your recording is still here; try again.`
            : "Analysis could not finish. Your recording is still here; try again.",
        );
    } finally {
      if (!controller.signal.aborted) setAnalyzing(false);
    }
  };
  const reviewing = phase === "review" && !!clip;
  const replay = report ? replayUri(report) : null;
  const showingReplay = !!replay && !replayFailed;
  return (
    <View style={{ gap: 16 }}>
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <View style={ui.row}>
          <Icon name="camera" color={palette.accent} />
          <Copy kind="heading">
            {phase === "review" ? "Your practice, captured." : "Your turn."}
          </Copy>
        </View>
        <Copy kind="caption" muted>
          {RECORDING_LIMIT_SECONDS}s clip
        </Copy>
      </View>
      <Copy muted>
        {phase === "review"
          ? showingReplay
            ? "Your annotated replay: green checks passed, red ones need work."
            : "Replay your attempt or record another. Technique analysis will connect here."
          : "Prop your phone up so your whole body and the ball are in frame. Press Start, then take 10 seconds to get into position."}
      </Copy>
      <View
        style={
          reviewing
            ? {
                // Review takes over the screen: edge to edge, most of the height.
                height: Math.max(350, Math.round(screenHeight * 0.7)),
                marginHorizontal: -Spacing.four,
                overflow: "hidden",
                backgroundColor: "#08090B",
              }
            : {
                height: 350,
                borderRadius: 20,
                overflow: "hidden",
                backgroundColor: palette.backgroundElement,
                borderWidth: 1,
                borderColor:
                  phase === "recording" ? palette.accent : palette.border,
              }
        }
      >
        {reviewing ? (
          replay && !replayFailed ? (
            <RecordingReview
              key={replay}
              uri={replay}
              autoPlay
              loop
              onError={onReplayError}
              label="Annotated replay of your practice"
            />
          ) : (
            <RecordingReview key={clip.uri} uri={clip.uri} />
          )
        ) : (
          focused &&
          appActive && (
            <CaptureSurface
              key={facing}
              ref={camera}
              facing={facing}
              onReady={onReady}
              onError={onError}
            />
          )
        )}
        {reviewing && analyzing && (
          <View
            pointerEvents="none"
            accessibilityLiveRegion="polite"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#000B",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              padding: 24,
            }}
          >
            <ActivityIndicator size="large" color={palette.accent} />
            <Copy kind="heading">Analyzing your shot…</Copy>
            <Copy muted style={{ textAlign: "center" }}>
              Checking your form and building your replay. About 10 seconds.
            </Copy>
          </View>
        )}
        {showingReplay && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor: "#000B",
            }}
          >
            <Copy kind="eyebrow" style={{ color: palette.accent }}>
              REPLAY
            </Copy>
          </View>
        )}
        {phase === "countdown" && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#0009",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <Copy kind="eyebrow">GET INTO POSITION</Copy>
            <Copy
              testID="position-countdown"
              accessibilityLiveRegion="polite"
              style={{
                fontSize: 88,
                lineHeight: 100,
                fontWeight: "700",
                color: palette.accent,
              }}
            >
              {remaining}
            </Copy>
            <Copy>Recording starts automatically</Copy>
          </View>
        )}
        {phase === "recording" && (
          <View
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              padding: 10,
              borderRadius: 10,
              backgroundColor: "#000B",
            }}
          >
            <Copy
              accessibilityLiveRegion="polite"
              style={{ color: palette.accent, fontWeight: "700" }}
            >
              ● REC {elapsed}s / {RECORDING_LIMIT_SECONDS}s
            </Copy>
          </View>
        )}
      </View>
      <ErrorNotice message={error} />
      {report && replay && replayFailed && (
        <Copy kind="caption" muted>
          The annotated replay could not load, so this is your original clip.
          Your grade below is unaffected.
        </Copy>
      )}
      {report && <VisionReportView report={report} />}
      {phase === "prepare" && (
        <>
          <Action
            label="Start"
            icon="camera"
            disabled={!ready}
            onPress={start}
          />
          <Action
            label="Flip camera"
            icon="flip"
            variant="secondary"
            disabled={!ready}
            onPress={() => {
              setReady(false);
              setFacing(facing === "back" ? "front" : "back");
              setError(null);
            }}
          />
        </>
      )}
      {phase === "countdown" && (
        <Action label="Cancel countdown" variant="secondary" onPress={cancel} />
      )}
      {phase === "recording" && (
        <>
          <Action
            label="Finish recording"
            onPress={() => camera.current?.stop()}
          />
          <Action label="Discard recording" variant="quiet" onPress={cancel} />
        </>
      )}
      {phase === "review" && report && (
        <>
          {report.passed && (
            <Action label="Continue" icon="check" onPress={() => router.back()} />
          )}
          <Action
            label="Try again"
            icon="refresh"
            variant={report.passed ? "secondary" : "primary"}
            onPress={retake}
          />
        </>
      )}
      {phase === "review" && !report && (
        <>
          <Action
            label={
              message
                ? assessed
                  ? "Feedback received"
                  : "Analysis not connected"
                : "Check my technique"
            }
            disabled={!!message}
            busy={analyzing}
            onPress={() => void assess()}
          />
          <Action
            label="Record again"
            icon="refresh"
            variant="secondary"
            disabled={analyzing}
            onPress={retake}
          />
          <Copy kind="caption" muted>
            {clip ? Math.round(clip.durationMs / 1000) : 0}s recorded · Local
            video · No audio
          </Copy>
        </>
      )}
      {message && !report && (
        <View style={[ui.panel, { padding: 18 }]}>
          <Copy>{message}</Copy>
        </View>
      )}
      <Copy kind="caption" muted>
        {service === visionService
          ? "Recording does not unlock skills. Video is temporary and is not uploaded. Vision assessment will be added by the team."
          : "Recording does not unlock skills. Check my technique uploads this clip to the Buckets vision server for grading; it is not saved to your progress."}
      </Copy>
    </View>
  );
}
