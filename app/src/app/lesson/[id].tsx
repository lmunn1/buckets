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
import { LessonVisual } from "@/components/lesson-visual";
import { LessonPhotos, licensedPhotos } from "@/components/lesson-photos";
import { LessonVideo } from "@/components/lesson-video";
import { DemoAssessment } from "@/components/demo-assessment";
import { Reveal } from "@/components/motion";
import { ButtonRoot } from "@/components/ui/beui/button";
import { usePlayer } from "@/lib/player-store";
import {
  categoryFor,
  isQuiz,
  lessonSections,
  skillState,
  sourceNodeFor,
} from "@/lib/learning-service";

export default function Lesson() {
  const node = useSkill();
  const router = useRouter();
  const { player, saveStep, busy, error } = usePlayer();
  const [practicing, setPracticing] = useState(false);
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
  const visual = lessonSections(node).find((s) => s.type === "visual")!;
  const quiz = isQuiz(node.id);
  return (
    <LessonShell title="THE LAB / YOUR LESSON">
      <View style={styles.intro}>
        <View style={[ui.row, { justifyContent: "space-between" }]}>
          <View style={ui.row}>
            <Icon name={category.icon} size={18} color={category.color} />
            <Copy kind="eyebrow" style={{ color: category.color }}>
              {category.short.toUpperCase()}
            </Copy>
          </View>
          <Copy kind="caption" muted>
            {source.tierName} · Lv. {source.tier}
          </Copy>
        </View>
        <Copy kind="display" style={{ fontSize: 34, lineHeight: 39 }}>
          {node.name}
        </Copy>
        <View style={[ui.row, { gap: 6 }]}>
          {["Read", "See", "Watch", "Practice"].map((label, i) => (
            <View key={label} style={styles.format}>
              <Copy
                kind="caption"
                style={{
                  color: i === 3 ? palette.accent : palette.textSecondary,
                }}
              >
                {String(i + 1).padStart(2, "0")} {label}
              </Copy>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.rail}>
        <LessonLabel index="01" title="Understand it" icon="book" />
        <Copy style={{ marginBottom: 24 }}>{source.lesson.text.why}</Copy>
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
        <View style={styles.cueBox}>
          <Copy kind="eyebrow" style={{ color: palette.accent }}>
            KEEP THESE WITH YOU
          </Copy>
          {source.lesson.text.cues.map((cue) => (
            <View key={cue} style={ui.row}>
              <Icon name="check" size={16} color={palette.accent} />
              <Copy style={{ flex: 1, fontWeight: "500" }}>{cue}</Copy>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          aria-expanded={mistakesOpen}
          accessibilityState={{ expanded: mistakesOpen }}
          onPress={() => setMistakesOpen((v) => !v)}
          style={styles.disclosure}
        >
          <View style={ui.row}>
            <Icon name="shield" size={18} color={palette.textSecondary} />
            <Copy kind="caption">Common mistakes</Copy>
          </View>
          <Icon name={mistakesOpen ? "minus" : "plus"} size={18} />
        </Pressable>
        {mistakesOpen && (
          <Reveal style={{ gap: 12, paddingTop: 16 }}>
            {source.lesson.text.commonMistakes.map((m) => (
              <Copy key={m} kind="caption" muted>
                • {m}
              </Copy>
            ))}
          </Reveal>
        )}
      </View>
      <View style={styles.rail}>
        <LessonLabel index="02" title="See the technique" icon="target" />
        {licensedPhotos(node.id).length ? (
          <>
            <LessonPhotos id={node.id} />
            <Copy style={{ marginTop: 16 }}>
              {source.lesson.visuals.caption}
            </Copy>
          </>
        ) : (
          <LessonVisual node={node} section={visual} />
        )}
      </View>
      <View style={styles.rail}>
        <LessonLabel index="03" title="Watch it flow" icon="play" />
        <LessonVideo key={node.id} id={node.id} />
      </View>
      <View style={[styles.rail, { borderBottomWidth: 0 }]}>
        <LessonLabel
          index="04"
          title="Your turn"
          icon={quiz ? "brain" : "ball"}
        />
        <View style={styles.practice}>
          <View style={ui.row}>
            <Icon name={quiz ? "brain" : "target"} color={palette.accent} />
            <Copy kind="eyebrow" style={{ color: palette.accent }}>
              {quiz ? "KNOWLEDGE CHECK" : "COURT WORK"}
            </Copy>
          </View>
          <Copy kind="heading">
            {quiz ? "Quiz coming soon" : "Put the idea into motion."}
          </Copy>
          {!quiz && <Copy>{source.lesson.practice.drill}</Copy>}
        </View>
        {quiz ? (
          <Copy muted style={{ marginTop: 16 }}>
            The quiz is intentionally blank for now. You can explore the lesson;
            completion will be available when questions are added.
          </Copy>
        ) : practicing ? (
          <Reveal style={{ marginTop: 20 }}>
            <DemoAssessment node={node} />
          </Reveal>
        ) : (
          <View style={{ gap: 12, marginTop: 20 }}>
            <ErrorNotice message={error} />
            <Action
              label="Start practice"
              icon="play"
              busy={busy}
              onPress={() => {
                void saveStep(node.id, 3).then((ok) => {
                  if (ok) setPracticing(true);
                });
              }}
            />
            <Copy kind="caption" muted>
              Camera assessment preview · no camera analysis yet
            </Copy>
          </View>
        )}
      </View>
      <ButtonRoot
        onPress={() => router.dismissTo("/(main)/tree")}
        accessibilityLabel="Back to skill tree"
        style={[
          ui.row,
          { justifyContent: "center", minHeight: 52, marginTop: 8 },
        ]}
      >
        <Icon name="tree" color={palette.accent} size={18} />
        <Copy style={{ color: palette.accent, fontWeight: "600" }}>
          Back to skill tree
        </Copy>
      </ButtonRoot>
    </LessonShell>
  );
}
function LessonLabel({
  index,
  title,
  icon,
}: {
  index: string;
  title: string;
  icon: "book" | "target" | "play" | "ball" | "brain";
}) {
  return (
    <View style={[ui.row, { marginBottom: 20 }]}>
      <Copy kind="eyebrow" style={{ color: palette.accent }}>
        {index}
      </Copy>
      <View style={{ height: 1, width: 24, backgroundColor: palette.border }} />
      <Copy kind="heading" style={{ flex: 1 }}>
        {title}
      </Copy>
      <Icon name={icon} size={20} color={palette.textSecondary} />
    </View>
  );
}
const styles = StyleSheet.create({
  intro: { gap: 20, paddingBottom: 28 },
  format: {
    flex: 1,
    borderBottomWidth: 2,
    borderColor: palette.border,
    paddingBottom: 12,
  },
  rail: { paddingVertical: 28, borderTopWidth: 1, borderColor: palette.border },
  number: {
    width: 28,
    height: 28,
    backgroundColor: palette.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  cueBox: {
    gap: 12,
    borderLeftWidth: 2,
    borderColor: palette.accent,
    paddingLeft: 16,
    marginVertical: 28,
  },
  disclosure: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    backgroundColor: palette.backgroundElement,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  practice: {
    gap: 16,
    backgroundColor: palette.backgroundElement,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
  },
});
