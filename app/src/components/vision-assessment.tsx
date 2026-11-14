/**
 * Optional ready-made UI for a vision check. Not used anywhere yet.
 *
 * Give it a skill id and a recorded video uri; it uploads the clip, shows
 * "analyzing", then the per-check results and coaching feedback. Recording,
 * saving progress and navigation stay with the caller (see
 * docs/app-vision-integration.md).
 *
 *   <VisionAssessment
 *     skillId={node.id}
 *     videoUri={uri}
 *     onPassed={(result) => saveVisionCompletion(node.id, result)}
 *     onRetry={() => setUri(null)}
 *   />
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Action, Copy, Icon, palette, Panel, Tag, ui } from "./hoop-ui";
import {
  analyzeSkill,
  formatMetric,
  VisionError,
  type AnalyzeOptions,
  type VisionResult,
} from "@/lib/vision";

type Props = {
  skillId: string;
  videoUri: string;
  /** mimeType / fileName / hand, passed through to analyzeSkill. */
  options?: AnalyzeOptions;
  /** Shown as a button when the check passed. Save the completion here. */
  onPassed?: (result: VisionResult) => void;
  /** Shown as a "Try again" button after a fail or an error. */
  onRetry?: () => void;
};

type Answer =
  | { uri: string; result: VisionResult; seconds: number }
  | { uri: string; error: string };

export function VisionAssessment({ skillId, videoUri, options, onPassed, onRetry }: Props) {
  // Each answer remembers the video it belongs to; a new uri shows "analyzing" again.
  const [answer, setAnswer] = useState<Answer | null>(null);
  const mimeType = options?.mimeType;
  const fileName = options?.fileName;
  const hand = options?.hand;
  const file = options?.file;

  useEffect(() => {
    let active = true;
    const startedAt = Date.now();
    analyzeSkill(skillId, videoUri, { mimeType, fileName, hand, file })
      .then((result) => {
        if (active)
          setAnswer({ uri: videoUri, result, seconds: (Date.now() - startedAt) / 1000 });
      })
      .catch((e: unknown) => {
        if (!active) return;
        const error =
          e instanceof VisionError && e.kind === "offline"
            ? "Can't reach the vision server. Check that it's running and on the same Wi-Fi."
            : e instanceof Error
              ? e.message
              : String(e);
        setAnswer({ uri: videoUri, error });
      });
    return () => {
      active = false;
    };
  }, [skillId, videoUri, mimeType, fileName, hand, file]);

  if (!answer || answer.uri !== videoUri)
    return (
      <Panel>
        <View style={ui.row}>
          <ActivityIndicator color={palette.accent} />
          <Copy style={{ fontWeight: "700" }}>Analyzing your rep…</Copy>
        </View>
        <Copy muted>Uploading and checking your form. This usually takes 5–20 seconds.</Copy>
      </Panel>
    );

  if ("error" in answer)
    return (
      <View style={{ gap: 12 }}>
        <Panel style={{ borderColor: palette.accent }}>
          <Copy style={{ fontWeight: "700" }}>{"Couldn't check this video"}</Copy>
          <Copy muted>{answer.error}</Copy>
        </Panel>
        {onRetry && <Action label="Try again" icon="refresh" onPress={onRetry} />}
      </View>
    );

  const { result, seconds } = answer;
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
          Analyzed in {seconds.toFixed(1)} s
        </Copy>
      </Panel>
      {result.passed && onPassed && (
        <Action label="Complete skill" icon="check" onPress={() => onPassed(result)} />
      )}
      {!result.passed && onRetry && (
        <Action label="Try again" icon="refresh" onPress={onRetry} />
      )}
    </View>
  );
}
