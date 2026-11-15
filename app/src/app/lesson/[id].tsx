import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import {
  Action,
  Copy,
  ErrorNotice,
  Icon,
  palette,
  ui,
} from "@/components/hoop-ui";
import { LessonShell, MissingSkill, useSkill } from "@/components/lesson-shell";
import { LessonVideo } from "@/components/lesson-video";
import { BucketsCoach } from "@/components/buckets-coach";
import { Reveal } from "@/components/motion";
import { usePlayer } from "@/lib/player-store";
import {
  categoryFor,
  isQuiz,
  skillState,
  sourceNodeFor,
} from "@/lib/learning-service";

export default function Lesson() {
  const node = useSkill();
  const router = useRouter();
  const { player, saveStep, busy, error } = usePlayer();
  // Always open on the first part, so the lesson starts with content showing.
  const [part, setPart] = useState(0);
  const [mistakesOpen, setMistakesOpen] = useState(false);
  if (!node) return <MissingSkill />;
  if (skillState(node, player.progress) === "locked")
    return (
      <LessonShell title="PREREQUISITES">
        <Copy kind="title">Build the foundations first.</Copy>
        <View style={{ marginTop: 24 }}>
          <Action
            label="See prerequisites"
            onPress={() =>
              router.replace({
                pathname: "/skill/[id]",
                params: { id: node.id },
              })
            }
          />
        </View>
      </LessonShell>
    );
  const source = sourceNodeFor(node.id)!;
  const category = categoryFor(node.category);
  const quiz = isQuiz(node.id);
  const parts = ["Understand it", "See the technique", "Your turn"];
  const go = async (value: number) => {
    if (await saveStep(node.id, value)) {
      setPart(value);
      setMistakesOpen(false);
    }
  };
  return (
    // Buckets sits outside the keyed shell so his chat survives switching parts.
    <View style={{ flex: 1 }}>
      <LessonShell key={part} title="YOUR LESSON" reserveBottom>
        <View style={{ gap: 14, marginBottom: 24 }}>
          <View style={[ui.row, { justifyContent: "space-between" }]}>
            <View style={ui.row}>
              <Icon name={category.icon} size={18} color={category.color} />
              <Copy kind="eyebrow" style={{ color: category.color }}>
                {category.short.toUpperCase()}
              </Copy>
            </View>
            <Copy kind="caption" muted>
              {source.tierName}
            </Copy>
          </View>
          <Copy kind="title">{node.name}</Copy>
          <View
            accessibilityRole="tablist"
            style={{ flexDirection: "row", gap: 8 }}
          >
            {parts.map((label, i) => (
              <Pressable
                key={label}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: part === i }}
                onPress={() => void go(i)}
                style={{
                  flex: 1,
                  minHeight: 62,
                  gap: 4,
                  paddingVertical: 8,
                  borderBottomWidth: 3,
                  borderColor: part === i ? palette.accent : palette.border,
                }}
              >
                <Copy
                  kind="eyebrow"
                  style={{
                    color: part === i ? palette.accent : palette.textSecondary,
                  }}
                >
                  0{i + 1}
                </Copy>
                <Copy
                  kind="caption"
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: part === i ? palette.text : palette.textSecondary,
                  }}
                >
                  {label}
                </Copy>
              </Pressable>
            ))}
          </View>
        </View>
        <Reveal key={part} style={{ gap: 20 }}>
          <Copy kind="heading">{parts[part]}</Copy>
          {part === 0 && (
            <>
              <Copy>{source.lesson.text.why}</Copy>
              <View style={{ gap: 20 }}>
                {source.lesson.text.steps.map((step, i) => (
                  <View key={i} style={[ui.row, { alignItems: "flex-start" }]}>
                    <View style={styles.number}>
                      <Copy kind="caption" style={{ color: palette.accent }}>
                        {i + 1}
                      </Copy>
                    </View>
                    <Copy style={{ flex: 1 }}>{step}</Copy>
                  </View>
                ))}
              </View>
              <View
                style={{
                  gap: 12,
                  borderLeftWidth: 2,
                  borderColor: palette.accent,
                  paddingLeft: 16,
                  marginVertical: 8,
                }}
              >
                <Copy kind="eyebrow" style={{ color: palette.accent }}>
                  KEEP THESE WITH YOU
                </Copy>
                {source.lesson.text.cues.map((cue) => (
                  <View key={cue} style={ui.row}>
                    <Icon name="check" size={16} color={palette.accent} />
                    <Copy style={{ flex: 1 }}>{cue}</Copy>
                  </View>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                aria-expanded={mistakesOpen}
                accessibilityState={{ expanded: mistakesOpen }}
                onPress={() => setMistakesOpen((v) => !v)}
                style={[
                  ui.secondary,
                  ui.row,
                  {
                    minHeight: 52,
                    borderRadius: 12,
                    padding: 14,
                    justifyContent: "space-between",
                  },
                ]}
              >
                <Copy kind="caption">Common mistakes</Copy>
                <Icon name={mistakesOpen ? "minus" : "plus"} size={18} />
              </Pressable>
              {mistakesOpen &&
                source.lesson.text.commonMistakes.map((m) => (
                  <Copy key={m} kind="caption" muted>
                    • {m}
                  </Copy>
                ))}
            </>
          )}
          {part === 1 && (
            <>
              <Copy muted>
                Watch the demonstration. Notice the setup, the movement, and the
                finish.
              </Copy>
              <LessonVideo id={node.id} eager />
              <View style={{ gap: 12 }}>
                {source.lesson.text.cues.map((cue) => (
                  <View key={cue} style={ui.row}>
                    <Icon name="target" size={16} color={category.color} />
                    <Copy kind="caption" style={{ flex: 1 }}>
                      {cue}
                    </Copy>
                  </View>
                ))}
              </View>
            </>
          )}
          {part === 2 && (
            <View style={[ui.panel, { padding: 22, gap: 16 }]}>
              <Icon
                name={quiz ? "brain" : "camera"}
                color={palette.accent}
                size={28}
              />
              <Copy kind="heading">
                {quiz ? "Quiz coming soon" : "Put it into practice."}
              </Copy>
              <Copy muted>
                {quiz
                  ? "The quiz is intentionally blank for now. Completion becomes available when questions are added."
                  : source.lesson.practice.drill}
              </Copy>
              {!quiz && (
                <Copy kind="caption" muted>
                  Press Start when the camera is ready. You will have 10 seconds
                  to get into position, then an 8-second video records
                  automatically. Take ONE shot, then hold still until it stops.
                </Copy>
              )}
            </View>
          )}
        </Reveal>
        <View style={{ marginTop: "auto", paddingTop: 28, gap: 12 }}>
          <ErrorNotice message={error} />
          {part < 2 ? (
            <Action
              label={part === 0 ? "See the technique" : "Try it yourself"}
              icon={part === 0 ? "play" : "arrow"}
              busy={busy}
              onPress={() => void go(part + 1)}
            />
          ) : (
            !quiz && (
              <Action
                label="Open practice camera"
                icon="camera"
                onPress={() =>
                  router.push({
                    pathname: "/practice/[id]",
                    params: { id: node.id },
                  })
                }
              />
            )
          )}
          {part > 0 && (
            <Action
              label={part === 1 ? "Back to explanation" : "Watch again"}
              variant="quiet"
              onPress={() => void go(part - 1)}
            />
          )}
        </View>
      </LessonShell>
      <BucketsCoach key={source.id} skill={source} />
    </View>
  );
}
const styles = StyleSheet.create({
  number: {
    width: 28,
    height: 28,
    backgroundColor: palette.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
});
