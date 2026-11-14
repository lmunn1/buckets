import { useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Action, Copy, ErrorNotice, Icon, palette, Panel, Tag, ui } from "./hoop-ui";
import { DemoAssessment } from "./demo-assessment";
import type { SkillNode } from "@/lib/learning-service";
import { usePlayer } from "@/lib/player-store";
import {
  analyzeSkill,
  formatMetric,
  useGradableSkill,
  VisionError,
  type GradableSkill,
  type VideoFile,
  type VisionResult,
} from "@/lib/vision";

const MAX_CLIP_S = 15;

/**
 * Practice block for a lesson: the camera check when the vision server can
 * grade this skill, otherwise the existing labeled demo completion.
 */
export function PracticeAssessment({ node }: { node: SkillNode }) {
  const [attempt, setAttempt] = useState(0);
  const gradable = useGradableSkill(node.id, attempt);
  if (gradable.status === "loading")
    return (
      <View style={[ui.row, { minHeight: 56 }]}>
        <ActivityIndicator color={palette.accent} />
        <Copy muted>Checking for a camera test…</Copy>
      </View>
    );
  if (gradable.status === "gradable")
    return <VisionAssessment node={node} skill={gradable.skill} />;
  return (
    <View style={{ gap: 12 }}>
      {gradable.status === "unavailable" && (
        <Panel>
          <Copy style={{ fontWeight: "700" }}>Camera check unavailable</Copy>
          <Copy muted>{gradable.error.message}</Copy>
          <Action
            label="Try again"
            icon="refresh"
            variant="secondary"
            onPress={() => setAttempt((n) => n + 1)}
          />
        </Panel>
      )}
      <DemoAssessment node={node} />
    </View>
  );
}

type Phase =
  | { kind: "idle" }
  | { kind: "analyzing"; startedAt: number }
  | { kind: "result"; result: VisionResult; seconds: number }
  | { kind: "error"; message: string };

function VisionAssessment({ node, skill }: { node: SkillNode; skill: GradableSkill }) {
  const router = useRouter();
  const { completeVision, busy, error } = usePlayer();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const run = useRef(0);

  async function pick(source: "camera" | "library") {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["videos"],
      videoMaxDuration: MAX_CLIP_S,
      // iOS: record and export at 720p so uploads and analysis stay fast.
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.IFrame1280x720,
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
    };
    try {
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setPhase({
            kind: "error",
            message: "Camera access is off. Turn it on in Settings, or choose a video instead.",
          });
          return;
        }
      } else {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      const picked =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0];
      if (asset.duration && asset.duration > (MAX_CLIP_S + 1) * 1000) {
        setPhase({
          kind: "error",
          message: `That clip is ${Math.round(asset.duration / 1000)} s long. Pick one under ${MAX_CLIP_S} s with just the rep.`,
        });
        return;
      }
      await analyze(asset);
    } catch (e) {
      setPhase({ kind: "error", message: `Couldn't open the ${source}: ${String(e)}` });
    }
  }

  async function analyze(video: VideoFile) {
    const id = ++run.current;
    const startedAt = Date.now();
    setPhase({ kind: "analyzing", startedAt });
    try {
      const result = await analyzeSkill(node.id, video);
      if (id !== run.current) return; // cancelled
      setPhase({ kind: "result", result, seconds: (Date.now() - startedAt) / 1000 });
    } catch (e) {
      if (id !== run.current) return;
      const message =
        e instanceof VisionError
          ? e.kind === "offline"
            ? "Can't reach the vision server. Check that it's running and on the same Wi-Fi."
            : e.message
          : String(e);
      setPhase({ kind: "error", message });
    }
  }

  const reset = () => {
    run.current++;
    setPhase({ kind: "idle" });
  };

  if (phase.kind === "analyzing")
    return (
      <Panel>
        <View style={ui.row}>
          <ActivityIndicator color={palette.accent} />
          <Copy style={{ fontWeight: "700" }}>Analyzing your rep…</Copy>
        </View>
        <Copy muted>Uploading and checking your form. This usually takes 5–20 seconds.</Copy>
        <Action label="Cancel" icon="close" variant="quiet" onPress={reset} />
      </Panel>
    );

  if (phase.kind === "result") {
    const { result } = phase;
    return (
      <View style={{ gap: 12 }}>
        <Panel>
          <Tag color={result.passed ? palette.success : palette.accent}>
            {result.passed ? "PASSED" : result.graded ? "KEEP WORKING" : "NOT GRADED"}
          </Tag>
          {result.metrics.map((m) => (
            <View key={m.name} style={[ui.row, { alignItems: "flex-start" }]}>
              <Icon
                name={m.ok ? "check" : "close"}
                size={18}
                color={m.ok ? palette.success : palette.accent}
              />
              <Copy style={{ flex: 1 }}>{m.label}</Copy>
              <Copy kind="caption" muted>
                {formatMetric(m)}
              </Copy>
            </View>
          ))}
          {result.feedback.map((f) => (
            <Copy key={f} muted>
              {f}
            </Copy>
          ))}
          <Copy kind="caption" muted>
            Analyzed in {phase.seconds.toFixed(1)} s
          </Copy>
        </Panel>
        <ErrorNotice message={error} />
        {result.passed ? (
          <Action
            label="Complete skill"
            icon="check"
            busy={busy}
            onPress={() => {
              void completeVision(node.id, {
                attemptId: result.attempt_id,
                spec: result.spec ?? "",
                completedAt: result.analyzed_at,
              }).then((ok) => {
                if (ok)
                  router.replace({ pathname: "/complete/[id]", params: { id: node.id } });
              });
            }}
          />
        ) : (
          <Action label="Try again" icon="refresh" onPress={reset} />
        )}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Panel>
        <View style={ui.row}>
          <Icon name="target" color={palette.accent} />
          <Copy style={{ fontWeight: "700" }}>Camera check</Copy>
        </View>
        {skill.setup?.camera_tip && <Copy>{skill.setup.camera_tip}</Copy>}
        {skill.setup?.stand && (
          <Copy kind="caption" muted>
            Where: {skill.setup.stand}
          </Copy>
        )}
        {skill.criteria && (
          <Copy kind="caption" muted>
            What we check: {skill.criteria}
          </Copy>
        )}
      </Panel>
      {phase.kind === "error" && <ErrorNotice message={phase.message} />}
      <Action label="Record a rep" icon="play" onPress={() => void pick("camera")} />
      <Action
        label="Choose a video"
        icon="list"
        variant="secondary"
        onPress={() => void pick("library")}
      />
      <Copy kind="caption" muted>
        One rep, {MAX_CLIP_S} seconds max. Your video is sent to the Buckets vision server for
        grading and deleted after.
      </Copy>
    </View>
  );
}
