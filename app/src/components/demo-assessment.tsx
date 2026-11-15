import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Action, Copy, ErrorNotice, Icon, palette, Panel, ui } from "./hoop-ui";
import type { SkillNode } from "@/lib/learning-service";
import { usePlayer } from "@/lib/player-store";

/** Replace this component with the vision adapter once supported capabilities are agreed. */
export function DemoAssessment({ node }: { node: SkillNode }) {
  const router = useRouter();
  const { completeDemo, busy, error } = usePlayer();
  const [consent, setConsent] = useState(false);
  const [retry, setRetry] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      <Panel>
        <View style={ui.row}>
          <Icon name="shield" color={palette.accent} />
          <Copy style={{ fontWeight: "700" }}>Demo assessment</Copy>
        </View>
        <Copy muted>
          No camera is recording. This preview simulates completion to show how
          skills unlock; it does not assess your performance.
        </Copy>
      </Panel>
      {retry && (
        <Panel>
          <Copy kind="heading">Try the movement again.</Copy>
          <Copy muted>
            Simulated retry state. Review the cues above and take another rep
            when you feel ready. No video was analyzed.
          </Copy>
          <Action
            label="Try demo again"
            variant="secondary"
            onPress={() => setRetry(false)}
          />
        </Panel>
      )}
      {!retry && (
        <>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="I understand this is simulated completion"
            accessibilityState={{ checked: consent }}
            disabled={busy}
            onPress={() => setConsent(!consent)}
            style={[
              ui.row,
              { minHeight: 56, paddingVertical: 12, alignItems: "flex-start" },
            ]}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: consent ? palette.accent : palette.textSecondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {consent && (
                <Icon name="check" color={palette.accent} size={18} />
              )}
            </View>
            <Copy kind="caption" style={{ flex: 1 }}>
              I understand this marks this skill complete, without verifying
              basketball mastery.
            </Copy>
          </Pressable>
          <ErrorNotice message={error} />
          <Action
            label="Simulate skill completion"
            icon="check"
            disabled={!consent}
            busy={busy}
            onPress={() => {
              void completeDemo(node.id).then((ok) => {
                if (!ok) return;
                // Same as the camera check: leave the lesson flow behind.
                if (router.canDismiss()) router.dismissAll();
                router.push({
                  pathname: "/complete/[id]",
                  params: { id: node.id },
                });
              });
            }}
          />
          <Action
            label="Preview a retry"
            variant="quiet"
            onPress={() => setRetry(true)}
          />
        </>
      )}
    </View>
  );
}
