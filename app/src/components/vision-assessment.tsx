/**
 * Vision results UI.
 *
 * VisionReportView: the grade as real UI (verdict, one row per check with
 *   value / target / pass, coaching tips). Used by the practice recorder.
 * VisionAssessment: optional self-contained version that uploads a videoUri
 *   itself and shows "analyzing", then the report.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Action, Copy, Icon, palette, Panel, ui } from "./hoop-ui";
import {
  analyzeSkill,
  formatMetric,
  formatTarget,
  VisionError,
  type AnalyzeOptions,
  type VisionReport,
} from "@/lib/vision";

export function VisionReportView({ report }: { report: VisionReport }) {
  const color = report.passed ? palette.success : palette.accent;
  const okCount = report.metrics.filter((m) => m.ok).length;
  return (
    <View style={{ gap: 14 }}>
      <View
        accessibilityRole="header"
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: color,
          padding: 18,
          gap: 4,
          backgroundColor: palette.backgroundElement,
        }}
      >
        <View style={ui.row}>
          <Icon name={report.passed ? "trophy" : "target"} color={color} size={26} />
          <Copy kind="title" style={{ color, fontSize: 28, lineHeight: 34 }}>
            {report.passed ? "Passed" : report.graded ? "Keep working" : "Not graded"}
          </Copy>
        </View>
        {report.metrics.length > 0 && (
          <Copy muted>
            {okCount} of {report.metrics.length} checks passed
          </Copy>
        )}
      </View>

      {report.metrics.length > 0 && (
        <Panel style={{ gap: 0, paddingVertical: 6 }}>
          {report.metrics.map((m, i) => (
            <View
              key={m.name}
              accessibilityLabel={`${m.label}: ${formatMetric(m)}, target ${formatTarget(m)}, ${m.ok ? "passed" : "needs work"}`}
              style={[
                ui.row,
                {
                  paddingVertical: 12,
                  borderTopWidth: i ? 1 : 0,
                  borderColor: palette.border,
                },
              ]}
            >
              <Icon
                name={m.ok ? "check" : "close"}
                size={20}
                color={m.ok ? palette.success : palette.accent}
              />
              <View style={{ flex: 1 }}>
                <Copy style={{ fontWeight: "600" }}>{m.label}</Copy>
                <Copy kind="caption" muted>
                  Target {formatTarget(m)}
                </Copy>
              </View>
              <Copy style={{ fontWeight: "700", color: m.ok ? palette.text : palette.accent }}>
                {formatMetric(m)}
              </Copy>
            </View>
          ))}
        </Panel>
      )}

      {report.feedback.length > 0 && (
        <View style={{ gap: 10 }}>
          <Copy kind="eyebrow" style={{ color: palette.accent }}>
            {report.passed ? "COACH SAYS" : "WHAT TO FIX"}
          </Copy>
          {report.feedback.map((tip) => (
            <View key={tip} style={[ui.row, { alignItems: "flex-start" }]}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  marginTop: 9,
                  backgroundColor: palette.accent,
                }}
              />
              <Copy style={{ flex: 1 }}>{tip}</Copy>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

type Props = {
  skillId: string;
  videoUri: string;
  /** mimeType / fileName / hand, passed through to analyzeSkill. */
  options?: Omit<AnalyzeOptions, "signal">;
  /** Shown as a button when the check passed. */
  onPassed?: (report: VisionReport) => void;
  /** Shown as a "Try again" button after a fail or an error. */
  onRetry?: () => void;
};

type Answer =
  | { uri: string; report: VisionReport }
  | { uri: string; error: string };

/** Optional: uploads videoUri itself, then shows VisionReportView. Not used by the recorder. */
export function VisionAssessment({ skillId, videoUri, options, onPassed, onRetry }: Props) {
  // Each answer remembers the video it belongs to; a new uri shows "analyzing" again.
  const [answer, setAnswer] = useState<Answer | null>(null);
  const mimeType = options?.mimeType;
  const fileName = options?.fileName;
  const hand = options?.hand;
  const file = options?.file;

  useEffect(() => {
    const controller = new AbortController();
    analyzeSkill(skillId, videoUri, { mimeType, fileName, hand, file, signal: controller.signal })
      .then((report) => setAnswer({ uri: videoUri, report }))
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setAnswer({ uri: videoUri, error: e instanceof VisionError ? e.message : String(e) });
      });
    return () => controller.abort();
  }, [skillId, videoUri, mimeType, fileName, hand, file]);

  if (!answer || answer.uri !== videoUri)
    return (
      <Panel>
        <View style={ui.row}>
          <ActivityIndicator color={palette.accent} />
          <Copy style={{ fontWeight: "700" }}>Analyzing your shot…</Copy>
        </View>
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

  return (
    <View style={{ gap: 12 }}>
      <VisionReportView report={answer.report} />
      {answer.report.passed && onPassed && (
        <Action label="Continue" icon="check" onPress={() => onPassed(answer.report)} />
      )}
      {!answer.report.passed && onRetry && (
        <Action label="Try again" icon="refresh" onPress={onRetry} />
      )}
    </View>
  );
}
